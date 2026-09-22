import { createContext, useContext, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, ListChecks, Wallet2, MoreHorizontal, Plus, X, TrendingUp, TrendingDown, ArrowLeftRight, CreditCard } from 'lucide-react'
import clsx from 'clsx'
import { TransactionModal, type TxDraft } from './TransactionModal'
import type { TxType } from '../lib/types'

interface TxModalCtx {
  openTx: (draft?: TxDraft) => void
}
const Ctx = createContext<TxModalCtx>({ openTx: () => {} })
export const useTxModal = () => useContext(Ctx)

export function AppShell() {
  const [draft, setDraft] = useState<TxDraft | null>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const navigate = useNavigate()

  const openTx = (d?: TxDraft) => setDraft(d ?? { type: 'expense' })

  const quick = (type: TxType) => {
    setFabOpen(false)
    setDraft({ type })
  }

  return (
    <Ctx.Provider value={{ openTx }}>
      <div className="min-h-full max-w-md mx-auto relative pb-24">
        <Outlet />
      </div>

      {/* FAB quick actions */}
      {fabOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fade" onClick={() => setFabOpen(false)}>
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-md px-6">
            <div className="grid grid-cols-2 gap-3">
              <QuickAction color="var(--color-expense)" icon={<TrendingDown size={22} />} label="Gasto" onClick={() => quick('expense')} />
              <QuickAction color="var(--color-income)" icon={<TrendingUp size={22} />} label="Ingreso" onClick={() => quick('income')} />
              <QuickAction color="var(--color-brand)" icon={<ArrowLeftRight size={22} />} label="Transferencia" onClick={() => quick('transfer')} />
              <QuickAction color="#3ba6ff" icon={<CreditCard size={22} />} label="Tarjeta" onClick={() => { setFabOpen(false); navigate('/tarjetas') }} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40">
        <div className="max-w-md mx-auto">
          <div className="mx-3 mb-3 rounded-2xl bg-ink-2/95 backdrop-blur-xl border border-line grid grid-cols-5 items-center h-16 safe-b relative">
            <Tab to="/" icon={<LayoutGrid size={21} />} label="Inicio" />
            <Tab to="/movimientos" icon={<ListChecks size={21} />} label="Movim." />
            <div className="relative">
              <button
                onClick={() => setFabOpen((v) => !v)}
                className="absolute left-1/2 -translate-x-1/2 -top-7 w-14 h-14 rounded-full bg-brand grid place-items-center shadow-lg shadow-brand/40 transition-transform active:scale-95"
              >
                {fabOpen ? <X size={26} className="text-white" /> : <Plus size={26} className="text-white" />}
              </button>
            </div>
            <Tab to="/presupuestos" icon={<Wallet2 size={21} />} label="Presup." />
            <Tab to="/mas" icon={<MoreHorizontal size={21} />} label="Más" />
          </div>
        </div>
      </nav>

      <TransactionModal draft={draft} onClose={() => setDraft(null)} />
    </Ctx.Provider>
  )
}

function Tab({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        clsx('flex flex-col items-center gap-0.5 py-2 transition-colors', isActive ? 'text-brand-soft' : 'text-faint')
      }
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  )
}

function QuickAction({ color, icon, label, onClick }: { color: string; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 bg-surface/90 border border-line rounded-2xl p-3.5 active:scale-95 transition-transform">
      <div className="w-11 h-11 rounded-full grid place-items-center text-white shrink-0" style={{ background: color }}>
        {icon}
      </div>
      <span className="font-semibold text-[15px]">{label}</span>
    </button>
  )
}
