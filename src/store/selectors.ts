import type { Account, Budget, Category, CreditCard, Transaction } from '../lib/types'
import { inMonth } from '../lib/format'

function effectOnAccount(t: Transaction, accountId: string): number {
  if (t.type === 'income' && t.accountId === accountId) return t.amount
  if (t.type === 'expense' && t.accountId === accountId) return -t.amount
  if (t.type === 'transfer') {
    if (t.accountId === accountId) return -t.amount
    if (t.toAccountId === accountId) return t.amount
  }
  return 0
}

export function accountCurrent(acc: Account, txns: Transaction[]): number {
  let bal = acc.initialBalance
  for (const t of txns) {
    if (!t.confirmed) continue
    bal += effectOnAccount(t, acc.id)
  }
  return bal
}

export function accountProjected(
  acc: Account, txns: Transaction[], year: number, month: number,
): number {
  let bal = accountCurrent(acc, txns)
  for (const t of txns) {
    if (t.confirmed) continue
    if (!inMonth(t.date, year, month)) continue
    bal += effectOnAccount(t, acc.id)
  }
  return bal
}

export function totalCurrentBalance(accounts: Account[], txns: Transaction[]): number {
  return accounts.reduce((sum, a) => sum + accountCurrent(a, txns), 0)
}

export interface MonthTotals {
  income: number
  expense: number
  balance: number
}

export function monthTotals(txns: Transaction[], year: number, month: number): MonthTotals {
  let income = 0
  let expense = 0
  for (const t of txns) {
    if (!inMonth(t.date, year, month)) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

export interface CategorySlice {
  category: Category
  total: number
  pct: number
}

export function expenseByCategory(
  txns: Transaction[], categories: Category[], year: number, month: number,
): CategorySlice[] {
  const map = new Map<string, number>()
  let grand = 0
  for (const t of txns) {
    if (t.type !== 'expense') continue
    if (!inMonth(t.date, year, month)) continue
    const key = t.categoryId || '_none'
    map.set(key, (map.get(key) || 0) + t.amount)
    grand += t.amount
  }
  const slices: CategorySlice[] = []
  for (const [key, total] of map) {
    const category =
      categories.find((c) => c.id === key) ||
      ({ id: '_none', name: 'Sin categoría', kind: 'expense', color: '#64748b', icon: 'tag' } as Category)
    slices.push({ category, total, pct: grand ? (total / grand) * 100 : 0 })
  }
  return slices.sort((a, b) => b.total - a.total)
}

/** Saldo usado de una tarjeta = cargos - pagos (transferencias hacia la tarjeta vía cardId en income no aplica) */
export function cardUsed(card: CreditCard, txns: Transaction[]): number {
  let used = 0
  for (const t of txns) {
    if (t.cardId !== card.id) continue
    if (t.type === 'expense') used += t.amount
    else if (t.type === 'income') used -= t.amount // abono/pago a la tarjeta
  }
  return used
}

export interface BudgetProgress {
  budget: Budget
  category?: Category
  spent: number
  pct: number
}

export function budgetProgress(
  budgets: Budget[], categories: Category[], txns: Transaction[], year: number, month: number,
): BudgetProgress[] {
  return budgets.map((b) => {
    let spent = 0
    for (const t of txns) {
      if (t.type !== 'expense') continue
      if (t.categoryId !== b.categoryId) continue
      if (!inMonth(t.date, year, month)) continue
      spent += t.amount
    }
    return {
      budget: b,
      category: categories.find((c) => c.id === b.categoryId),
      spent,
      pct: b.amount ? Math.min((spent / b.amount) * 100, 999) : 0,
    }
  })
}

export function monthTransactions(txns: Transaction[], year: number, month: number): Transaction[] {
  return txns
    .filter((t) => inMonth(t.date, year, month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
}
