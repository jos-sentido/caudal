import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BellRing, BellOff, Trash2, CalendarClock, Check } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../store/useStore'
import { IconBubble, Sheet, Field, inputCls, Btn, Segmented, EmptyState, TopBar } from '../components/ui'
import { money, todayISO } from '../lib/format'
import { nextOccurrence, dueOccurrence, whenLabel, freqDescription, FREQ_LABEL } from '../lib/recurrence'
import { canNotify, notifPermission, ensurePermission } from '../lib/notify'
import type { Reminder, ReminderKind, ReminderFreq } from '../lib/types'

const KIND_META: Record<ReminderKind, { label: string; color: string; icon: string }> = {
  expense: { label: 'Gasto', color: '#f0574f', icon: 'receipt' },
  income: { label: 'Ingreso', color: '#37c978', icon: 'coins' },
  card: { label: 'Pago tarjeta', color: '#4f7cff', icon: 'card' },
  other: { label: 'Otro', color: '#8b5cf6', icon: 'star' },
}

export function Reminders() {
  const s = useStore()
  const nav = useNavigate()
  const hide = s.settings.hideBalances
  const [edit, setEdit] = useState<Reminder | 'new' | null>(null)
  const [perm, setPerm] = useState(notifPermission())

  const sorted = useMemo(() => {
    const now = new Date()
    return [...s.reminders]
      .map((r) => ({ r, next: nextOccurrence(r, now), due: dueOccurrence(r, now) }))
      .sort((a, b) => {
        const av = a.next?.getTime() ?? Infinity
        const bv = b.next?.getTime() ?? Infinity
        return av - bv
      })
  }, [s.reminders])

  const askPermission = async () => setPerm(await ensurePermission())

  return (
    <div>
      <TopBar
        title="Recordatorios"
        back={() => nav(-1)}
        right={
          <button onClick={() => setEdit('new')} className="w-9 h-9 grid place-items-center rounded-full bg-brand text-white">
            <Plus size={19} />
          </button>
        }
      />

      <div className="px-4">
        {canNotify() && perm !== 'granted' && (
          <button onClick={askPermission} className="w-full flex items-center gap-3 bg-brand/12 border border-brand/30 rounded-2xl p-3.5 mb-4 text-left">
            <span className="w-9 h-9 rounded-full bg-brand grid place-items-center text-white shrink-0"><BellRing size={18} /></span>
            <span className="flex-1">
              <span className="font-semibold block text-sm">Activar notificaciones</span>
              <span className="text-xs text-muted">Permite que Caudal te avise cuando llegue cada recordatorio.</span>
            </span>
          </button>
        )}
        {perm === 'denied' && (
          <div className="flex items-center gap-2 text-xs text-muted bg-surface rounded-xl p-3 mb-4">
            <BellOff size={15} /> Las notificaciones están bloqueadas en el navegador. Actívalas en los ajustes del sitio para recibir alertas.
          </div>
        )}

        {s.reminders.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={40} />}
            title="Sin recordatorios"
            hint="Crea alertas con la fecha y recurrencia que quieras: pagos, cobros, suscripciones…"
            action={<Btn onClick={() => setEdit('new')}>Crear recordatorio</Btn>}
          />
        ) : (
          <div className="space-y-3">
            {sorted.map(({ r, next, due }) => {
              const meta = KIND_META[r.kind]
              const cat = s.categories.find((c) => c.id === r.categoryId)
              const overdue = !!due && (!r.lastFired || new Date(r.lastFired) < due)
              return (
                <button
                  key={r.id}
                  onClick={() => setEdit(r)}
                  className={clsx(
                    'flex items-center gap-3 w-full text-left bg-surface rounded-2xl p-4 active:opacity-70 transition-opacity',
                    overdue && 'ring-1 ring-expense/50',
                  )}
                >
                  <IconBubble color={cat?.color ?? meta.color} icon={cat?.icon ?? meta.icon} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      {r.title}
                      {!r.active && <span className="text-[10px] text-faint border border-line rounded px-1">pausado</span>}
                    </div>
                    <div className={clsx('text-xs truncate', overdue ? 'text-expense' : 'text-muted')}>
                      {overdue ? 'Vencido · ' : ''}{next ? whenLabel(next) : (due ? whenLabel(due) : 'Sin próxima fecha')} · {freqDescription(r)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {r.amount ? <div className="font-semibold text-sm">{money(r.amount, { hide })}</div> : null}
                    {r.notify ? <BellRing size={14} className="text-brand-soft ml-auto mt-1" /> : <BellOff size={14} className="text-faint ml-auto mt-1" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {edit && <ReminderModal reminder={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function ReminderModal({ reminder, onClose }: { reminder: Reminder | null; onClose: () => void }) {
  const s = useStore()
  const [title, setTitle] = useState(reminder?.title ?? '')
  const [kind, setKind] = useState<ReminderKind>(reminder?.kind ?? 'expense')
  const [amount, setAmount] = useState(reminder?.amount ? String(reminder.amount) : '')
  const [categoryId, setCategoryId] = useState(reminder?.categoryId ?? '')
  const [accountId, setAccountId] = useState(reminder?.accountId ?? '')
  const [cardId, setCardId] = useState(reminder?.cardId ?? '')
  const [date, setDate] = useState(reminder?.date ?? todayISO())
  const [time, setTime] = useState(reminder?.time ?? '09:00')
  const [freq, setFreq] = useState<ReminderFreq>(reminder?.freq ?? 'monthly')
  const [interval, setIntervalDays] = useState(String(reminder?.interval ?? 15))
  const [notify, setNotify] = useState(reminder?.notify ?? true)
  const [active, setActive] = useState(reminder?.active ?? true)

  const cats = s.categories.filter((c) => c.kind === (kind === 'income' ? 'income' : 'expense'))

  const save = async () => {
    if (!title.trim()) return
    if (notify) await ensurePermission()
    const data: Omit<Reminder, 'id'> = {
      title: title.trim(),
      kind,
      amount: amount ? parseFloat(amount) : null,
      categoryId: kind === 'card' || kind === 'other' ? null : (categoryId || null),
      accountId: kind === 'other' ? null : (accountId || null),
      cardId: kind === 'card' ? (cardId || null) : null,
      date,
      time,
      freq,
      interval: freq === 'everyN' ? Math.max(1, parseInt(interval) || 1) : undefined,
      notify,
      active,
      lastFired: reminder?.lastFired ?? null,
    }
    if (reminder) s.updateReminder(reminder.id, data)
    else s.addReminder(data)
    onClose()
  }

  const registerNow = () => {
    const amt = amount ? parseFloat(amount) : 0
    if (kind === 'card') {
      if (!cardId || amt <= 0 || !accountId) return
      s.addTransaction({ type: 'transfer', amount: amt, date: todayISO(), description: title.trim() || 'Pago de tarjeta', accountId, toAccountId: null, cardId, confirmed: true })
    } else if (kind === 'expense' || kind === 'income') {
      if (amt <= 0) return
      s.addTransaction({ type: kind, amount: amt, date: todayISO(), description: title.trim() || 'Movimiento', categoryId: categoryId || null, accountId: accountId || null, confirmed: true })
    }
    onClose()
  }

  const canRegister = kind !== 'other' && !!amount && (kind !== 'card' || !!accountId)

  return (
    <Sheet
      open
      onClose={onClose}
      title={reminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      footer={
        <div className="flex gap-3">
          {reminder && (
            <button onClick={() => { s.deleteReminder(reminder.id); onClose() }} className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0">
              <Trash2 size={18} />
            </button>
          )}
          <Btn onClick={save} disabled={!title.trim()}>{reminder ? 'Guardar' : 'Crear'}</Btn>
        </div>
      }
    >
      <Field label="Título">
        <input className={inputCls} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Pagar tarjeta, Cobrar renta…" />
      </Field>

      <Field label="Tipo">
        <Segmented<ReminderKind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Gasto', color: '#f0574f' },
            { value: 'income', label: 'Ingreso', color: '#37c978' },
            { value: 'card', label: 'Tarjeta', color: '#4f7cff' },
            { value: 'other', label: 'Otro' },
          ]}
        />
      </Field>

      <Field label="Monto (opcional)">
        <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" />
      </Field>

      {(kind === 'expense' || kind === 'income') && (
        <Field label="Categoría">
          <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {kind === 'card' && (
        <Field label="Tarjeta">
          <select className={inputCls} value={cardId} onChange={(e) => setCardId(e.target.value)}>
            <option value="">Selecciona…</option>
            {s.cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {kind !== 'other' && (
        <Field label={kind === 'card' ? 'Pagar desde' : 'Cuenta'}>
          <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">—</option>
            {s.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Fecha"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <div className="w-28">
          <Field label="Hora"><input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
      </div>

      <Field label="Repetir">
        <select className={inputCls} value={freq} onChange={(e) => setFreq(e.target.value as ReminderFreq)}>
          {(Object.keys(FREQ_LABEL) as ReminderFreq[]).map((f) => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
        </select>
      </Field>
      {freq === 'everyN' && (
        <Field label="Cada cuántos días">
          <input className={inputCls} inputMode="numeric" value={interval} onChange={(e) => setIntervalDays(e.target.value.replace(/[^0-9]/g, ''))} />
        </Field>
      )}

      <ToggleRow label="Notificarme" hint="Recibir alerta cuando llegue la hora" value={notify} onChange={setNotify} />
      <ToggleRow label="Activo" hint="Desactívalo para pausar sin borrarlo" value={active} onChange={setActive} />

      {canRegister && (
        <button onClick={registerNow} className="w-full flex items-center justify-center gap-2 py-3 mt-1 mb-2 rounded-xl bg-surface-2 text-brand-soft font-semibold text-sm">
          <Check size={16} /> Registrar movimiento ahora
        </button>
      )}
    </Sheet>
  )
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center justify-between w-full py-2.5">
      <div className="text-left">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{hint}</div>
      </div>
      <div className={clsx('w-12 h-7 rounded-full p-1 transition-colors shrink-0', value ? 'bg-brand' : 'bg-surface-2')}>
        <div className={clsx('w-5 h-5 rounded-full bg-white transition-transform', value && 'translate-x-5')} />
      </div>
    </button>
  )
}
