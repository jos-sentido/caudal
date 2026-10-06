import {
  signInWithPopup, signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  doc, setDoc, deleteDoc, collection, getDocs, onSnapshot, writeBatch,
} from 'firebase/firestore'
import { auth, db, googleProvider, firebaseEnabled } from '../lib/firebase'
import { cloud, type Collname } from './cloudBridge'
import { useStore } from './useStore'
import type { SpaceRef } from '../lib/types'

const COLLECTIONS: Collname[] = ['accounts', 'cards', 'categories', 'transactions', 'recurrings', 'budgets', 'reminders']

const ACTIVE_KEY = 'caudal-active-space'

let unsubs: (() => void)[] = [] // listeners del espacio activo (datos)
let spacesUnsub: (() => void) | null = null // listener del índice de espacios (siempre personal)
let currentUid = ''
let suppress = false // evita que las actualizaciones remotas re-escriban al servidor
let prev: Record<string, Map<string, string>> = {}
let prevSettings = ''

export function loadActiveSpace(): string {
  try { return localStorage.getItem(ACTIVE_KEY) || '' } catch { return '' }
}
function saveActiveSpace(id: string) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch { /* ignore */ }
}

/** Ruta raíz de Firestore según el espacio: '' = personal (users/{uid}), si no spaces/{id}. */
function rootFor(uid: string, spaceId: string): string {
  return spaceId ? `spaces/${spaceId}` : `users/${uid}`
}

export function signInGoogle() {
  if (!auth) return Promise.reject(new Error('Firebase no configurado'))
  return signInWithPopup(auth, googleProvider)
}

export function signOutUser() {
  if (!auth) return Promise.resolve()
  stopSpacesListener()
  stopSync()
  return signOut(auth)
}

/** Observa el estado de autenticación. Devuelve función para desuscribirse. */
export function watchAuth(cb: (user: User | null) => void): () => void {
  if (!firebaseEnabled || !auth) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUid = user.uid
      startSpacesListener(user.uid)
      const active = loadActiveSpace()
      useStore.setState({ activeSpaceId: active || null })
      void startSync(rootFor(user.uid, active), { allowSeedUpload: !active, spaceId: active })
    } else {
      currentUid = ''
      stopSpacesListener()
      stopSync()
    }
    cb(user)
  })
}

/** Lee el índice users/{uid}/meta/spaces para poblar el selector de espacios. */
function startSpacesListener(uid: string) {
  if (!db) return
  stopSpacesListener()
  spacesUnsub = onSnapshot(doc(db, `users/${uid}/meta/spaces`), (d) => {
    const data = (d.exists() ? d.data() : {}) as Record<string, { name?: string; role?: string }>
    const list: SpaceRef[] = Object.entries(data).map(([id, v]) => ({
      id,
      name: v?.name || 'Espacio',
      role: v?.role === 'owner' ? 'owner' : 'editor',
    }))
    useStore.setState({ spaces: list })
    // Si el espacio activo ya no existe (me sacaron), vuelve al personal.
    const active = loadActiveSpace()
    if (active && !list.some((s) => s.id === active)) {
      void setActiveSpace('')
    }
  })
}
function stopSpacesListener() {
  if (spacesUnsub) spacesUnsub()
  spacesUnsub = null
  useStore.setState({ spaces: [] })
}

/** Cambia el espacio activo (persistiendo la elección) y resincroniza el store. */
export async function setActiveSpace(spaceId: string): Promise<void> {
  if (!currentUid) return
  saveActiveSpace(spaceId)
  useStore.setState({ activeSpaceId: spaceId || null })
  stopSync()
  await startSync(rootFor(currentUid, spaceId), { allowSeedUpload: !spaceId, spaceId })
}

