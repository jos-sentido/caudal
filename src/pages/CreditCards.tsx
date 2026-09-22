import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, CreditCard as CardIcon, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Btn, EmptyState, TopBar } from '../components/ui'
import { CardModal } from '../components/CardModal'
import { money } from '../lib/format'
import { cardUsed } from '../store/selectors'

export function CreditCards() {
  const s = useStore()
  const nav = useNavigate()
  const hide = s.settings.hideBalances
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div>
      <TopBar
        title="Tarjetas de crédito"
        back={() => nav(-1)}
        right={
          <button onClick={() => setAddOpen(true)} className="w-9 h-9 grid place-items-center rounded-full bg-brand text-white">
            <Plus size={19} />
          </button>
        }
      />
      <div className="px-4">
        {s.cards.length === 0 ? (
          <EmptyState
            icon={<CardIcon size={40} />}
            title="Sin tarjetas registradas"
            hint="Registra tus tarjetas para controlar límite, corte y pago."
            action={<Btn onClick={() => setAddOpen(true)}>Agregar tarjeta</Btn>}
          />
        ) : (
          <div className="space-y-3">
            {s.cards.map((c) => {
              const used = cardUsed(c, s.transactions)
              const pct = c.limit ? Math.min((used / c.limit) * 100, 100) : 0
              return (
                <Link key={c.id} to={`/tarjeta/${c.id}`} className="block rounded-2xl p-5 text-white relative overflow-hidden active:opacity-90 transition-opacity" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}bb 55%, #111)` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm opacity-80">{c.name}</div>
                      <div className="text-2xl font-bold mt-1">{money(used, { hide })}</div>
                      <div className="text-xs opacity-80 mt-0.5">de {money(c.limit, { hide })}</div>
                    </div>
                    <ChevronRight size={20} className="opacity-70" />
                  </div>
                  <div className="h-1.5 bg-white/25 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs opacity-85 mt-3">
                    <span>Disponible {money(c.limit - used, { hide })}</span>
                    <span>Corte {c.closingDay} · Pago {c.dueDay}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {addOpen && <CardModal card={null} onClose={() => setAddOpen(false)} />}
    </div>
  )
}
