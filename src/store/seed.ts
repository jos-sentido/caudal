import type { AppData, Account, Category, Transaction, Budget, Recurring, CreditCard } from '../lib/types'

// Datos de ejemplo basados en la estructura real (puedes borrarlos desde Ajustes)

const accounts: Account[] = [
  { id: 'acc_efvo', name: 'EFVO', kind: 'cash', initialBalance: 30000, color: '#a3d13a', icon: 'cash', order: 0 },
  { id: 'acc_mdo', name: 'MDO PAGO', kind: 'checking', initialBalance: 0, color: '#3ba6ff', icon: 'bank', order: 1 },
  { id: 'acc_bajio', name: 'TDD Bajío', kind: 'checking', initialBalance: 55.4, color: '#f0574f', icon: 'card', order: 2 },
]

const cards: CreditCard[] = [
  { id: 'card_bbva', name: 'BBVA Oro', limit: 45000, closingDay: 15, dueDay: 3, color: '#4f7cff', icon: 'card' },
]

const expenseCats: Category[] = [
  { id: 'c_hogar', name: 'Hogar', kind: 'expense', color: '#111318', icon: 'home' },
  { id: 'c_transporte', name: 'Transporte', kind: 'expense', color: '#ff8a3d', icon: 'car' },
  { id: 'c_super', name: 'Super', kind: 'expense', color: '#3ba6ff', icon: 'cart' },
  { id: 'c_comida', name: 'Comida', kind: 'expense', color: '#f0574f', icon: 'utensils' },
  { id: 'c_celular', name: 'Celular', kind: 'expense', color: '#64748b', icon: 'smartphone' },
  { id: 'c_creditos', name: 'Créditos', kind: 'expense', color: '#f43f6e', icon: 'dollar' },
  { id: 'c_ejercicio', name: 'Ejercicio', kind: 'expense', color: '#f0574f', icon: 'dumbbell' },
  { id: 'c_gadgets', name: 'Gadgets', kind: 'expense', color: '#12b981', icon: 'monitor' },
  { id: 'c_diving', name: 'Diving', kind: 'expense', color: '#0fb9c9', icon: 'waves' },
  { id: 'c_inevap', name: 'Inevap', kind: 'expense', color: '#4f7cff', icon: 'education' },
  { id: 'c_inevitables', name: 'Inevitables', kind: 'expense', color: '#9ca3af', icon: 'sparkles' },
  { id: 'c_inversiones', name: 'Inversiones', kind: 'expense', color: '#37c978', icon: 'invest' },
  { id: 'c_mudanza', name: 'Mudanza', kind: 'expense', color: '#a855f7', icon: 'truck' },
  { id: 'c_suscrip', name: 'Suscripciones', kind: 'expense', color: '#7c5cff', icon: 'film' },
  { id: 'c_salud', name: 'Salud', kind: 'expense', color: '#ec4899', icon: 'medical' },
  { id: 'c_reajuste', name: 'Reajuste', kind: 'expense', color: '#f0574f', icon: 'tools' },
  { id: 'c_varios', name: 'Varios', kind: 'expense', color: '#64748b', icon: 'package' },
]

const incomeCats: Category[] = [
  { id: 'i_sentido', name: 'Sentido', kind: 'income', color: '#a3d13a', icon: 'monitor' },
  { id: 'i_qeb', name: 'QEB OOH', kind: 'income', color: '#d946ef', icon: 'building' },
  { id: 'i_cashback', name: 'Cashback', kind: 'income', color: '#a855f7', icon: 'invest' },
  { id: 'i_regalos', name: 'Donación/Regalos', kind: 'income', color: '#ffd400', icon: 'gift' },
  { id: 'i_prestamos', name: 'Préstamos', kind: 'income', color: '#a3d13a', icon: 'coins' },
  { id: 'i_pagoprest', name: 'Pago préstamos', kind: 'income', color: '#3ba6ff', icon: 'book' },
  { id: 'i_pagosvarios', name: 'Pagos Varios', kind: 'income', color: '#9ca3af', icon: 'receipt' },
  { id: 'i_inevap', name: 'Inevap', kind: 'income', color: '#3ba6ff', icon: 'education' },
]

