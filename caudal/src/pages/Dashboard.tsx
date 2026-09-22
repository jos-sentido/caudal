import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Eye, EyeOff, TrendingUp, TrendingDown, Plus, ChevronRight, CreditCard, UserCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { MonthNav } from '../components/MonthNav'
import { IconBubble } from '../components/ui'
import { money, moneyShort } from '../lib/format'
import {
  accountCurrent, totalCurrentBalance, monthTotals, expenseByCategory, cardUsed, budgetProgress,
} from '../store/selectors'

export function Dashboard() {
  const s = useStore()
  const hide = s.settings.hideBalances

  const totals = useMemo(() => monthTotals(s.transactions, s.year, s.month), [s.transactions, s.year, s.month])
  const totalBal = useMemo(() => totalCurrentBalance(s.accounts, s.transactions), [s.accounts, s.transactions])
  const slices = useMemo(
    () => expenseByCategory(s.transactions, s.categories, s.year, s.month),
    [s.transactions, s.categories, s.year, s.month],
  )
  const budgets = useMemo(
    () => budgetProgress(s.budgets, s.categories, s.transactions, s.year, s.month),
    [s.budgets, s.categories, s.transactions, s.year, s.month],
  )

  const topSlices = slices.slice(0, 4)
  const otherTotal = slices.slice(4).reduce((a, b) => a + b.total, 0)
  const donutData = [
    ...topSlices.map((x) => ({ name: x.category.name, value: x.total, color: x.category.color })),
    ...(otherTotal > 0 ? [{ name: 'Otros', value: otherTotal, color: '#3a3a44' }] : []),
  ]

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 safe-t">
        <div className="flex items-center justify-between mb-2">
          <Link to="/mas" className="text-muted"><UserCircle2 size={30} strokeWidth={1.5} /></Link>
          <div className="flex-1"><MonthNav /></div>
          <div className="w-[30px]" />
        </div>

        <div className="text-center mt-3">
          <div className="text-sm text-muted">Balance de cuentas</div>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="text-4xl font-bold tracking-tight">{money(totalBal, { hide })}</span>
          </div>
          <button onClick={s.toggleHide} className="text-muted mt-1.5 inline-grid place-items-center">
            {hide ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Ingresos / Gastos */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-surface rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-income/15 grid place-items-center text-income shrink-0">
              <TrendingUp size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted leading-tight">Ingresos</div>
              <div className="font-bold text-income text-[15px] leading-tight truncate">{money(totals.income, { hide })}</div>
            </div>
          </div>
          <div className="bg-surface rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-expense/15 grid place-items-center text-expense shrink-0">
              <TrendingDown size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted leading-tight">Gastos</div>
              <div className="font-bold text-expense text-[15px] leading-tight truncate">{money(totals.expense, { hide })}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* Cuentas */}
        <Section title="Cuentas" to="/cuentas">
          <div className="bg-surface rounded-2xl p-2 divide-y divide-line/60">
            {s.accounts.length === 0 && <AddRow to="/cuentas" label="Agregar cuenta" />}
            {s.accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-2 py-3">
                <IconBubble color={a.color} icon={a.icon} size={40} iconSize={18} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[15px] truncate">{a.name}</div>
                </div>
                <div className="font-semibold" style={{ color: accountCurrent(a, s.transactions) < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                  {money(accountCurrent(a, s.transactions), { hide })}
                </div>
              </div>
            ))}
            {s.accounts.length > 0 && (
              <div className="flex items-center justify-between px-2 py-3">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{money(totalBal, { hide })}</span>
              </div>
            )}
          </div>
        </Section>

        {/* Tarjetas de crédito */}
        <Section title="Tarjetas de crédito" to="/tarjetas">
          {s.cards.length === 0 ? (
            <Link to="/tarjetas" className="bg-surface rounded-2xl p-6 flex flex-col items-center text-center">
              <CreditCard size={30} className="text-faint mb-2" />
              <div className="text-sm text-muted">Aún no tienes tarjetas registradas</div>
              <div className="mt-3 px-5 py-2.5 rounded-full bg-brand text-white text-sm font-semibold">Agregar tarjeta</div>
            </Link>
          ) : (
            <div className="bg-surface rounded-2xl p-2 divide-y divide-line/60">
              {s.cards.map((c) => {
                const used = cardUsed(c, s.transactions)
                const pct = c.limit ? Math.min((used / c.limit) * 100, 100) : 0
                return (
                  <div key={c.id} className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <IconBubble color={c.color} icon="card" size={40} iconSize={18} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[15px] truncate">{c.name}</div>
                        <div className="text-xs text-muted">Disponible {money(c.limit - used, { hide })}</div>
                      </div>
                      <div className="font-semibold text-expense">{money(used, { hide })}</div>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full mt-2.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Gastos por categoría */}
        {slices.length > 0 && (
          <Section title="Gastos por categoría" to="/reportes">
            <div className="bg-surface rounded-2xl p-4 flex items-center gap-4">
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={38} outerRadius={54} paddingAngle={2} stroke="none">
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-[10px] text-muted">Total</div>
                    <div className="text-xs font-bold">{moneyShort(totals.expense, hide)}</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {topSlices.map((x) => (
                  <div key={x.category.id} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: x.category.color }} />
                    <span className="flex-1 truncate text-muted">{x.category.name}</span>
                    <span className="font-medium">{money(x.total, { hide })}</span>
                  </div>
                ))}
                {otherTotal > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3a3a44] shrink-0" />
                    <span className="flex-1 truncate text-muted">Otros…</span>
                    <span className="font-medium">{money(otherTotal, { hide })}</span>
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Presupuestos */}
        {budgets.length > 0 && (
          <Section title="Presupuestos" to="/presupuestos">
            <div className="bg-surface rounded-2xl p-4 space-y-3.5">
              {budgets.slice(0, 4).map((b) => {
                const over = b.pct >= 100
                return (
                  <div key={b.budget.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.category?.color }} />
                        <span className="font-medium">{b.category?.name}</span>
                      </span>
                      <span className="text-muted">{money(b.spent, { hide })} / {money(b.budget.amount, { hide })}</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(b.pct, 100)}%`, background: over ? 'var(--color-expense)' : b.category?.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, to, children }: { title: string; to?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-[15px] font-semibold text-muted">{title}</h2>
        {to && (
          <Link to={to} className="text-faint hover:text-white">
            <ChevronRight size={18} />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

function AddRow({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-2 py-3 text-brand-soft">
      <div className="w-10 h-10 rounded-full border border-dashed border-line grid place-items-center">
        <Plus size={18} />
      </div>
      <span className="font-medium">{label}</span>
    </Link>
  )
}
