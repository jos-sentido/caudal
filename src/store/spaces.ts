// Cliente de la capa de colaboración: habla con /api/collab (admin SDK) y
// ayuda a copiar los datos actuales a un espacio recién creado.
import { doc, writeBatch } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useStore } from './useStore'

const DATA_COLLS = ['accounts', 'cards', 'categories', 'transactions', 'recurrings', 'budgets', 'reminders'] as const

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const u = auth?.currentUser
  if (!u) throw new Error('Inicia sesión para colaborar')
  const idToken = await u.getIdToken()
  const res = await fetch('/api/collab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ action, ...payload }),
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
export const apiRemoveMember = (spaceId: string, memberUid: string) =>
  call('removeMember', { spaceId, memberUid })
export const apiRenameSpace = (spaceId: string, name: string) =>
  call<{ name: string }>('renameSpace', { spaceId, name })

/** Copia los datos actuales del store al espacio indicado (punto de partida al crearlo). */
export async function copyCurrentDataToSpace(spaceId: string): Promise<void> {
  if (!db) return
  const s = useStore.getState()
  const ops: { path: string; data: unknown }[] = []
  for (const c of DATA_COLLS) {
    for (const it of (s[c] as { id: string }[])) ops.push({ path: `spaces/${spaceId}/${c}/${it.id}`, data: it })
  }
  ops.push({ path: `spaces/${spaceId}/meta/settings`, data: s.settings })

  // Firestore limita cada batch a 500 operaciones: dividimos en lotes.
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + 400)) batch.set(doc(db, op.path), op.data as any)
    await batch.commit()
  }
}
