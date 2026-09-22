import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wallet2, Trash2, Pencil } from 'lucide-react'
import { useStore } from '../store/useStore'
import { IconBubble, Sheet, Field, inputCls, Btn, EmptyState, TopBar } from '../components/ui'
import { IconPicker, ColorPicker } from '../components/pickers'
import { money } from '../lib/format'
import { accountCurrent, accountProjected } from '../store/selectors'
import type { Account } from '../lib/types'

const KINDS: { value: Account['kind']; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'checking', label: 'Cuenta' },
  { value: 'savings', label: 'Ahorro' },
  { value: 'investment', label: 'Inversión' },
  { value: 'other', label: 'Otro' },
]

export function Accounts() {
  const s = useStore()
  const nav = useNavigate()
  const hide = s.settings.hideBalances
  const [edit, setEdit] = useState<Account | 'new' | null>(null)

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
          <button onClick={() => setEdit('new')} className="w-9 h-9 grid place-items-center rounded-full bg-brand text-white">
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
            action={<Btn onClick={() => setEdit('new')}>Agregar cuenta</Btn>}
          />
        ) : (
          <div className="space-y-3">
            {s.accounts.map((a) => {
              const cur = accountCurrent(a, s.transactions)
              const proj = accountProjected(a, s.transactions, s.year, s.month)
              return (
                <div key={a.id} className="bg-surface rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <IconBubble color={a.color} icon={a.icon} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{a.name}</div>
                      <div className="text-xs text-muted">{KINDS.find((k) => k.value === a.kind)?.label}</div>
                    </div>
                    <button onClick={() => setEdit(a)} className="w-8 h-8 grid place-items-center rounded-full text-muted hover:text-white">
                      <Pencil size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-line/60 text-sm">
                    <div>
                      <div className="text-xs text-muted">Actual</div>
                      <div className="font-semibold" style={{ color: cur < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>{money(cur, { hide })}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted">Proyectado</div>
                      <div className="font-semibold text-muted">{money(proj, { hide })}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {edit && <AccountModal account={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function AccountModal({ account, onClose }: { account: Account | null; onClose: () => void }) {
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
            <button onClick={() => { s.deleteAccount(account.id); onClose() }} className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0">
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
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
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
