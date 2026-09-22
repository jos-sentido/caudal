import clsx from 'clsx'
import { Check } from 'lucide-react'
import { PALETTE, ICON_KEYS, CatIcon } from '../lib/icons'

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-8 h-8 rounded-full grid place-items-center transition-transform active:scale-90"
          style={{ background: c }}
        >
          {value === c && <Check size={16} className="text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}

export function IconPicker({ value, onChange }: { value: string; onChange: (i: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-2 max-h-44 overflow-y-auto no-scrollbar p-0.5">
      {ICON_KEYS.map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={clsx(
            'aspect-square rounded-xl grid place-items-center transition-colors',
            value === k ? 'bg-brand text-white' : 'bg-surface text-muted hover:text-white',
          )}
        >
          <CatIcon name={k} size={18} />
        </button>
      ))}
    </div>
  )
}
