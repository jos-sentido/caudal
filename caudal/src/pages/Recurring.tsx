import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Repeat, Play } from 'lucide-react'
import { useStore } from '../store/useStore'
import { IconBubble, Sheet, Field, inputCls, Btn, Segmented, EmptyState, TopBar } from '../components/ui'
import { money, toISODate } from '../lib/format'
import type { Recurring as Rec, TxType, RecurrenceFreq } from '../lib/types'

const FREQ: { value: RecurrenceFreq; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
]

export function Recurring() {
  const s = useStore()
  const nav = useNavigate()
  const hide = s.settings.hideBalances
  const [edit, setEdit] = useState<Rec | 'new' | null>(null)

  const generate = (r: Rec) => {
    const now = new Date()
    const day = Math.min(r.dayOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
    const date = toISODate(new Date(now.getFullYear(), now.getMonth(), day))
    s.addTransaction({
      type: r.type,
      amount: r.amount,
      date,
      description: r.description,
      categoryId: r.categoryId ?? null,
      accountId: r.accountId ?? null,
      cardId: r.cardId ?? null,
      confirmed: false,
      recurringId: r.id,
    })
    s.updateRecurring(r.id, { lastRun: date })
  }

  return (
    <div>
      <TopBar
        title="Recurrentes"
        back={() => nav(-1)}
        right={
          <button onClick={() => setEdit('new')} className="w-9 h-9 grid place-items-center rounded-full bg-brand text-white">
            <Plus size={19} />
          </button>
        }
      />
      <div className="px-4">
        {s.recurrings.length === 0 ? (
          <EmptyState
            icon={<Repeat size={40} />}
            title="Sin recurrentes"
            hint="Registra gastos e ingresos fijos (renta, nómina, suscripciones) y genéralos con un toque."
            action={<Btn onClick={() => setEdit('new')}>Crear recurrente</Btn>}
          />
        ) : (
          <div className="space-y-3">
            {s.recurrings.map((r) => {
              const cat = s.categories.find((c) => c.id === r.categoryId)
              return (
                <div key={r.id} className="bg-surface rounded-2xl p-4 flex items-center gap-3">
                  <IconBubble color={cat?.color ?? '#64748b'} icon={cat?.icon} />
                  <button onClick={() => setEdit(r)} className="flex-1 min-w-0 text-left">
                    <div className="font-semibold truncate">{r.description}</div>
                    <div className="text-xs text-muted">
                      {FREQ.find((f) => f.value === r.frequency)?.label} · día {r.dayOfMonth}
                    </div>
                  </button>
                  <div className="text-right">
                    <div className="font-semibold" style={{ color: r.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)' }}>
                      {money(r.type === 'expense' ? -r.amount : r.amount, { hide })}
                    </div>
                    <button onClick={() => generate(r)} className="text-xs text-brand-soft flex items-center gap-1 mt-0.5 ml-auto">
                      <Play size={11} /> Generar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {edit && <RecurringModal rec={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function RecurringModal({ rec, onClose }: { rec: Rec | null; onClose: () => void }) {
  const s = useStore()
  const [type, setType] = useState<TxType>(rec?.type ?? 'expense')
  const [amount, setAmount] = useState(rec ? String(rec.amount) : '')
  const [description, setDescription] = useState(rec?.description ?? '')
  const [categoryId, setCategoryId] = useState(rec?.categoryId ?? '')
  const [accountId, setAccountId] = useState(rec?.accountId ?? s.accounts[0]?.id ?? '')
  const [frequency, setFrequency] = useState<RecurrenceFreq>(rec?.frequency ?? 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState(rec ? String(rec.dayOfMonth) : '1')

  const cats = s.categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))

  const save = () => {
    const amt = parseFloat(amount) || 0
    if (amt <= 0) return
    const data = {
      type,
      amount: amt,
      description: description.trim() || (cats.find((c) => c.id === categoryId)?.name ?? 'Recurrente'),
      categoryId: type === 'transfer' ? null : categoryId || null,
      accountId: accountId || null,
      cardId: null,
      frequency,
      dayOfMonth: Math.min(Math.max(parseInt(dayOfMonth) || 1, 1), 31),
      active: rec?.active ?? true,
      lastRun: rec?.lastRun ?? null,
    }
    if (rec) s.updateRecurring(rec.id, data)
    else s.addRecurring(data)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={rec ? 'Editar recurrente' : 'Nuevo recurrente'}
      footer={
        <div className="flex gap-3">
          {rec && (
            <button onClick={() => { s.deleteRecurring(rec.id); onClose() }} className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0">
              <Trash2 size={18} />
            </button>
          )}
          <Btn onClick={save} disabled={!amount}>{rec ? 'Guardar' : 'Crear'}</Btn>
        </div>
      }
    >
      <div className="pt-1">
        <Segmented<TxType>
          value={type === 'transfer' ? 'expense' : type}
          onChange={setType}
          options={[
            { value: 'expense', label: 'Gasto', color: 'var(--color-expense)' },
            { value: 'income', label: 'Ingreso', color: 'var(--color-income)' },
          ]}
        />
      </div>
      <div className="h-4" />
      <Field label="Monto">
        <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" />
      </Field>
      <Field label="Descripción">
        <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Renta, Nómina…" />
      </Field>
      <Field label="Categoría">
        <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sin categoría</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Cuenta">
        <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">—</option>
          {s.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Frecuencia">
            <select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFreq)}>
              {FREQ.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="w-24">
          <Field label="Día">
            <input className={inputCls} inputMode="numeric" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value.replace(/[^0-9]/g, ''))} />
          </Field>
        </div>
      </div>
    </Sheet>
  )
}
