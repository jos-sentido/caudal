import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Account, Budget, Category, CreditCard, Recurring, Transaction, Settings,
} from '../lib/types'
import { uid } from '../lib/format'
import { SEED, emptyData } from './seed'

interface State {
  accounts: Account[]
  cards: CreditCard[]
  categories: Category[]
  transactions: Transaction[]
  recurrings: Recurring[]
  budgets: Budget[]
  settings: Settings

  // UI state (no persistido salvo mes)
  year: number
  month: number // 0-11

  setPeriod: (year: number, month: number) => void
  toggleHide: () => void

  // Transactions
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  toggleConfirmed: (id: string) => void

  // Accounts
  addAccount: (a: Omit<Account, 'id'>) => void
  updateAccount: (id: string, patch: Partial<Account>) => void
  deleteAccount: (id: string) => void

  // Cards
  addCard: (c: Omit<CreditCard, 'id'>) => void
  updateCard: (id: string, patch: Partial<CreditCard>) => void
  deleteCard: (id: string) => void

  // Categories
  addCategory: (c: Omit<Category, 'id'>) => void
  updateCategory: (id: string, patch: Partial<Category>) => void
  deleteCategory: (id: string) => void

  // Budgets
  setBudget: (categoryId: string, amount: number) => void
  deleteBudget: (id: string) => void

  // Recurring
  addRecurring: (r: Omit<Recurring, 'id'>) => void
  updateRecurring: (id: string, patch: Partial<Recurring>) => void
  deleteRecurring: (id: string) => void

  // Data mgmt
  resetSeed: () => void
  clearAll: () => void
  importData: (data: Partial<State>) => void
}

const now = new Date()

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...SEED,
      year: now.getFullYear(),
      month: now.getMonth(),

      setPeriod: (year, month) => set({ year, month }),
      toggleHide: () =>
        set((s) => ({ settings: { ...s.settings, hideBalances: !s.settings.hideBalances } })),

      addTransaction: (t) =>
        set((s) => ({ transactions: [{ ...t, id: uid(), createdAt: Date.now() }, ...s.transactions] })),
      updateTransaction: (id, patch) =>
        set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      toggleConfirmed: (id) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, confirmed: !t.confirmed } : t)),
        })),

      addAccount: (a) => set((s) => ({ accounts: [...s.accounts, { ...a, id: uid() }] })),
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
        })),

      addCard: (c) => set((s) => ({ cards: [...s.cards, { ...c, id: uid() }] })),
      updateCard: (id, patch) =>
        set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCard: (id) =>
        set((s) => ({
          cards: s.cards.filter((c) => c.id !== id),
          transactions: s.transactions.filter((t) => t.cardId !== id),
        })),

      addCategory: (c) => set((s) => ({ categories: [...s.categories, { ...c, id: uid() }] })),
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      setBudget: (categoryId, amount) =>
        set((s) => {
          const existing = s.budgets.find((b) => b.categoryId === categoryId)
          if (existing) {
            return { budgets: s.budgets.map((b) => (b.categoryId === categoryId ? { ...b, amount } : b)) }
          }
          return { budgets: [...s.budgets, { id: uid(), categoryId, amount }] }
        }),
      deleteBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      addRecurring: (r) => set((s) => ({ recurrings: [...s.recurrings, { ...r, id: uid() }] })),
      updateRecurring: (id, patch) =>
        set((s) => ({ recurrings: s.recurrings.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecurring: (id) => set((s) => ({ recurrings: s.recurrings.filter((r) => r.id !== id) })),

      resetSeed: () => set({ ...SEED }),
      clearAll: () => set({ ...emptyData() }),
      importData: (data) => set((s) => ({ ...s, ...data })),
    }),
    {
      name: 'caudal-store-v1',
      partialize: (s) => ({
        accounts: s.accounts,
        cards: s.cards,
        categories: s.categories,
        transactions: s.transactions,
        recurrings: s.recurrings,
        budgets: s.budgets,
        settings: s.settings,
      }),
    },
  ),
)
