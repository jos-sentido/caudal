import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { monthName, monthShort } from '../lib/format'
import { Sheet } from './ui'
import clsx from 'clsx'

export function MonthNav({ compact }: { compact?: boolean }) {
  const { year, month, setPeriod } = useStore()
  const [open, setOpen] = useState(false)

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setPeriod(d.getFullYear(), d.getMonth())
  }

  return (
    <>
      <div className="flex items-center justify-center gap-6 py-1">
        <button onClick={() => go(-1)} className="text-muted hover:text-white p-1">
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => setOpen(true)}
          className={clsx('font-semibold', compact ? 'text-base' : 'text-[17px]')}
        >
          {monthName(month)} {year !== new Date().getFullYear() ? year : ''}
        </button>
        <button onClick={() => go(1)} className="text-muted hover:text-white p-1">
          <ChevronRight size={22} />
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Seleccionar mes">
        <MonthPicker
          year={year}
          month={month}
          onPick={(y, m) => {
            setPeriod(y, m)
            setOpen(false)
          }}
        />
        <div className="pb-4" />
      </Sheet>
    </>
  )
}

function MonthPicker({ year, month, onPick }: { year: number; month: number; onPick: (y: number, m: number) => void }) {
  const [y, setY] = useState(year)
  const now = new Date()
  return (
    <div className="pb-2">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setY(y - 1)} className="w-9 h-9 grid place-items-center rounded-full bg-surface text-muted">
          <ChevronLeft size={18} />
        </button>
        <div className="text-lg font-bold">{y}</div>
        <button onClick={() => setY(y + 1)} className="w-9 h-9 grid place-items-center rounded-full bg-surface text-muted">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 12 }).map((_, m) => {
          const active = y === year && m === month
          const isNow = y === now.getFullYear() && m === now.getMonth()
          return (
            <button
              key={m}
              onClick={() => onPick(y, m)}
              className={clsx(
                'py-3 rounded-xl text-sm font-semibold transition-colors',
                active ? 'bg-brand text-white' : isNow ? 'bg-surface-2 text-brand-soft' : 'bg-surface text-muted hover:text-white',
              )}
            >
              {monthShort(m)}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => onPick(now.getFullYear(), now.getMonth())}
        className="w-full mt-4 py-3 text-brand-soft font-semibold text-sm"
      >
        Mes actual
      </button>
    </div>
  )
}
