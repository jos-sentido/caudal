export function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notifPermission(): NotificationPermission | 'unsupported' {
  if (!canNotify()) return 'unsupported'
  return Notification.permission
}

export async function ensurePermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!canNotify()) return 'unsupported'
  if (Notification.permission === 'default') {
    try { return await Notification.requestPermission() } catch { return Notification.permission }
  }
  return Notification.permission
}

export async function fireNotification(title: string, body: string, tag?: string) {
  if (!canNotify() || Notification.permission !== 'granted') return
  const opts: NotificationOptions = { body, tag, icon: '/favicon.svg', badge: '/favicon.svg' }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) { await reg.showNotification(title, opts); return }
  } catch { /* fallback abajo */ }
  try { new Notification(title, opts) } catch { /* ignore */ }
}
