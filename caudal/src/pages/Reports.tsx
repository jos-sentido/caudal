import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useStore } from '../store/useStore'
import { MonthNav } from '../components/MonthNav'
import { IconBubble, TopBar } from '../components/ui'
import { money, monthShort } from '../lib/format'
import { monthTotals, expenseByCategory } from '../store/selectors'

export function Reports() {
  const s = useStore()
  const nav = useNavigate()
  const hide = s.settings.hideBalances

  const bars = useMemo(() => {
    const arr: { label: string; income: number; expense: number; net: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(s.year, s.month - i, 1)
      const t = monthTotals(s.transactions, d.getFullYear(), d.getMonth())
      arr.push({ label: monthShort(d.getMonth()), income: t.income, expense: t.expense, net: t.balance })
    }
    return arr
  }, [s.transactions, s.year, s.month])

  const slices = useMemo(
    () => expenseByCategory(s.transactions, s.categories, s.year, s.month),
    [s.transactions, s.categories, s.year, s.month],
  )
  const max = Math.max(...slices.map((x) => x.total), 1)
  const cur = monthTotals(s.transactions, s.year, s.month)

  return (
    <div>
      <TopBar title="Reportes" back={() => nav(-1)} />
      <div className="px-4">
        <MonthNav compact />

        {/* Flujo 6 meses */}
        <div className="bg-surface rounded-2xl p-4 mt-3">
          <div className="text-sm font-semibold mb-3">Ingresos vs Gastos · 6 meses</div>
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={bars} barCategoryGap={10} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#9298a3', fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#24242d', border: '1px solid #2e2e38', borderRadius: 12, fontSize: 12 }}
                  formatter={((v: number, n: string) => [money(v), n === 'income' ? 'Ingresos' : 'Gastos']) as any}
                  labelStyle={{ color: '#9298a3' }}
                />
                <Bar dataKey="income" radius={[4, 4, 0, 0]} fill="#37c978" />
                <Bar dataKey="expense" radius={[4, 4, 0, 0]} fill="#f0574f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-5 text-xs mt-2">
            <Legend color="var(--color-income)" label="Ingresos" />
            <Legend color="var(--color-expense)" label="Gastos" />
          </div>
        </div>

        {/* Resumen del mes */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat label="Ingresos" value={money(cur.income, { hide })} color="var(--color-income)" />
          <Stat label="Gastos" value={money(cur.expense, { hide })} color="var(--color-expense)" />
          <Stat label="Balance" value={money(cur.balance, { hide })} color={cur.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'} />
        </div>

        {/* Ranking categorías */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-muted px-1 mb-2">Gastos por categoría</div>
          {slices.length === 0 ? (
            <div className="bg-surface rounded-2xl py-8 text-center text-muted text-sm">Sin gastos este mes</div>
          ) : (
            <div className="space-y-2.5">
              {slices.map((x) => (
                <div key={x.category.id} className="bg-surface rounded-2xl p-3 flex items-center gap-3">
                  <IconBubble color={x.category.color} icon={x.category.icon} size={38} iconSize={17} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium truncate">{x.category.name}</span>
                      <span className="font-semibold ml-2">{money(x.total, { hide })}</span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(x.total / max) * 100}%`, background: x.category.color }} />
                    </div>
                  </div>
                  <span className="text-xs text-muted w-9 text-right">{x.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface rounded-2xl p-3 text-center">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-bold text-sm mt-0.5 truncate" style={{ color }}>{value}</div>
    </div>
  )
}
