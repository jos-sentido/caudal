import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, CreditCard as CardIcon, Pencil } from 'lucide-react'
import { useStore } from '../store/useStore'
import { IconBubble, Sheet, Field, inputCls, Btn, EmptyState, TopBar } from '../components/ui'
import { ColorPicker } from '../components/pickers'
import { TxRow } from '../components/TxRow'
import { useTxModal } from '../components/AppShell'
import { money } from '../lib/format'
import { cardUsed } from '../store/selectors'
import type { CreditCard } from '../lib/types'

export function CreditCards() {
  const s = useStore()
  const nav = useNavigate()
  const { openTx } = useTxModal()
  const hide = s.settings.hideBalances
  const [edit, setEdit] = useState<CreditCard | 'new' | null>(null)

  return (
    <div>
      <TopBar
        title="Tarjetas de crédito"
        back={() => nav(-1)}
        right={
          <button onClick={() => setEdit('new')} className="w-9 h-9 grid place-items-center rounded-full bg-brand text-white">
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
            action={<Btn onClick={() => setEdit('new')}>Agregar tarjeta</Btn>}
          />
        ) : (
          <div className="space-y-5">
            {s.cards.map((c) => {
              const used = cardUsed(c, s.transactions)
              const pct = c.limit ? Math.min((used / c.limit) * 100, 100) : 0
              const charges = s.transactions
                .filter((t) => t.cardId === c.id)
                .sort((a, b) => (a.date < b.date ? 1 : -1))
              return (
                <div key={c.id}>
                  {/* Card visual */}
                  <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}bb 60%, #111)` }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm opacity-80">{c.name}</div>
                        <div className="text-2xl font-bold mt-1">{money(used, { hide })}</div>
                        <div className="text-xs opacity-80 mt-0.5">de {money(c.limit, { hide })}</div>
                      </div>
                      <button onClick={() => setEdit(c)} className="opacity-80 hover:opacity-100">
                        <Pencil size={16} />
                      </button>
                    </div>
                    <div className="h-1.5 bg-white/25 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs opacity-85 mt-3">
                      <span>Disponible {money(c.limit - used, { hide })}</span>
                      <span>Corte {c.closingDay} · Pago {c.dueDay}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Btn variant="soft" onClick={() => openTx({ type: 'expense' })}>Nuevo cargo</Btn>
                  </div>

                  {charges.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-muted px-1 mb-1">Movimientos</div>
                      <div className="bg-surface rounded-2xl px-3 divide-y divide-line/40">
                        {charges.map((t) => (
                          <TxRow key={t.id} t={t} hide={hide} onClick={() => openTx({ id: t.id })} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {edit && <CardModal card={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function CardModal({ card, onClose }: { card: CreditCard | null; onClose: () => void }) {
  const s = useStore()
  const [name, setName] = useState(card?.name ?? '')
  const [limit, setLimit] = useState(card ? String(card.limit) : '')
  const [closingDay, setClosingDay] = useState(card ? String(card.closingDay) : '15')
  const [dueDay, setDueDay] = useState(card ? String(card.dueDay) : '3')
  const [color, setColor] = useState(card?.color ?? '#4f7cff')

  const save = () => {
    const data = {
      name: name.trim(),
      limit: parseFloat(limit) || 0,
      closingDay: clampDay(closingDay),
      dueDay: clampDay(dueDay),
      color,
      icon: 'card',
    }
    if (!data.name) return
    if (card) s.updateCard(card.id, data)
    else s.addCard(data)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={card ? 'Editar tarjeta' : 'Nueva tarjeta'}
      footer={
        <div className="flex gap-3">
          {card && (
            <button onClick={() => { s.deleteCard(card.id); onClose() }} className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0">
              <Trash2 size={18} />
            </button>
          )}
          <Btn onClick={save} disabled={!name.trim()}>{card ? 'Guardar' : 'Crear tarjeta'}</Btn>
        </div>
      }
    >
      <div className="flex justify-center py-3">
        <IconBubble color={color} icon="card" size={64} iconSize={28} />
      </div>
      <Field label="Nombre">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. BBVA Oro" />
      </Field>
      <Field label="Límite de crédito">
        <input className={inputCls} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Día de corte">
            <input className={inputCls} inputMode="numeric" value={closingDay} onChange={(e) => setClosingDay(e.target.value.replace(/[^0-9]/g, ''))} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Día de pago">
            <input className={inputCls} inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/[^0-9]/g, ''))} />
          </Field>
        </div>
      </div>
      <Field label="Color"><ColorPicker value={color} onChange={setColor} /></Field>
    </Sheet>
  )
}

function clampDay(v: string): number {
  const n = parseInt(v) || 1
  return Math.min(Math.max(n, 1), 31)
}
