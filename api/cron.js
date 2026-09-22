// Función serverless (Vercel) que envía notificaciones push de recordatorios vencidos.
// La dispara un cron (GitHub Actions) cada ~15 min. Requiere variables de entorno:
//   FIREBASE_SERVICE_ACCOUNT  -> JSON de la llave de servicio de Firebase (secreto)
//   CRON_SECRET               -> token compartido con el cron para autorizar la llamada
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

function ensureApp() {
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(sa) })
  }
}

// --- Lógica de recurrencia (equivalente a src/lib/recurrence.ts) ---
function at(dateISO, time) {
  const [y, m, d] = String(dateISO).split('-').map(Number)
  const [hh, mm] = String(time || '09:00').split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0)
}
function step(date, freq, interval = 1) {
  const d = new Date(date)
  switch (freq) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
    case 'everyN': d.setDate(d.getDate() + Math.max(1, interval)); break
    case 'once': return new Date(8.64e15)
  }
  return d
}
function dueOccurrence(r, now) {
  const lower = r.lastFired ? new Date(r.lastFired) : null
  let occ = at(r.date, r.time)
  let due = null
  let i = 0
  while (occ <= now && i < 5000) {
    if (!lower || occ > lower) due = occ
    if (r.freq === 'once') break
    occ = step(occ, r.freq, r.interval)
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

    for (const docSnap of snap.docs) {
      const r = docSnap.data()
      checked++
      if (!r || !r.active || !r.notify) continue
      const due = dueOccurrence(r, now)
      if (!due) continue
      if (r.lastFired && new Date(r.lastFired) >= due) continue

      const uid = docSnap.ref.parent.parent && docSnap.ref.parent.parent.id
      if (!uid) continue

      const tokSnap = await db.collection(`users/${uid}/fcmTokens`).get()
      const tokens = tokSnap.docs.map((d) => d.get('token')).filter(Boolean)

      if (tokens.length) {
        const body = r.amount
          ? `${money(r.amount)} · toca para registrarlo`
          : (r.note || 'Recordatorio de Caudal')
        const resp = await messaging.sendEachForMulticast({
          tokens,
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
              db.doc(`users/${uid}/fcmTokens/${tokens[i]}`).delete().catch(() => {})
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