const M = '2026-09'

const transactions: Transaction[] = [
  // Ingresos (total 65,000)
  tx('t1', 'income', 30000, `${M}-02`, 'Ut ago', 'i_sentido', 'acc_efvo'),
  tx('t2', 'income', 15000, `${M}-01`, 'Nómina', 'i_sentido', 'acc_mdo'),
  tx('t3', 'income', 20000, `${M}-01`, 'Nómina', 'i_qeb', 'acc_mdo'),
  // Gastos (total 44,331)
  tx('t4', 'expense', 30000, `${M}-04`, 'Renta sep 2026', 'c_hogar', 'acc_mdo'),
  tx('t5', 'expense', 7500, `${M}-03`, 'Servicio', 'c_transporte', 'acc_efvo'),
  tx('t6', 'expense', 998, `${M}-04`, 'Carnicería', 'c_super', 'acc_mdo'),
  tx('t7', 'expense', 235, `${M}-04`, 'Ajuste de saldo', 'c_reajuste', 'acc_mdo'),
  tx('t8', 'expense', 2207, `${M}-06`, 'Reajuste*', 'c_reajuste', 'acc_efvo'),
  tx('t9', 'expense', 3391, `${M}-21`, 'Varios', 'c_varios', 'acc_mdo'),
  // Gasto con tarjeta de crédito
  card_tx('t10', 4268.19, `${M}-12`, 'Amazon', 'c_gadgets', 'card_bbva'),
  card_tx('t11', 890, `${M}-18`, 'Restaurante', 'c_comida', 'card_bbva'),
]

const budgets: Budget[] = [
  { id: 'b1', categoryId: 'c_hogar', amount: 32000 },
  { id: 'b2', categoryId: 'c_transporte', amount: 8000 },
  { id: 'b3', categoryId: 'c_super', amount: 4000 },
  { id: 'b4', categoryId: 'c_comida', amount: 5000 },
]

const recurrings: Recurring[] = [
  { id: 'r1', type: 'expense', amount: 30000, description: 'Renta', categoryId: 'c_hogar', accountId: 'acc_mdo', frequency: 'monthly', dayOfMonth: 4, active: true, lastRun: `${M}-04` },
  { id: 'r2', type: 'income', amount: 15000, description: 'Nómina Sentido', categoryId: 'i_sentido', accountId: 'acc_mdo', frequency: 'monthly', dayOfMonth: 1, active: true, lastRun: `${M}-01` },
  { id: 'r3', type: 'expense', amount: 299, description: 'Spotify', categoryId: 'c_suscrip', accountId: 'acc_mdo', frequency: 'monthly', dayOfMonth: 10, active: true, lastRun: null },
]

function tx(
  id: string, type: 'income' | 'expense', amount: number, date: string,
  description: string, categoryId: string, accountId: string,
): Transaction {
  return { id, type, amount, date, description, categoryId, accountId, confirmed: true, createdAt: Date.now() }
}

function card_tx(
  id: string, amount: number, date: string, description: string, categoryId: string, cardId: string,
): Transaction {
  return { id, type: 'expense', amount, date, description, categoryId, cardId, accountId: null, confirmed: true, createdAt: Date.now() }
}

export const SEED: AppData = {
  accounts,
  cards,
  categories: [...expenseCats, ...incomeCats],
  transactions,
  recurrings,
  budgets,
  settings: { currency: 'MXN', locale: 'es-MX', hideBalances: false, seeded: true },
}

export function emptyData(): AppData {
  return {
    accounts: [],
    cards: [],
    categories: [...expenseCats, ...incomeCats].map((c) => ({ ...c })),
    transactions: [],
    recurrings: [],
    budgets: [],
    settings: { currency: 'MXN', locale: 'es-MX', hideBalances: false, seeded: true },
  }
}
