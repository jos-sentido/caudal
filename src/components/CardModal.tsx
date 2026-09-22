import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { IconBubble, Sheet, Field, inputCls, Btn } from './ui'
import { ColorPicker } from './pickers'
import type { CreditCard } from '../lib/types'

export function CardModal({
  card, onClose, onDeleted,
}: {
  card: CreditCard | null
  onClose: () => void
  onDeleted?: () => void
}) {
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
            <button
              onClick={() => { s.deleteCard(card.id); onClose(); onDeleted?.() }}
              className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0"
            >
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
