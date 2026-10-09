// Cliente de la capa de colaboración: habla con /api/collab (admin SDK) y
// ayuda a copiar/gestionar qué datos del espacio personal viven en un espacio compartido.
import { doc, setDoc, writeBatch, getDocs, collection } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useStore } from './useStore'
import type { Account, CreditCard, Category, Transaction, Recurring, Budget } from '../lib/types'

const DATA_COLLS = ['accounts', 'cards', 'categories', 'transactions', 'recurrings', 'budgets', 'reminders'] as const

// Colecciones que participan en el "compartir selectivo" (los recordatorios se
// manejan dentro de cada espacio por separado, no se copian).
const SHARE_COLLS = ['accounts', 'cards', 'categories', 'transactions', 'recurrings', 'budgets'] as const

export interface PersonalData {
  accounts: Account[]
  cards: CreditCard[]
  categories: Category[]
  transactions: Transaction[]
  recurrings: Recurring[]
  budgets: Budget[]
}

export interface ShareSelection {
  accounts: Set<string>
  cards: Set<string>
  includeBudgets: boolean
}

const clean = (v: unknown) => JSON.parse(JSON.stringify(v))

/** Lee los datos del espacio personal del usuario (para el selector de qué compartir). */
export async function fetchPersonalData(): Promise<PersonalData> {
  const u = auth?.currentUser
  if (!db || !u) throw new Error('Sin sesión')
  const out: any = {}
  await Promise.all(SHARE_COLLS.map(async (c) => {
    const snap = await getDocs(collection(db!, `users/${u.uid}/${c}`))
    out[c] = snap.docs.map((d) => d.data())
  }))
  return out as PersonalData
}

/** IDs actualmente presentes en el espacio compartido, por colección. */
async function fetchSharedIds(spaceId: string): Promise<Record<string, Set<string>>> {
  if (!db) return {}
  const out: Record<string, Set<string>> = {}
  await Promise.all(SHARE_COLLS.map(async (c) => {
    const snap = await getDocs(collection(db!, `spaces/${spaceId}/${c}`))
    out[c] = new Set(snap.docs.map((d) => d.id))
  }))
  return out
}

const inSel = (id: string | null | undefined, set: Set<string>) => id == null || set.has(id)

/** Calcula qué ítems copiar según la selección (los movimientos siguen a su cuenta/tarjeta). */
export function buildShareSet(p: PersonalData, sel: ShareSelection): Record<string, any[]> {
  const { accounts: a, cards: c, includeBudgets } = sel
  const accounts = p.accounts.filter((x) => a.has(x.id))
  const cards = p.cards.filter((x) => c.has(x.id))
  const categories = p.categories // las categorías (etiquetas) siempre se incluyen
  const transactions = p.transactions.filter((t) =>
    ((t.accountId && a.has(t.accountId)) || (t.cardId && c.has(t.cardId))) &&
    inSel(t.accountId, a) && inSel(t.toAccountId, a) && inSel(t.cardId, c),
  )
  const recurrings = p.recurrings.filter((r) =>
    ((r.accountId && a.has(r.accountId)) || (r.cardId && c.has(r.cardId))) &&
    inSel(r.accountId, a) && inSel(r.cardId, c),
  )
  const budgets = includeBudgets ? p.budgets : []
  return { accounts, cards, categories, transactions, recurrings, budgets }
}

/**
 * Aplica la selección al espacio compartido: reemplaza SOLO la contribución del
 * usuario (ítems cuyo id coincide con los suyos personales), sin tocar lo de otros miembros.
 */
export async function applyShareSelection(spaceId: string, p: PersonalData, sel: ShareSelection): Promise<void> {
  if (!db) return
  const shareSet = buildShareSet(p, sel)
  const myIds: Record<string, Set<string>> = {}
  for (const c of SHARE_COLLS) myIds[c] = new Set((p[c] as { id: string }[]).map((x) => x.id))
  const sharedIds = await fetchSharedIds(spaceId)

  const ops: { type: 'set' | 'del'; path: string; data?: unknown }[] = []
  for (const c of SHARE_COLLS) {
    const keep = new Set((shareSet[c] as { id: string }[]).map((x) => x.id))
    // Quita de lo compartido lo mío que ya no está seleccionado.
    for (const id of sharedIds[c] || []) {
      if (myIds[c].has(id) && !keep.has(id)) ops.push({ type: 'del', path: `spaces/${spaceId}/${c}/${id}` })
    }
    // Agrega/actualiza lo seleccionado.
    for (const item of shareSet[c] as { id: string }[]) ops.push({ type: 'set', path: `spaces/${spaceId}/${c}/${item.id}`, data: clean(item) })
  }

  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + 400)) {
      if (op.type === 'del') batch.delete(doc(db, op.path))
      else batch.set(doc(db, op.path), op.data as any)
    }
    await batch.commit()
  }
}

