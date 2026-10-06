// Función serverless (Vercel) que envía notificaciones push de recordatorios vencidos.
// La dispara un cron (GitHub Actions) cada ~15 min. Requiere variables de entorno:
//   FIREBASE_SERVICE_ACCOUNT  -> JSON de la llave de servicio de Firebase (secreto)
//   CRON_SECRET               -> token compartido con el cron para autorizar la llamada
// Cubre recordatorios del espacio personal (users/{uid}/reminders) y de los
// espacios compartidos (spaces/{id}/reminders), avisando según notifyScope.
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

function ensureApp() {
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(sa) })
  }
}

// --- Recurrencia con conciencia de zona horaria (equivalente a src/lib/recurrence.ts) ---
const DEFAULT_TZ = 'America/Mexico_City'

function tzOffsetMs(instant, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return asUTC - instant.getTime()
}
function carrier(y, m, d, hh, mm) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0))
}
function carrierToInstant(w, tz) {
  return new Date(w.getTime() - tzOffsetMs(w, tz))
}
function stepCarrier(w, freq, interval = 1) {
  const d = new Date(w)
  switch (freq) {
    case 'daily': d.setUTCDate(d.getUTCDate() + 1); break
    case 'weekly': d.setUTCDate(d.getUTCDate() + 7); break
    case 'monthly': d.setUTCMonth(d.getUTCMonth() + 1); break
    case 'yearly': d.setUTCFullYear(d.getUTCFullYear() + 1); break
    case 'everyN': d.setUTCDate(d.getUTCDate() + Math.max(1, interval)); break
    case 'once': return new Date(8.64e15)
  }
  return d
}
function startCarrier(r) {
  const [y, m, d] = String(r.date).split('-').map(Number)
  const [hh, mm] = String(r.time || '09:00').split(':').map(Number)
  return carrier(y, m || 1, d || 1, hh || 0, mm || 0)
}
function dueOccurrence(r, now) {
  const tz = r.tz || DEFAULT_TZ
  const lower = r.lastFired ? new Date(r.lastFired) : null
  let w = startCarrier(r)
  let due = null
  let i = 0
  while (i < 5000) {
    const inst = carrierToInstant(w, tz)
    if (inst > now) break
    if (!lower || inst > lower) due = inst
    if (r.freq === 'once') break
    w = stepCarrier(w, r.freq, r.interval)
    i++
  }
  return due
}

function money(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || (req.query && req.query.secret)
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.status(500).json({ error: 'missing FIREBASE_SERVICE_ACCOUNT' })
  }

  try {
    ensureApp()
    const db = getFirestore()
    const messaging = getMessaging()
    const now = new Date()
    const snap = await db.collectionGroup('reminders').get()

    let checked = 0
    let sent = 0
    let firedReminders = 0

    // Caché por ejecución: tokens de cada usuario y miembros de cada espacio.
    const tokenCache = new Map() // uid -> string[]
    const spaceMembersCache = new Map() // spaceId -> string[] (uids)

    async function tokensFor(uid) {
      if (tokenCache.has(uid)) return tokenCache.get(uid)
      const tokSnap = await db.collection(`users/${uid}/fcmTokens`).get()
      const tokens = tokSnap.docs.map((d) => d.get('token')).filter(Boolean)
      tokenCache.set(uid, tokens)
      return tokens
    }
    async function membersOf(spaceId) {
      if (spaceMembersCache.has(spaceId)) return spaceMembersCache.get(spaceId)
      const info = await db.doc(`spaces/${spaceId}/meta/info`).get()
      const members = info.exists ? Object.keys(info.data().members || {}) : []
      spaceMembersCache.set(spaceId, members)
      return members
    }

    for (const docSnap of snap.docs) {
      const r = docSnap.data()
      checked++
      if (!r || !r.active || !r.notify) continue
      const due = dueOccurrence(r, now)
      if (!due) continue
      if (r.lastFired && new Date(r.lastFired) >= due) continue

      // ¿Dónde vive el recordatorio? users/{uid}/reminders o spaces/{id}/reminders
      const ownerDoc = docSnap.ref.parent.parent // doc users/{uid} o spaces/{id}
      const ownerColl = ownerDoc && ownerDoc.parent // colección 'users' o 'spaces'
      if (!ownerDoc || !ownerColl) continue

      // Resuelve los destinatarios (uids) según el tipo de espacio y notifyScope.
      let recipients = []
      if (ownerColl.id === 'users') {
        recipients = [ownerDoc.id]
      } else if (ownerColl.id === 'spaces') {
        const members = await membersOf(ownerDoc.id)
        if (r.notifyScope === 'me' && r.createdBy) {
          recipients = members.includes(r.createdBy) ? [r.createdBy] : []
        } else {
          recipients = members // 'all' (o sin definir) => todos los miembros
        }
      } else {
        continue
      }

      // Junta los tokens de todos los destinatarios.
      const pairs = [] // { uid, token }
      for (const uid of recipients) {
        for (const t of await tokensFor(uid)) pairs.push({ uid, token: t })
      }

      if (pairs.length) {
        const body = r.amount
          ? `${money(r.amount)} · toca para registrarlo`
          : (r.note || 'Recordatorio de Caudal')
        const resp = await messaging.sendEachForMulticast({
          tokens: pairs.map((p) => p.token),
          data: {
            title: String(r.title || 'Caudal'),
            body: String(body),
            url: '/recordatorios',
            tag: String(r.id || docSnap.id),
          },
          webpush: { headers: { Urgency: 'high' }, fcmOptions: { link: '/recordatorios' } },
        })
        sent += resp.successCount
        resp.responses.forEach((rr, i) => {
          if (!rr.success) {
            const code = (rr.error && rr.error.code) || ''
            if (code.includes('not-registered') || code.includes('invalid-argument') || code.includes('invalid-registration-token')) {
              const p = pairs[i]
              db.doc(`users/${p.uid}/fcmTokens/${p.token}`).delete().catch(() => {})
            }
          }
        })
      }

      await docSnap.ref.update({ lastFired: due.toISOString() })
      firedReminders++
    }

    return res.status(200).json({ ok: true, checked, firedReminders, sent })
  } catch (e) {
    console.error('cron error', e)
    return res.status(500).json({ error: String((e && e.message) || e) })
  }
}
