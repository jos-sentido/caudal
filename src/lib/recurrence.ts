import type { Reminder, ReminderFreq } from './types'

/** Zona horaria IANA del dispositivo (fallback a México). */
export function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City' } catch { return 'America/Mexico_City' }
}

// --- Cálculo de ocurrencias con conciencia de zona horaria ---
// Un "carrier" es un Date en UTC que ACARREA los números de reloj de pared
// (año/mes/día/hora/min tal como se ven en la zona del recordatorio). Se avanza
// la recurrencia sobre esos números y se convierte a instante real según la zona.

/** Desfase (ms) de la zona `tz` en el instante dado: asUTC(wall) - instant. */
function tzOffsetMs(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return asUTC - instant.getTime()
}

function carrier(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0))
}

/** Convierte un carrier (reloj de pared) al instante real en la zona `tz`. */
function carrierToInstant(w: Date, tz: string): Date {
  return new Date(w.getTime() - tzOffsetMs(w, tz))
}

function stepCarrier(w: Date, freq: ReminderFreq, interval = 1): Date {
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

function startCarrier(r: Reminder): Date {
  const [y, m, d] = r.date.split('-').map(Number)
  const [hh, mm] = (r.time || '09:00').split(':').map(Number)
  return carrier(y, m, d, hh || 0, mm || 0)
}

/** Próxima ocurrencia estrictamente posterior a `after`. */
export function nextOccurrence(r: Reminder, after: Date = new Date()): Date | null {
  const tz = r.tz || deviceTimeZone()
  let w = startCarrier(r)
  if (r.freq === 'once') { const inst = carrierToInstant(w, tz); return inst > after ? inst : null }
  let i = 0
  while (i < 5000) {
    const inst = carrierToInstant(w, tz)
    if (inst > after) return inst.getTime() < 8.64e15 ? inst : null
    w = stepCarrier(w, r.freq, r.interval)
    i++
  }
  return null
}

/** Ocurrencia más reciente <= now que aún no se notificó (posterior a lastFired). */
export function dueOccurrence(r: Reminder, now: Date = new Date()): Date | null {
  const tz = r.tz || deviceTimeZone()
  const lower = r.lastFired ? new Date(r.lastFired) : null
  let w = startCarrier(r)
  let due: Date | null = null
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

export const FREQ_LABEL: Record<ReminderFreq, string> = {
  once: 'Una vez',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
  everyN: 'Cada X días',
}

export function freqDescription(r: Reminder): string {
  if (r.freq === 'everyN') return `Cada ${Math.max(1, r.interval || 1)} días`
  return FREQ_LABEL[r.freq]
}

/** Etiqueta relativa amigable para una fecha/hora. */
export function whenLabel(d: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000)
  const hm = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const MS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  if (diff === 0) return `Hoy · ${hm}`
  if (diff === 1) return `Mañana · ${hm}`
  if (diff === -1) return `Ayer · ${hm}`
  if (diff > 1 && diff < 7) return `${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]} · ${hm}`
  return `${d.getDate()} ${MS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''} · ${hm}`
}
