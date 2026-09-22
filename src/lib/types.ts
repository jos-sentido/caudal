export type TxType = 'expense' | 'income' | 'transfer'
export type CategoryKind = 'expense' | 'income'
export type RecurrenceFreq = 'weekly' | 'monthly' | 'yearly'
export type ReminderFreq = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'everyN'
export type ReminderKind = 'expense' | 'income' | 'card' | 'other'

export interface Reminder {
  id: string
  title: string
  note?: string
  amount?: number | null
  kind: ReminderKind
  categoryId?: string | null
  accountId?: string | null
  cardId?: string | null
  date: string // yyyy-mm-dd de la primera ocurrencia
  time: string // HH:mm
  freq: ReminderFreq
  interval?: number // días, para 'everyN'
  notify: boolean
  active: boolean
  lastFired?: string | null // ISO datetime de la última ocurrencia notificada
}

export interface Account {
  id: string
  name: string
  kind: 'cash' | 'checking' | 'savings' | 'investment' | 'other'
  initialBalance: number
  color: string
  icon: string
  archived?: boolean
  order?: number
}

export interface CreditCard {
  id: string
  name: string
  limit: number
  closingDay: number // día de corte (1-31)
  dueDay: number // día de pago (1-31)
  color: string
  icon: string
}

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  color: string
  icon: string
  parentId?: string | null
}

export interface Transaction {
  id: string
  type: TxType
  amount: number // siempre positivo
  date: string // yyyy-mm-dd
  description: string
  categoryId?: string | null
  accountId?: string | null // origen (o cuenta afectada)
  toAccountId?: string | null // destino (transferencias)
  cardId?: string | null // si se pagó con tarjeta de crédito
  confirmed: boolean
  recurringId?: string | null
  notes?: string
  createdAt: number
}

export interface Recurring {
  id: string
  type: TxType
  amount: number
  description: string
  categoryId?: string | null
  accountId?: string | null
  cardId?: string | null
  frequency: RecurrenceFreq
  dayOfMonth: number
  active: boolean
  lastRun?: string | null // yyyy-mm-dd de la última instancia generada
}

export interface Budget {
  id: string
  categoryId: string
  amount: number // límite mensual
}

export interface Settings {
  currency: string
  locale: string
  hideBalances: boolean
  seeded: boolean
}

export interface AppData {
  accounts: Account[]
  cards: CreditCard[]
  categories: Category[]
  transactions: Transaction[]
  recurrings: Recurring[]
  budgets: Budget[]
  reminders: Reminder[]
  settings: Settings
}
