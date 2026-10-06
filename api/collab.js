// Función serverless (Vercel) que gestiona los espacios compartidos de forma segura.
// Toda mutación de membresía pasa por aquí (admin SDK) para no abrir huecos en las reglas.
// Requiere la variable de entorno:
//   FIREBASE_SERVICE_ACCOUNT -> JSON de la llave de servicio de Firebase (secreto)
// El cliente autentica cada llamada con el idToken de Firebase en el header Authorization.
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

function ensureApp() {
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(sa) })
  }
}

// Código de invitación legible (sin caracteres ambiguos).
function randomCode() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += abc[Math.floor(Math.random() * abc.length)]
  return s
}
function randomId() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' })
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.status(500).json({ error: 'missing FIREBASE_SERVICE_ACCOUNT' })
  }

  const authz = req.headers.authorization || ''
  const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : ''
  if (!idToken) return res.status(401).json({ error: 'no-token' })

  try {
    ensureApp()
    const db = getFirestore()
    const decoded = await getAuth().verifyIdToken(idToken)
    const uid = decoded.uid
    const name = decoded.name || decoded.email || 'Usuario'
    const email = decoded.email || ''

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const action = body.action

    const member = (role) => ({ role, name, email, since: Date.now() })

    // Crear un espacio compartido nuevo (el creador queda como dueño).
    if (action === 'createSpace') {
      const spaceId = randomId()
      const nm = String(body.name || 'Espacio compartido').slice(0, 60).trim() || 'Espacio compartido'
      await db.doc(`spaces/${spaceId}/meta/info`).set({
        name: nm, createdBy: uid, createdAt: Date.now(),
        members: { [uid]: member('owner') },
      })
      await db.doc(`users/${uid}/meta/spaces`).set(
        { [spaceId]: { name: nm, role: 'owner', since: Date.now() } },
        { merge: true },
      )
      return res.status(200).json({ ok: true, spaceId, name: nm })
    }

    // Generar un código/enlace de invitación para un espacio (solo miembros).
    if (action === 'createInvite') {
      const spaceId = String(body.spaceId || '')
      const infoSnap = await db.doc(`spaces/${spaceId}/meta/info`).get()
      if (!infoSnap.exists) return res.status(404).json({ error: 'space-not-found' })
      const info = infoSnap.data()
      if (!info.members || !info.members[uid]) return res.status(403).json({ error: 'not-member' })
      const code = randomCode()
      await db.doc(`invites/${code}`).set({
        code, spaceId, spaceName: info.name || '', createdBy: uid,
        role: 'editor', status: 'active', createdAt: Date.now(),
      })
      return res.status(200).json({ ok: true, code, spaceName: info.name || '' })
    }

    // Aceptar una invitación: añade al usuario como miembro del espacio.
    if (action === 'acceptInvite') {
      const code = String(body.code || '').trim().toUpperCase()
      if (!code) return res.status(400).json({ error: 'no-code' })
      const invSnap = await db.doc(`invites/${code}`).get()
      if (!invSnap.exists) return res.status(404).json({ error: 'invite-not-found' })
      const inv = invSnap.data()
      if (inv.status !== 'active') return res.status(410).json({ error: 'invite-inactive' })
      const spaceId = inv.spaceId
      const infoRef = db.doc(`spaces/${spaceId}/meta/info`)
      const infoSnap = await infoRef.get()
      if (!infoSnap.exists) return res.status(404).json({ error: 'space-not-found' })
      const info = infoSnap.data()
      const spaceName = info.name || inv.spaceName || 'Espacio compartido'
      const role = inv.role || 'editor'
      if (!info.members || !info.members[uid]) {
        await infoRef.update({ [`members.${uid}`]: member(role) })
      }
      await db.doc(`users/${uid}/meta/spaces`).set(
        { [spaceId]: { name: spaceName, role, since: Date.now() } },
        { merge: true },
      )
      return res.status(200).json({ ok: true, spaceId, name: spaceName })
    }

    // Salir de un espacio (quitarse a uno mismo).
    if (action === 'leaveSpace') {
      const spaceId = String(body.spaceId || '')
      const infoRef = db.doc(`spaces/${spaceId}/meta/info`)
      const infoSnap = await infoRef.get()
      if (infoSnap.exists) {
        await infoRef.update({ [`members.${uid}`]: FieldValue.delete() })
      }
      await db.doc(`users/${uid}/meta/spaces`).update({ [spaceId]: FieldValue.delete() }).catch(() => {})
      return res.status(200).json({ ok: true })
    }

    // Expulsar a un miembro (solo el creador del espacio).
    if (action === 'removeMember') {
      const spaceId = String(body.spaceId || '')
      const target = String(body.memberUid || '')
      const infoRef = db.doc(`spaces/${spaceId}/meta/info`)
      const infoSnap = await infoRef.get()
      if (!infoSnap.exists) return res.status(404).json({ error: 'space-not-found' })
      const info = infoSnap.data()
      if (!info.members || !info.members[uid]) return res.status(403).json({ error: 'not-member' })
      if (info.createdBy !== uid) return res.status(403).json({ error: 'not-owner' })
      if (target === uid) return res.status(400).json({ error: 'cannot-remove-self' })
      await infoRef.update({ [`members.${target}`]: FieldValue.delete() })
      await db.doc(`users/${target}/meta/spaces`).update({ [spaceId]: FieldValue.delete() }).catch(() => {})
      return res.status(200).json({ ok: true })
    }

    // Renombrar un espacio (solo miembros).
    if (action === 'renameSpace') {
      const spaceId = String(body.spaceId || '')
      const nm = String(body.name || '').slice(0, 60).trim()
      if (!nm) return res.status(400).json({ error: 'no-name' })
      const infoRef = db.doc(`spaces/${spaceId}/meta/info`)
      const infoSnap = await infoRef.get()
      if (!infoSnap.exists) return res.status(404).json({ error: 'space-not-found' })
      const info = infoSnap.data()
      if (!info.members || !info.members[uid]) return res.status(403).json({ error: 'not-member' })
      await infoRef.update({ name: nm })
      // Actualiza el nombre en el índice de cada miembro (best-effort).
      await Promise.all(
        Object.keys(info.members || {}).map((m) =>
          db.doc(`users/${m}/meta/spaces`).set({ [spaceId]: { name: nm } }, { merge: true }).catch(() => {}),
        ),
      )
      return res.status(200).json({ ok: true, name: nm })
    }

    return res.status(400).json({ error: 'unknown-action' })
  } catch (e) {
    console.error('collab error', e)
    return res.status(500).json({ error: String((e && e.message) || e) })
  }
}
