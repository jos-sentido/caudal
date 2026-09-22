import {
  signInWithPopup, signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  doc, setDoc, deleteDoc, collection, getDocs, onSnapshot, writeBatch,
} from 'firebase/firestore'
import { auth, db, googleProvider, firebaseEnabled } from '../lib/firebase'
import { cloud, type Collname } from './cloudBridge'
import { useStore } from './useStore'

const COLLECTIONS: Collname[] = ['accounts', 'cards', 'categories', 'transactions', 'recurrings', 'budgets', 'reminders']

let unsubs: (() => void)[] = []
let suppress = false // evita que las actualizaciones remotas re-escriban al servidor
let prev: Record<string, Map<string, string>> = {}

export function signInGoogle() {
  if (!auth) return Promise.reject(new Error('Firebase no configurado'))
  return signInWithPopup(auth, googleProvider)
}

export function signOutUser() {
  if (!auth) return Promise.resolve()
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
    if (user) startSync(user.uid)
    else stopSync()
    cb(user)
  })
}

async function startSync(uid: string) {
  if (!db) return
  const base = `users/${uid}`

  // 1) Carga inicial
  const snaps = await Promise.all(
    COLLECTIONS.map((c) => getDocs(collection(db!, `${base}/${c}`))),
  )
  const serverData: Record<string, any[]> = {}
  let serverEmpty = true
  COLLECTIONS.forEach((c, i) => {
    serverData[c] = snaps[i].docs.map((d) => d.data())
    if (serverData[c].length) serverEmpty = false
  })

  const local = useStore.getState()

  if (serverEmpty) {
    // Primera vez: sube los datos locales a la nube
    await uploadAll(uid)
    seedPrevFromLocal()
  } else {
    // El servidor manda: reemplaza el estado local
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

  // 2) Escuchas en tiempo real (multi-dispositivo)
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
      useStore.setState({ settings: { ...local.settings, ...(d.data() as any) } })
      suppress = false
    }),
  )

  // 3) Write-through: empuja cambios locales a Firestore
  cloud.active = true
  cloud.put = (col, id, data) => { void setDoc(doc(db!, `${base}/${col}/${id}`), data as any) }
  cloud.del = (col, id) => { void deleteDoc(doc(db!, `${base}/${col}/${id}`)) }
  cloud.putSettings = (settings) => { void setDoc(doc(db!, `${base}/meta/settings`), settings as any) }
  cloud.replaceAll = () => { void uploadAll(uid) }

  unsubs.push(useStore.subscribe((state) => pushDiff(state)))
}

function stopSync() {
  unsubs.forEach((u) => u())
  unsubs = []
  prev = {}
  cloud.active = false
  cloud.put = () => {}
  cloud.del = () => {}
  cloud.putSettings = () => {}
  cloud.replaceAll = () => {}
}

async function uploadAll(uid: string) {
  if (!db) return
  const s = useStore.getState()
  const base = `users/${uid}`
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

let prevSettings = ''
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
