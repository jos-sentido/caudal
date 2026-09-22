import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Plus, Landmark } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Sheet, Field, inputCls, Btn, TopBar } from '../components/ui'
import { CardModal } from '../components/CardModal'
import { TxRow } from '../components/TxRow'
import { useTxModal } from '../components/AppShell'
import { money, todayISO } from '../lib/format'
import { cardUsed } from '../store/selectors'

export function CardDetail() {
  const s = useStore()
  const nav = useNavigate()
  const { id } = useParams()
  const { openTx } = useTxModal()
  const hide = s.settings.hideBalances

  const card = s.cards.find((c) => c.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const charges = useMemo(
    () => s.transactions.filter((t) => t.cardId === id).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)),
    [s.transactions, id],
  )

  if (!card) {
    return (
      <div>
        <TopBar title="Tarjeta" back={() => nav('/tarjetas')} />
        <div className="px-4 py-10 text-center text-muted">Esta tarjeta ya no existe.</div>
      </div>
    )
  }

  const used = cardUsed(card, s.transactions)
  const available = card.limit - used
  const pct = card.limit ? Math.min((used / card.limit) * 100, 100) : 0

  return (
    <div>
      <TopBar
        title="Detalle de tarjeta"
        back={() => nav(-1)}
        right={
          <button onClick={() => setEditOpen(true)} className="w-9 h-9 grid place-items-center rounded-full text-muted hover:text-white">
            <Pencil size={18} />
          </button>
        }
      />

      <div className="px-4">
        {/* Tarjeta visual / estado de cuenta */}
        <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}bb 55%, #111)` }}>
          <div className="text-sm opacity-80">{card.name}</div>
          <div className="text-xs opacity-70 mt-3">Saldo de la tarjeta</div>
          <div className="text-3xl font-bold">{money(used, { hide })}</div>
          <div className="h-1.5 bg-white/25 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs opacity-85 mt-3">
            <span>Disponible {money(available, { hide })}</span>
            <span>Límite {money(card.limit, { hide })}</span>
          </div>
        </div>

        {/* Estado / fechas */}
        <div className="bg-surface rounded-2xl p-4 mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-muted">Día de corte</div>
            <div className="font-bold mt-0.5">{card.closingDay}</div>
          </div>
          <div className="border-x border-line/60">
            <div className="text-xs text-muted">Día de pago</div>
            <div className="font-bold mt-0.5">{card.dueDay}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Cargos</div>
            <div className="font-bold mt-0.5">{charges.length}</div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 mt-3">
          <Btn variant="soft" onClick={() => openTx({ type: 'expense', cardId: card.id })}>
            <span className="inline-flex items-center gap-1.5"><Plus size={16} /> Nuevo cargo</span>
          </Btn>
          <Btn onClick={() => setPayOpen(true)} disabled={s.accounts.length === 0}>
            <span className="inline-flex items-center gap-1.5"><Landmark size={16} /> Registrar pago</span>
          </Btn>
        </div>

        {/* Movimientos de la tarjeta */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-muted px-1 mb-1">Movimientos</div>
          {charges.length === 0 ? (
            <div className="bg-surface rounded-2xl py-8 text-center text-muted text-sm">Sin movimientos en esta tarjeta</div>
          ) : (
            <div className="bg-surface rounded-2xl px-3 divide-y divide-line/40">
              {charges.slice(0, 50).map((t) => (
                <TxRow key={t.id} t={t} hide={hide} onClick={() => openTx({ id: t.id })} />
              ))}
            </div>
          )}
        </div>
      </div>

      {editOpen && <CardModal card={card} onClose={() => setEditOpen(false)} onDeleted={() => nav('/tarjetas')} />}
      {payOpen && <PayCardModal cardId={card.id} suggested={used > 0 ? used : 0} onClose={() => setPayOpen(false)} />}
    </div>
  )
}

function PayCardModal({ cardId, suggested, onClose }: { cardId: string; suggested: number; onClose: () => void }) {
  const s = useStore()
  const [amount, setAmount] = useState(suggested > 0 ? suggested.toFixed(2) : '')
  const [accountId, setAccountId] = useState(s.accounts[0]?.id ?? '')

  const amt = parseFloat(amount) || 0
  const valid = amt > 0 && !!accountId

  const pay = () => {
    if (!valid) return
    s.addTransaction({
      type: 'transfer',
      amount: amt,
      date: todayISO(),
      description: 'Pago de tarjeta',
      accountId,
      toAccountId: null,
      cardId,
      confirmed: true,
    })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Registrar pago" footer={<Btn onClick={pay} disabled={!valid}>Pagar</Btn>}>
      <div className="text-center py-4">
        <div className="text-sm text-muted mb-1">Monto del pago</div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-2xl font-bold text-brand-soft">$</span>
          <input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            className="bg-transparent text-3xl font-bold text-center outline-none w-52 text-brand-soft placeholder:text-line"
          />
        </div>
      </div>
      <Field label="Pagar desde">
        <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {s.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <p className="text-xs text-muted -mt-2 mb-4 px-1">
        Sale de la cuenta elegida y reduce el saldo de la tarjeta.
      </p>
    </Sheet>
  )
}
