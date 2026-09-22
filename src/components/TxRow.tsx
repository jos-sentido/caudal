import { Check, ArrowLeftRight } from 'lucide-react'
import clsx from 'clsx'
import type { Transaction } from '../lib/types'
import { useStore } from '../store/useStore'
import { money } from '../lib/format'
import { IconBubble } from './ui'

export function TxRow({ t, onClick, hide }: { t: Transaction; onClick?: () => void; hide?: boolean }) {
  const { categories, accounts, cards, toggleConfirmed } = useStore()
  const cat = categories.find((c) => c.id === t.categoryId)
  const acc = accounts.find((a) => a.id === t.accountId)
  const toAcc = accounts.find((a) => a.id === t.toAccountId)
  const card = cards.find((c) => c.id === t.cardId)

  const isTransfer = t.type === 'transfer'
  const color = isTransfer ? 'var(--color-brand)' : t.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'
  const sub = isTransfer
    ? `${acc?.name ?? '—'} → ${toAcc?.name ?? '—'}`
    : [cat?.name, card ? `${card.name} 💳` : acc?.name].filter(Boolean).join('  ·  ')

  return (
    <button onClick={onClick} className="flex items-center gap-3 w-full py-2.5 text-left active:opacity-70 transition-opacity">
      {isTransfer ? (
        <div className="w-11 h-11 rounded-full grid place-items-center bg-surface-2 text-brand-soft shrink-0">
          <ArrowLeftRight size={19} />
        </div>
      ) : (
        <IconBubble color={cat?.color ?? '#64748b'} icon={cat?.icon} />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[15px] truncate">{t.description}</div>
        <div className="text-xs text-muted truncate">{sub}</div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <span className="font-semibold text-[15px]" style={{ color }}>
          {isTransfer ? money(t.amount) : money(t.type === 'expense' ? -t.amount : t.amount, { hide })}
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation()
            toggleConfirmed(t.id)
          }}
          className={clsx(
            'w-5 h-5 rounded-full grid place-items-center transition-colors cursor-pointer',
            t.confirmed ? 'bg-income' : 'border border-line bg-transparent',
          )}
        >
          {t.confirmed && <Check size={12} className="text-white" strokeWidth={3} />}
        </span>
      </div>
    </button>
  )
}