/** Copia los settings (moneda/locale) actuales al espacio (al crearlo). */
export async function copySettingsToSpace(spaceId: string): Promise<void> {
  if (!db) return
  await setDoc(doc(db, `spaces/${spaceId}/meta/settings`), clean(useStore.getState().settings) as any)
}

/** Selección que incluye TODO (default al crear). */
export function selectAll(p: PersonalData): ShareSelection {
  return {
    accounts: new Set(p.accounts.map((a) => a.id)),
    cards: new Set(p.cards.map((c) => c.id)),
    includeBudgets: true,
  }
}

/** Selección actual leída del espacio compartido (qué de lo mío ya está ahí). */
export async function readCurrentSelection(spaceId: string, p: PersonalData): Promise<ShareSelection> {
  const shared = await fetchSharedIds(spaceId)
  const myAcc = new Set(p.accounts.map((a) => a.id))
  const myCard = new Set(p.cards.map((c) => c.id))
  const myBudget = new Set(p.budgets.map((b) => b.id))
  return {
    accounts: new Set([...(shared.accounts || [])].filter((id) => myAcc.has(id))),
    cards: new Set([...(shared.cards || [])].filter((id) => myCard.has(id))),
    includeBudgets: [...(shared.budgets || [])].some((id) => myBudget.has(id)),
  }
}

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const u = auth?.currentUser
  if (!u) throw new Error('Inicia sesión para colaborar')
  const idToken = await u.getIdToken()
  const res = await fetch('/api/collab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ action, apiKey: import.meta.env.VITE_FB_API_KEY, ...payload }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.error) throw new Error(friendly(json?.error) || 'No se pudo completar la acción')
  return json as T
}

function friendly(code?: string): string {
  switch (code) {
    case 'invite-not-found': return 'Ese código de invitación no existe'
    case 'invite-inactive': return 'La invitación ya no está activa'
    case 'space-not-found': return 'El espacio ya no existe'
    case 'not-member': return 'No perteneces a ese espacio'
    case 'not-owner': return 'Solo quien creó el espacio puede hacer eso'
    case 'cannot-remove-self': return 'Usa "Salir del espacio" para quitarte a ti mismo'
    case 'no-token': return 'Vuelve a iniciar sesión'
    case 'invalid-token': return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    case 'missing-api-key': return 'Falta configuración del servidor (API key)'
    default: return code || ''
  }
}

export const apiCreateSpace = (name: string) =>
  call<{ spaceId: string; name: string }>('createSpace', { name })
export const apiCreateInvite = (spaceId: string) =>
  call<{ code: string; spaceName: string }>('createInvite', { spaceId })
export const apiAcceptInvite = (code: string) =>
  call<{ spaceId: string; name: string }>('acceptInvite', { code })
export const apiLeaveSpace = (spaceId: string) => call('leaveSpace', { spaceId })
export const apiDeleteSpace = (spaceId: string) => call('deleteSpace', { spaceId })
export const apiRemoveMember = (spaceId: string, memberUid: string) =>
  call('removeMember', { spaceId, memberUid })
export const apiRenameSpace = (spaceId: string, name: string) =>
  call<{ name: string }>('renameSpace', { spaceId, name })
export const apiTestPush = () =>
  call<{ ok: boolean; sent?: number; tokens?: number; reason?: string }>('testPush')

/** Copia los datos actuales del store al espacio indicado (punto de partida al crearlo). */
export async function copyCurrentDataToSpace(spaceId: string): Promise<void> {
  if (!db) return
  const s = useStore.getState()
  // Quita campos undefined (Firestore los rechaza) serializando y reparseando.
  const clean = (v: unknown) => JSON.parse(JSON.stringify(v))
  const ops: { path: string; data: unknown }[] = []
  for (const c of DATA_COLLS) {
    for (const it of (s[c] as { id: string }[])) ops.push({ path: `spaces/${spaceId}/${c}/${it.id}`, data: clean(it) })
  }
  ops.push({ path: `spaces/${spaceId}/meta/settings`, data: clean(s.settings) })

  // Firestore limita cada batch a 500 operaciones: dividimos en lotes.
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + 400)) batch.set(doc(db, op.path), op.data as any)
    await batch.commit()
  }
}
