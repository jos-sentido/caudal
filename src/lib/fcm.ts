import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { fbApp, db, firebaseEnabled } from './firebase'
import { fireNotification } from './notify'

const VAPID = import.meta.env.VITE_FB_VAPID_KEY as string | undefined

function swQuery(): string {
  return new URLSearchParams({
    apiKey: import.meta.env.VITE_FB_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FB_PROJECT_ID ?? '',
    messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FB_APP_ID ?? '',
  }).toString()
}

/** true si el entorno soporta push y hay VAPID configurada */
export async function pushAvailable(): Promise<boolean> {
  if (!firebaseEnabled || !fbApp || !db || !VAPID) return false
  try { return await isSupported() } catch { return false }
}

let registered = false

/** Registra el token FCM del dispositivo bajo users/{uid}/fcmTokens. Requiere permiso concedido. */
export async function registerPush(uid: string): Promise<'ok' | 'skipped' | 'error'> {
  try {
    if (!(await pushAvailable())) return 'skipped'
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 'skipped'
    if (registered) return 'ok'
    // scope propio para no chocar con el service worker de la PWA (scope "/")
    const reg = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${swQuery()}`,
      { scope: '/firebase-cloud-messaging-push-scope' },
    )
    const messaging = getMessaging(fbApp!)
    const token = await getToken(messaging, { vapidKey: VAPID, serviceWorkerRegistration: reg })
    if (!token) return 'error'
    await setDoc(doc(db!, `users/${uid}/fcmTokens/${token}`), {
      token,
      ua: navigator.userAgent,
      updatedAt: Date.now(),
    })
    registered = true
    onMessage(messaging, (payload) => {
      const d = (payload.data as Record<string, string>) || {}
      fireNotification(d.title || 'Caudal', d.body || '', d.tag)
    })
    return 'ok'
  } catch (e) {
    console.warn('registerPush error', e)
    return 'error'
  }
}
