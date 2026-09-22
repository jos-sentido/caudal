import { useMemo, useState } from 'react'
import { Plus, Wallet2, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { MonthNav } from '../components/MonthNav'
import { IconBubble, Sheet, Field, inputCls, Btn, EmptyState } from '../components/ui'
import { money } from '../lib/format'
import { budgetProgress } from '../store/selectors'

type BudgetEdit = 'new' | { categoryId: string; amount: number }

export function Budgets() {
  const s = useStore()
  const hide = s.settings.hideBalances
  const [editing, setEditing] = useState<BudgetEdit | null>(null)

  const rows = useMemo(
    () => budgetProgress(s.budgets, s.categories, s.transactions, s.year, s.month),
    [s.budgets, s.categories, s.transactions, s.year, s.month],
  )

  const totalBudget = rows.reduce((a, b) => a + b.budget.amount, 0)
  const totalSpent = rows.reduce((a, b) => a + b.spent, 0)
  const totalPct = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  return (
    <div>
      <div className="sticky top-0 z-30 bg-ink/95 backdrop-blur-md safe-t">
        <div className="flex items-center px-4 h-14 gap-2">
          <h1 className="text-lg font-bold flex-1">Presupuestos</h1>
          <button onClick={() => setEditing('new')} className="w-9 h-9 grid place-items-center rounded-full bg-brand text-white">
            <Plus size={19} />
          </button>
        </div>
        <MonthNav compact />
      </div>

      <div className="px-4 pt-3">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Wallet2 size={40} />}
            title="Sin presupuestos"
            hint="Define un límite mensual por categoría y controla cuánto llevas gastado."
            action={<Btn onClick={() => setEditing('new')}>Crear presupuesto</Btn>}
          />
        ) : (
          <>
            <div className="bg-surface rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-muted">Total gastado</span>
                <span className="font-bold">{money(totalSpent, { hide })} <span className="text-muted font-normal">/ {money(totalBudget, { hide })}</span></span>
              </div>
              <div className="h-2.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${totalPct}%`, background: totalPct >= 100 ? 'var(--color-expense)' : 'var(--color-brand)' }} />
              </div>
              <div className="text-xs text-muted mt-2">Disponible {money(Math.max(totalBudget - totalSpent, 0), { hide })}</div>
            </div>

            <div className="space-y-3">
              {rows.map((b) => {
                const over = b.pct >= 100
                const remaining = b.budget.amount - b.spent
                return (
                  <BudgetItem
                    key={b.budget.id}
                    b={b}
                    over={over}
                    remaining={remaining}
                    hide={hide}
                    onEdit={() => setEditing({ categoryId: b.budget.categoryId, amount: b.budget.amount })}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>

      {editing && <BudgetModal editing={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function BudgetItem({ b, over, remaining, hide, onEdit }: any) {
  const s = useStore()
  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-2.5">
        <button onClick={onEdit} className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity">
          <IconBubble color={b.category?.color ?? '#64748b'} icon={b.category?.icon} size={38} iconSize={17} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{b.category?.name ?? 'Categoría'}</div>
            <div className="text-xs text-muted">
              {over ? <span className="text-expense">Excedido {money(-remaining, { hide })}</span> : `Disponible ${money(remaining, { hide })}`}
            </div>
          </div>
        </button>
        <button onClick={() => s.deleteBudget(b.budget.id)} className="text-faint hover:text-expense shrink-0 p-1">
          <Trash2 size={16} />
        </button>
      </div>
      <button onClick={onEdit} className="block w-full">
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(b.pct, 100)}%`, background: over ? 'var(--color-expense)' : b.category?.color }} />
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-muted">{money(b.spent, { hide })}</span>
          <span className="font-medium">{money(b.budget.amount, { hide })}</span>
        </div>
      </button>
    </div>
  )
}

function BudgetModal({ editing, onClose }: { editing: BudgetEdit; onClose: () => void }) {
  const s = useStore()
  const isNew = editing === 'new'
  const editCat = !isNew ? s.categories.find((c) => c.id === editing.categoryId) : undefined
  const withoutBudget = s.categories.filter((c) => c.kind === 'expense' && !s.budgets.some((b) => b.categoryId === c.id))
  const budget = !isNew ? s.budgets.find((b) => b.categoryId === editing.categoryId) : undefined

  const [categoryId, setCategoryId] = useState(isNew ? (withoutBudget[0]?.id ?? '') : editing.categoryId)
  const [amount, setAmount] = useState(isNew ? '' : String(editing.amount))

  const save = () => {
    const amt = parseFloat(amount) || 0
    if (!categoryId || amt <= 0) return
    s.setBudget(categoryId, amt)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? 'Nuevo presupuesto' : 'Editar presupuesto'}
      footer={
        <div className="flex gap-3">
          {!isNew && budget && (
            <button
              onClick={() => { s.deleteBudget(budget.id); onClose() }}
              className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0"
            >
              <Trash2 size={18} />
            </button>
          )}
          <Btn onClick={save} disabled={!categoryId || !amount}>{isNew ? 'Guardar' : 'Guardar cambios'}</Btn>
        </div>
      }
    >
      {isNew ? (
        <Field label="Categoría">
          <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {withoutBudget.length === 0 && <option value="">Todas ya tienen presupuesto</option>}
            {withoutBudget.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      ) : (
        <div className="flex items-center gap-3 py-2 mb-2">
          <IconBubble color={editCat?.color ?? '#64748b'} icon={editCat?.icon} size={44} iconSize={20} />
          <div className="font-semibold text-lg">{editCat?.name ?? 'Categoría'}</div>
        </div>
      )}
      <Field label="Límite mensual">
        <input className={inputCls} inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" />
      </Field>
      <div className="pb-2" />
    </Sheet>
  )
}
