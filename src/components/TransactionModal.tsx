import { useEffect, useMemo, useState } from 'react'
import { Check, Trash2, CalendarDays, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../store/useStore'
import type { Transaction, TxType } from '../lib/types'
import { todayISO } from '../lib/format'
import { Sheet, Field, inputCls, Segmented, Btn, IconBubble } from './ui'

export interface TxDraft {
  id?: string
  type?: TxType
  cardId?: string
  accountId?: string
}

export function TransactionModal({
  draft, onClose,
}: {
  draft: TxDraft | null
  onClose: () => void
}) {
  const store = useStore()
  const editing = draft?.id ? store.transactions.find((t) => t.id === draft.id) : null

  const [type, setType] = useState<TxType>(editing?.type ?? draft?.type ?? 'expense')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null)
  const [accountId, setAccountId] = useState<string | null>(editing?.accountId ?? draft?.accountId ?? store.accounts[0]?.id ?? null)
  const [toAccountId, setToAccountId] = useState<string | null>(editing?.toAccountId ?? store.accounts[1]?.id ?? null)
  const [cardId, setCardId] = useState<string | null>(editing?.cardId ?? draft?.cardId ?? null)
  const [payWith, setPayWith] = useState<'account' | 'card'>(editing?.cardId || draft?.cardId ? 'card' : 'account')
  const [date, setDate] = useState(editing?.date ?? todayISO())
  const [confirmed, setConfirmed] = useState(editing?.confirmed ?? true)
  const [notes, setNotes] = useState(editing?.notes ?? '')

  useEffect(() => {
    // al cambiar de tipo, resetea categoría si no coincide
    if (type === 'transfer') return
    const cat = store.categories.find((c) => c.id === categoryId)
    if (cat && cat.kind !== type) setCategoryId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const cats = useMemo(
    () => store.categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')),
    [store.categories, type],
  )

  const amountNum = parseFloat(amount) || 0
  const valid =
    amountNum > 0 &&
    (type === 'transfer'
      ? accountId && toAccountId && accountId !== toAccountId
      : payWith === 'card'
        ? !!cardId
        : !!accountId)

  const save = () => {
    if (!valid) return
    const base: Omit<Transaction, 'id' | 'createdAt'> = {
      type,
      amount: amountNum,
      date,
      description: description.trim() || defaultDesc(),
      categoryId: type === 'transfer' ? null : categoryId,
      accountId: type === 'expense' && payWith === 'card' ? null : accountId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      cardId: type === 'expense' && payWith === 'card' ? cardId : null,
      confirmed,
      notes: notes.trim() || undefined,
    }
    if (editing) store.updateTransaction(editing.id, base)
    else store.addTransaction(base)
    onClose()
  }

  const defaultDesc = () => {
    if (type === 'transfer') return 'Transferencia'
    const c = cats.find((x) => x.id === categoryId)
    return c?.name ?? (type === 'income' ? 'Ingreso' : 'Gasto')
  }

  const accentColor = type === 'income' ? 'var(--color-income)' : type === 'expense' ? 'var(--color-expense)' : 'var(--color-brand)'

  return (
    <Sheet
      open={!!draft}
      onClose={onClose}
      title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}
      footer={
        <div className="flex gap-3">
          {editing && (
            <button
              onClick={() => {
                store.deleteTransaction(editing.id)
                onClose()
              }}
              className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0"
            >
              <Trash2 size={18} />
            </button>
          )}
          <Btn onClick={save} disabled={!valid}>
            {editing ? 'Guardar cambios' : 'Agregar'}
          </Btn>
        </div>
      }
    >
      <div className="pb-2">
        <Segmented<TxType>
          value={type}
          onChange={setType}
          options={[
            { value: 'expense', label: 'Gasto', color: 'var(--color-expense)' },
            { value: 'income', label: 'Ingreso', color: 'var(--color-income)' },
            { value: 'transfer', label: 'Transfer.', color: 'var(--color-brand-soft)' },
          ]}
        />

        {/* Monto */}
        <div className="text-center py-6">
          <div className="text-sm text-muted mb-1">Monto</div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-bold" style={{ color: accentColor }}>$</span>
            <input
              autoFocus={!editing}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              className="bg-transparent text-4xl font-bold text-center outline-none w-52 placeholder:text-line"
              style={{ color: accentColor }}
            />
          </div>
        </div>

        <Field label="Descripción">
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={defaultDesc()} />
        </Field>

        {type !== 'transfer' && (
          <Field label="Categoría">
            <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto no-scrollbar pr-1">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 py-2 rounded-xl transition-colors',
                    categoryId === c.id ? 'bg-surface-2' : 'hover:bg-surface',
                  )}
                >
                  <div className={clsx('rounded-full p-0.5', categoryId === c.id && 'ring-2')} style={{ '--tw-ring-color': c.color } as React.CSSProperties}>
                    <IconBubble color={c.color} icon={c.icon} size={40} iconSize={18} />
                  </div>
                  <span className="text-[11px] text-muted leading-tight text-center line-clamp-2">{c.name}</span>
                </button>
              ))}
            </div>
          </Field>
        )}

        {/* Cuenta / origen */}
        {type === 'transfer' ? (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <AccountSelect label="De" accounts={store.accounts} value={accountId} onChange={setAccountId} />
            </div>
            <ArrowRight size={18} className="text-muted mt-5 shrink-0" />
            <div className="flex-1">
              <AccountSelect label="Para" accounts={store.accounts} value={toAccountId} onChange={setToAccountId} />
            </div>
          </div>
        ) : (
          <>
            {type === 'expense' && store.cards.length > 0 && (
              <div className="mb-4">
                <Segmented<'account' | 'card'>
                  value={payWith}
                  onChange={setPayWith}
                  options={[
                    { value: 'account', label: 'Cuenta' },
                    { value: 'card', label: 'Tarjeta crédito' },
                  ]}
                />
              </div>
            )}
            {type === 'expense' && payWith === 'card' ? (
              <Field label="Tarjeta">
                <select className={inputCls} value={cardId ?? ''} onChange={(e) => setCardId(e.target.value || null)}>
                  <option value="">Selecciona…</option>
                  {store.cards.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <AccountSelect
                label={type === 'income' ? 'Cuenta destino' : 'Cuenta'}
                accounts={store.accounts}
                value={accountId}
                onChange={setAccountId}
              />
            )}
          </>
        )}

        <div className="flex gap-3">
          <Field label="Fecha">
            <div className="relative">
              <input type="date" className={clsx(inputCls, 'pr-10')} value={date} onChange={(e) => setDate(e.target.value)} />
              <CalendarDays size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </Field>
        </div>

        <button
          onClick={() => setConfirmed((v) => !v)}
          className="flex items-center justify-between w-full mb-4 py-1"
        >
          <div className="text-left">
            <div className="text-sm font-medium">{type === 'income' ? 'Recibido' : 'Pagado'}</div>
            <div className="text-xs text-muted">{confirmed ? 'Confirmado' : 'Pendiente (proyectado)'}</div>
          </div>
          <div className={clsx('w-12 h-7 rounded-full p-1 transition-colors', confirmed ? 'bg-income' : 'bg-surface-2')}>
            <div className={clsx('w-5 h-5 rounded-full bg-white transition-transform', confirmed && 'translate-x-5')}>
              {confirmed && <Check size={14} className="text-income m-auto mt-0.5" strokeWidth={3} />}
            </div>
          </div>
        </button>

        <Field label="Notas (opcional)">
          <textarea className={clsx(inputCls, 'resize-none')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalle adicional…" />
        </Field>
      </div>
    </Sheet>
  )
}

function AccountSelect({
  label, accounts, value, onChange,
}: {
  label: string
  accounts: { id: string; name: string; color: string; icon: string }[]
  value: string | null
  onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {accounts.length === 0 && <span className="text-sm text-faint py-2">Crea una cuenta primero</span>}
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 transition-colors',
              value === a.id ? 'border-brand bg-brand/10' : 'border-line',
            )}
          >
            <IconBubble color={a.color} icon={a.icon} size={26} iconSize={13} />
            <span className="text-sm font-medium whitespace-nowrap">{a.name}</span>
          </button>
        ))}
      </div>
    </Field>
  )
}
