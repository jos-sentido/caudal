import type { Reminder, ReminderFreq } from './types'

function at(dateISO: string, time: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number)
  const [hh, mm] = (time || '09:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0)
}

function step(date: Date, freq: ReminderFreq, interval = 1): Date {
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

/** Próxima ocurrencia estrictamente posterior a `after`. */
export function nextOccurrence(r: Reminder, after: Date = new Date()): Date | null {
  let occ = at(r.date, r.time)
  if (r.freq === 'once') return occ > after ? occ : null
  let i = 0
  while (occ <= after && i < 5000) { occ = step(occ, r.freq, r.interval); i++ }
  return occ > after && occ.getTime() < 8.64e15 ? occ : null
}

/** Ocurrencia más reciente <= now que aún no se notificó (posterior a lastFired). */
export function dueOccurrence(r: Reminder, now: Date = new Date()): Date | null {
  const lower = r.lastFired ? new Date(r.lastFired) : null
  let occ = at(r.date, r.time)
  let due: Date | null = null
  let i = 0
  while (occ <= now && i < 5000) {
    if (!lower || occ > lower) due = occ
    if (r.freq === 'once') break
    occ = step(occ, r.freq, r.interval)
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
