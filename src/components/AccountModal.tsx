import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { IconBubble, Sheet, Field, inputCls, Btn } from './ui'
import { IconPicker, ColorPicker } from './pickers'
import type { Account } from '../lib/types'

export const ACCOUNT_KINDS: { value: Account['kind']; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'checking', label: 'Cuenta' },
  { value: 'savings', label: 'Ahorro' },
  { value: 'investment', label: 'Inversión' },
  { value: 'other', label: 'Otro' },
]

export function AccountModal({
  account, onClose, onDeleted,
}: {
  account: Account | null
  onClose: () => void
  onDeleted?: () => void
}) {
  const s = useStore()
  const [name, setName] = useState(account?.name ?? '')
  const [kind, setKind] = useState<Account['kind']>(account?.kind ?? 'checking')
  const [initial, setInitial] = useState(account ? String(account.initialBalance) : '0')
  const [color, setColor] = useState(account?.color ?? '#3ba6ff')
  const [icon, setIcon] = useState(account?.icon ?? 'bank')

  const save = () => {
    const data = { name: name.trim(), kind, initialBalance: parseFloat(initial) || 0, color, icon }
    if (!data.name) return
    if (account) s.updateAccount(account.id, data)
    else s.addAccount({ ...data, order: s.accounts.length })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={account ? 'Editar cuenta' : 'Nueva cuenta'}
      footer={
        <div className="flex gap-3">
          {account && (
            <button
              onClick={() => { s.deleteAccount(account.id); onClose(); onDeleted?.() }}
              className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0"
            >
              <Trash2 size={18} />
            </button>
          )}
          <Btn onClick={save} disabled={!name.trim()}>{account ? 'Guardar' : 'Crear cuenta'}</Btn>
        </div>
      }
    >
      <div className="flex justify-center py-3">
        <IconBubble color={color} icon={icon} size={64} iconSize={28} />
      </div>
      <Field label="Nombre">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. BBVA, Efectivo…" />
      </Field>
      <Field label="Tipo">
        <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as Account['kind'])}>
          {ACCOUNT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </Field>
      <Field label="Saldo inicial">
        <input className={inputCls} inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value.replace(/[^0-9.-]/g, ''))} />
      </Field>
      <Field label="Color"><ColorPicker value={color} onChange={setColor} /></Field>
      <Field label="Ícono"><IconPicker value={icon} onChange={setIcon} /></Field>
    </Sheet>
  )
}
