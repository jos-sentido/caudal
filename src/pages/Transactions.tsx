import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ListChecks } from 'lucide-react'
import { useStore } from '../store/useStore'
import { MonthNav } from '../components/MonthNav'
import { TxRow } from '../components/TxRow'
import { EmptyState, Segmented } from '../components/ui'
import { useTxModal } from '../components/AppShell'
import { money, dayLabel } from '../lib/format'
import { monthTransactions, monthTotals, totalCurrentBalance } from '../store/selectors'
import type { Transaction, TxType } from '../lib/types'

type Filter = 'all' | TxType

export function Transactions() {
  const s = useStore()
  const { openTx } = useTxModal()
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<Filter>(paramToFilter(params.get('tipo')))
  const [q, setQ] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Sincroniza el filtro cuando se llega con ?tipo= (p. ej. desde los KPIs del inicio)
  useEffect(() => {
    setFilter(paramToFilter(params.get('tipo')))
  }, [params])

  const hide = s.settings.hideBalances
  const totals = useMemo(() => monthTotals(s.transactions, s.year, s.month), [s.transactions, s.year, s.month])
  const totalBal = useMemo(() => totalCurrentBalance(s.accounts, s.transactions), [s.accounts, s.transactions])

  const list = useMemo(() => {
    let items = monthTransactions(s.transactions, s.year, s.month)
    if (filter !== 'all') items = items.filter((t) => t.type === filter)
    if (q.trim()) {
      const term = q.toLowerCase()
      items = items.filter((t) => t.description.toLowerCase().includes(term))
    }
    return items
  }, [s.transactions, s.year, s.month, filter, q])

  const groups = useMemo(() => groupByDay(list), [list])

  return (
    <div>
      <div className="sticky top-0 z-30 bg-ink/95 backdrop-blur-md safe-t">
        <div className="flex items-center px-4 h-14 gap-2">
          <h1 className="text-lg font-bold flex-1">Movimientos</h1>
          <button onClick={() => setShowSearch((v) => !v)} className="w-9 h-9 grid place-items-center rounded-full text-muted hover:text-white">
            <Search size={19} />
          </button>
        </div>
        {showSearch && (
          <div className="px-4 pb-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="w-full bg-surface border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>
        )}
        <MonthNav compact />
        <div className="px-4 pb-2 pt-1">
          <div className="flex bg-surface rounded-xl divide-x divide-line/60 mb-2">
            <div className="flex-1 px-3 py-2.5">
              <div className="text-[11px] text-muted">Balance actual</div>
              <div className="font-bold text-sm" style={{ color: totalBal < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                {money(totalBal, { hide })}
              </div>
            </div>
            <div className="flex-1 px-3 py-2.5">
              <div className="text-[11px] text-muted">Balance del mes</div>
              <div className="font-bold text-sm" style={{ color: totals.balance < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                {money(totals.balance, { sign: totals.balance > 0, hide })}
              </div>
            </div>
          </div>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Todo' },
              { value: 'expense', label: 'Gastos', color: 'var(--color-expense)' },
              { value: 'income', label: 'Ingresos', color: 'var(--color-income)' },
              { value: 'transfer', label: 'Transf.' },
            ]}
          />
        </div>
      </div>

      <div className="px-4 pt-2">
        {groups.length === 0 ? (
          <EmptyState
            icon={<ListChecks size={40} />}
            title="Sin movimientos este mes"
            hint="Toca el botón + para registrar tu primer gasto o ingreso."
          />
        ) : (
          groups.map(([label, items]) => (
            <div key={label} className="mb-4">
              <div className="flex items-center justify-between px-1 mb-0.5">
                <h3 className="text-[13px] font-semibold text-muted">{label}</h3>
                <span className="text-xs text-faint">{money(dayNet(items), { sign: dayNet(items) > 0, hide })}</span>
              </div>
              <div className="bg-surface rounded-2xl px-3 divide-y divide-line/40">
                {items.map((t) => (
                  <TxRow key={t.id} t={t} hide={hide} onClick={() => openTx({ id: t.id })} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function paramToFilter(tipo: string | null): Filter {
  if (tipo === 'income' || tipo === 'expense' || tipo === 'transfer') return tipo
  return 'all'
}

function groupByDay(items: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>()
  for (const t of items) {
    const arr = map.get(t.date) ?? []
    arr.push(t)
    map.set(t.date, arr)
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, arr]) => [dayLabel(date), arr] as [string, Transaction[]])
}

function dayNet(items: Transaction[]): number {
  return items.reduce((sum, t) => {
    if (t.type === 'income') return sum + t.amount
    if (t.type === 'expense') return sum - t.amount
    return sum
  }, 0)
}
