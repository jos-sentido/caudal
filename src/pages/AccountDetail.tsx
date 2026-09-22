import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, SlidersHorizontal, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { IconBubble, Sheet, Field, Btn, Segmented, TopBar } from '../components/ui'
import { AccountModal, ACCOUNT_KINDS } from '../components/AccountModal'
import { TxRow } from '../components/TxRow'
import { useTxModal } from '../components/AppShell'
import { money, todayISO } from '../lib/format'
import { accountCurrent, accountProjected } from '../store/selectors'

export function AccountDetail() {
  const s = useStore()
  const nav = useNavigate()
  const { id } = useParams()
  const { openTx } = useTxModal()
  const hide = s.settings.hideBalances

  const acc = s.accounts.find((a) => a.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)

  const stats = useMemo(() => {
    let expenses = 0, incomes = 0, transfers = 0
    const list = s.transactions.filter((t) => {
      const mine = t.accountId === id || t.toAccountId === id
      if (!mine) return false
      if (t.type === 'expense') expenses++
      else if (t.type === 'income') incomes++
      else transfers++
      return true
    })
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
    return { expenses, incomes, transfers, list }
  }, [s.transactions, id])

  if (!acc) {
    return (
      <div>
        <TopBar title="Cuenta" back={() => nav('/cuentas')} />
        <div className="px-4 py-10 text-center text-muted">Esta cuenta ya no existe.</div>
      </div>
    )
  }

  const cur = accountCurrent(acc, s.transactions)
  const proj = accountProjected(acc, s.transactions, s.year, s.month)

  return (
    <div>
      <TopBar
        title="Detalle de cuenta"
        back={() => nav(-1)}
        right={
          <button onClick={() => setEditOpen(true)} className="w-9 h-9 grid place-items-center rounded-full text-muted hover:text-white">
            <Pencil size={18} />
          </button>
        }
      />

      <div className="px-4">
        {/* Encabezado saldo */}
        <div className="bg-surface rounded-2xl p-5 text-center">
          <div className="flex justify-center mb-2"><IconBubble color={acc.color} icon={acc.icon} size={52} iconSize={24} /></div>
          <div className="font-semibold text-lg">{acc.name}</div>
          <div className="text-xs text-muted mb-3">Saldo actual</div>
          <div className="text-3xl font-bold" style={{ color: cur < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
            {money(cur, { hide })}
          </div>
          <button
            onClick={() => setAdjustOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand text-white font-semibold text-sm"
          >
            <SlidersHorizontal size={16} /> Ajustar saldo
          </button>
        </div>

        {/* Info */}
        <div className="bg-surface rounded-2xl p-4 mt-3 grid grid-cols-2 gap-y-4 gap-x-3">
          <Info label="Tipo" value={ACCOUNT_KINDS.find((k) => k.value === acc.kind)?.label ?? '—'} />
          <Info label="Saldo inicial" value={money(acc.initialBalance, { hide })} />
          <Info label="Saldo proyectado" value={money(proj, { hide })} />
          <Info label="Movimientos" value={String(stats.expenses + stats.incomes + stats.transfers)} />
          <StatChip icon={<TrendingDown size={15} />} color="var(--color-expense)" n={stats.expenses} label="Gastos" />
          <StatChip icon={<TrendingUp size={15} />} color="var(--color-income)" n={stats.incomes} label="Ingresos" />
          <StatChip icon={<ArrowLeftRight size={15} />} color="var(--color-brand-soft)" n={stats.transfers} label="Transfer." />
        </div>

        {/* Movimientos de la cuenta */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-muted px-1 mb-1">Movimientos</div>
          {stats.list.length === 0 ? (
            <div className="bg-surface rounded-2xl py-8 text-center text-muted text-sm">Sin movimientos en esta cuenta</div>
          ) : (
            <div className="bg-surface rounded-2xl px-3 divide-y divide-line/40">
              {stats.list.slice(0, 50).map((t) => (
                <TxRow key={t.id} t={t} hide={hide} onClick={() => openTx({ id: t.id })} />
              ))}
            </div>
          )}
        </div>
      </div>

      {editOpen && <AccountModal account={acc} onClose={() => setEditOpen(false)} onDeleted={() => nav('/cuentas')} />}
      {adjustOpen && <AdjustBalanceModal accountId={acc.id} current={cur} onClose={() => setAdjustOpen(false)} />}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  )
}

function StatChip({ icon, color, n, label }: { icon: React.ReactNode; color: string; n: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: `${color}22`, color }}>{icon}</span>
      <div>
        <div className="font-semibold text-sm leading-tight">{n}</div>
        <div className="text-[11px] text-muted leading-tight">{label}</div>
      </div>
    </div>
  )
}

function AdjustBalanceModal({
  accountId, current, onClose,
}: {
  accountId: string
  current: number
  onClose: () => void
}) {
  const s = useStore()
  const [value, setValue] = useState(current.toFixed(2))
  const [mode, setMode] = useState<'transaction' | 'initial'>('transaction')

  const target = parseFloat(value)
  const diff = Number.isFinite(target) ? target - current : 0
  const valid = Number.isFinite(target) && Math.abs(diff) > 0.001

  const apply = () => {
    if (!valid) return
    if (mode === 'initial') {
      const acc = s.accounts.find((a) => a.id === accountId)
      if (acc) s.updateAccount(accountId, { initialBalance: acc.initialBalance + diff })
    } else {
      const isIncome = diff > 0
      const cat = s.categories.find(
        (c) => c.kind === (isIncome ? 'income' : 'expense') && /ajuste|reajuste/i.test(c.name),
      )
      s.addTransaction({
        type: isIncome ? 'income' : 'expense',
        amount: Math.abs(diff),
        date: todayISO(),
        description: 'Ajuste de saldo',
        categoryId: cat?.id ?? null,
        accountId,
        confirmed: true,
      })
    }
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Ajustar saldo"
      footer={<Btn onClick={apply} disabled={!valid}>Aplicar ajuste</Btn>}
    >
      <div className="text-center py-4">
        <div className="text-sm text-muted mb-1">Nuevo saldo</div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-2xl font-bold text-brand-soft">$</span>
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.-]/g, ''))}
            className="bg-transparent text-3xl font-bold text-center outline-none w-52 text-brand-soft placeholder:text-line"
          />
        </div>
        {valid && (
          <div className="text-sm mt-2" style={{ color: diff > 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
            {diff > 0 ? '+' : '−'}{money(Math.abs(diff))} vs. saldo actual
          </div>
        )}
      </div>

      <Field label="¿Cómo aplicar el ajuste?">
        <Segmented<'transaction' | 'initial'>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'transaction', label: 'Transacción de ajuste' },
            { value: 'initial', label: 'Saldo inicial' },
          ]}
        />
      </Field>
      <p className="text-xs text-muted -mt-2 mb-4 px-1">
        {mode === 'transaction'
          ? 'Crea un movimiento de ajuste por la diferencia (queda en el historial).'
          : 'Modifica el saldo inicial de la cuenta, sin crear ningún movimiento.'}
      </p>
    </Sheet>
  )
}
