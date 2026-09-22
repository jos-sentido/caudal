// Puente entre el store y la capa de sincronización (evita dependencias circulares).
// sync.ts rellena estas funciones tras el login; el store las llama en cada mutación.

export type Collname = 'accounts' | 'cards' | 'categories' | 'transactions' | 'recurrings' | 'budgets' | 'reminders'

interface CloudBridge {
  active: boolean
  put: (col: Collname, id: string, data: unknown) => void
  del: (col: Collname, id: string) => void
  putSettings: (settings: unknown) => void
  replaceAll: (data: Record<string, unknown[]>) => void
}

export const cloud: CloudBridge = {
  active: false,
  put: () => {},
  del: () => {},
  putSettings: () => {},
  replaceAll: () => {},
}
