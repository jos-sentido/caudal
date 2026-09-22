import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Wallet2, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { IconBubble, Btn, EmptyState, TopBar } from '../components/ui'
import { AccountModal, ACCOUNT_KINDS } from '../components/AccountModal'
import { money } from '../lib/format'
import { accountCurrent, accountProjected } from '../store/selectors'

export function Accounts() {
  const s = useStore()
  const nav = useNavigate()
  const hide = s.settings.hideBalances
  const [addOpen, setAddOpen] = useState(false)

  const totalCurrent = useMemo(
    () => s.accounts.reduce((a, x) => a + accountCurrent(x, s.transactions), 0),
    [s.accounts, s.transactions],
  )
  const totalProjected = useMemo(
    () => s.accounts.reduce((a, x) => a + accountProjected(x, s.transactions, s.year, s.month), 0),
    [s.accounts, s.transactions, s.year, s.month],
  )

  return (
    <div>
      <TopBar
        title="Cuentas"
        back={() => nav(-1)}
        right={
          <button onClick={() => setAddOpen(true)} className="w-9 h-9 grid place-items-center rounded-full bg-brand text-white">
            <Plus size={19} />
          </button>
        }
      />

      <div className="px-4">
        {s.accounts.length > 0 && (
          <div className="flex bg-surface rounded-2xl divide-x divide-line/60 mb-4">
            <div className="flex-1 px-4 py-3">
              <div className="text-xs text-muted">Balance actual</div>
              <div className="font-bold text-income">{money(totalCurrent, { hide })}</div>
            </div>
            <div className="flex-1 px-4 py-3">
              <div className="text-xs text-muted">Balance proyectado</div>
              <div className="font-bold">{money(totalProjected, { hide })}</div>
            </div>
          </div>
        )}

        {s.accounts.length === 0 ? (
          <EmptyState
            icon={<Wallet2 size={40} />}
            title="Sin cuentas"
            hint="Agrega tus cuentas: efectivo, banco, Mercado Pago…"
            action={<Btn onClick={() => setAddOpen(true)}>Agregar cuenta</Btn>}
          />
        ) : (
          <div className="space-y-3">
            {s.accounts.map((a) => {
              const cur = accountCurrent(a, s.transactions)
              return (
                <Link key={a.id} to={`/cuenta/${a.id}`} className="flex items-center gap-3 bg-surface rounded-2xl p-4 active:opacity-70 transition-opacity">
                  <IconBubble color={a.color} icon={a.icon} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{a.name}</div>
                    <div className="text-xs text-muted">{ACCOUNT_KINDS.find((k) => k.value === a.kind)?.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: cur < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>{money(cur, { hide })}</div>
                  </div>
                  <ChevronRight size={18} className="text-faint" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {addOpen && <AccountModal account={null} onClose={() => setAddOpen(false)} />}
    </div>
  )
}