async function startSync(base: string, opts: { allowSeedUpload: boolean; spaceId: string }) {
  if (!db) return

  // 1) Carga inicial
  let serverData: Record<string, any[]> = {}
  let serverEmpty = true
  try {
    const snaps = await Promise.all(
      COLLECTIONS.map((c) => getDocs(collection(db!, `${base}/${c}`))),
    )
    COLLECTIONS.forEach((c, i) => {
      serverData[c] = snaps[i].docs.map((d) => d.data())
      if (serverData[c].length) serverEmpty = false
    })
  } catch (e) {
    // Sin permiso (p. ej. me sacaron del espacio): regresa al personal.
    console.warn('startSync: sin acceso al espacio, volviendo al personal', e)
    if (opts.spaceId) { await setActiveSpace(''); return }
    return
  }

  if (serverEmpty && opts.allowSeedUpload) {
    // Primera vez en el espacio personal: sube los datos locales a la nube.
    await uploadAll(base)
    seedPrevFromLocal()
  } else if (serverEmpty) {
    // Espacio compartido vacío: limpia el store (no subas lo local).
    suppress = true
    useStore.setState({
      accounts: [], cards: [], categories: [], transactions: [],
      recurrings: [], budgets: [], reminders: [],
    })
    suppress = false
    seedPrev({})
  } else {
    // El servidor manda: reemplaza el estado local.
    suppress = true
    useStore.setState({
      accounts: serverData.accounts as any,
      cards: serverData.cards as any,
      categories: serverData.categories as any,
      transactions: serverData.transactions as any,
      recurrings: serverData.recurrings as any,
      budgets: serverData.budgets as any,
      reminders: serverData.reminders as any,
    })
    suppress = false
    seedPrev(serverData)
  }
  prevSettings = JSON.stringify(useStore.getState().settings)

  // 2) Escuchas en tiempo real (multi-dispositivo / multi-usuario)
  COLLECTIONS.forEach((c) => {
    const unsub = onSnapshot(collection(db!, `${base}/${c}`), (snap) => {
      const items = snap.docs.map((d) => d.data())
      suppress = true
      useStore.setState({ [c]: items } as any)
      suppress = false
      prev[c] = new Map(items.map((it: any) => [it.id, JSON.stringify(it)]))
    })
    unsubs.push(unsub)
  })
  // settings
  unsubs.push(
    onSnapshot(doc(db, `${base}/meta/settings`), (d) => {
      if (!d.exists()) return
      suppress = true
      useStore.setState({ settings: { ...useStore.getState().settings, ...(d.data() as any) } })
      suppress = false
      prevSettings = JSON.stringify(useStore.getState().settings)
    }),
  )

  // 3) Write-through: empuja cambios locales a Firestore (al espacio activo)
  cloud.active = true
  cloud.put = (col, id, data) => { void setDoc(doc(db!, `${base}/${col}/${id}`), data as any) }
  cloud.del = (col, id) => { void deleteDoc(doc(db!, `${base}/${col}/${id}`)) }
  cloud.putSettings = (settings) => { void setDoc(doc(db!, `${base}/meta/settings`), settings as any) }
  cloud.replaceAll = () => { void uploadAll(base) }

  unsubs.push(useStore.subscribe((state) => pushDiff(state)))
}

function stopSync() {
  unsubs.forEach((u) => u())
  unsubs = []
  prev = {}
  prevSettings = ''
  cloud.active = false
  cloud.put = () => {}
  cloud.del = () => {}
  cloud.putSettings = () => {}
  cloud.replaceAll = () => {}
}

async function uploadAll(base: string) {
  if (!db) return
  const s = useStore.getState()
  const batch = writeBatch(db)
  COLLECTIONS.forEach((c) => {
    ;(s[c] as any[]).forEach((it) => batch.set(doc(db!, `${base}/${c}/${it.id}`), it))
  })
  batch.set(doc(db, `${base}/meta/settings`), s.settings)
  await batch.commit()
}

function seedPrevFromLocal() {
  const s = useStore.getState()
  const data: Record<string, any[]> = {}
  COLLECTIONS.forEach((c) => (data[c] = s[c] as any[]))
  seedPrev(data)
}
function seedPrev(data: Record<string, any[]>) {
  prev = {}
  COLLECTIONS.forEach((c) => {
    prev[c] = new Map((data[c] || []).map((it) => [it.id, JSON.stringify(it)]))
  })
}

function pushDiff(state: any) {
  if (suppress || !cloud.active) return
  COLLECTIONS.forEach((c) => {
    const next = new Map<string, string>((state[c] as any[]).map((it) => [it.id, JSON.stringify(it)]))
    const before = prev[c] ?? new Map()
    // altas / cambios
    for (const [id, json] of next) {
      if (before.get(id) !== json) cloud.put(c, id, JSON.parse(json))
    }
    // bajas
    for (const id of before.keys()) {
      if (!next.has(id)) cloud.del(c, id)
    }
    prev[c] = next
  })
  const sj = JSON.stringify(state.settings)
  if (sj !== prevSettings) {
    prevSettings = sj
    cloud.putSettings(state.settings)
  }
}
