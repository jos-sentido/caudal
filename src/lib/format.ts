const LOCALE = 'es-MX'

export function money(n: number, opts: { sign?: boolean; hide?: boolean } = {}) {
  if (opts.hide) return '••••••'
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)
  const prefix = n < 0 ? '-$' : opts.sign ? '+$' : '$'
  return `${prefix}${formatted}`
}

export function moneyShort(n: number, hide?: boolean) {
  if (hide) return '••••'
  const abs = Math.abs(n)
  let s: string
  if (abs >= 1_000_000) s = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  else if (abs >= 1_000) s = (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  else s = abs.toFixed(0)
  return `${n < 0 ? '-' : ''}$${s}`
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function monthName(m: number) {
  return MONTHS[m]
}
export function monthShort(m: number) {
  return MONTHS_SHORT[m]
}

/** yyyy-mm-dd local (sin desfase de zona) */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Etiqueta relativa para agrupar transacciones por día */
export function dayLabel(iso: string): string {
  const d = parseISO(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === 1) return 'Mañana'
  return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}`
}

export function fullDate(iso: string): string {
  const d = parseISO(iso)
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7) // yyyy-mm
}

export function inMonth(iso: string, year: number, month: number): boolean {
  const d = parseISO(iso)
  return d.getFullYear() === year && d.getMonth() === month
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
