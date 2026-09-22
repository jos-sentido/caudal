import { type ReactNode, useEffect, useRef } from 'react'
import { X, ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import { CatIcon } from '../lib/icons'

export function IconBubble({
  color, icon, size = 44, iconSize = 20, ring,
}: {
  color: string
  icon?: string | null
  size?: number
  iconSize?: number
  ring?: boolean
}) {
  const light = isLight(color)
  return (
    <div
      className={clsx('grid place-items-center rounded-full shrink-0', ring && 'ring-2 ring-line')}
      style={{ width: size, height: size, background: color }}
    >
      <CatIcon name={icon} size={iconSize} className={light ? 'text-black/80' : 'text-white'} />
    </div>
  )
}

function isLight(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 165
}

export function Sheet({
  open, onClose, title, children, footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    // Ancla el sheet al área visible (encima del teclado) usando el visual viewport
    const vv = window.visualViewport
    const apply = () => {
      const el = frameRef.current
      if (!el || !vv) return
      el.style.height = `${vv.height}px`
      el.style.top = `${vv.offsetTop}px`
    }
    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 animate-fade">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={frameRef}
        className="absolute inset-x-0 top-0 flex items-end justify-center sm:items-center"
        style={{ height: '100dvh' }}
      >
      <div className="relative w-full sm:max-w-md bg-ink-2 rounded-t-3xl sm:rounded-3xl border border-line max-h-[92dvh] flex flex-col animate-sheet shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div className="text-base font-semibold">{title}</div>
          <button onClick={onClose} className="grid place-items-center w-9 h-9 rounded-full bg-surface text-muted hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 overflow-y-auto no-scrollbar flex-1">{children}</div>
        {footer && <div className="p-4 border-t border-line shrink-0 safe-b">{footer}</div>}
      </div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="text-xs font-medium text-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full bg-surface border border-line rounded-xl px-3.5 py-3 text-[15px] outline-none focus:border-brand transition-colors placeholder:text-faint'

export function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; color?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-surface rounded-full p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 py-2 rounded-full text-sm font-semibold transition-all',
            value === o.value ? 'bg-surface-2 text-white shadow' : 'text-muted',
          )}
          style={value === o.value && o.color ? { color: o.color } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Btn({
  children, onClick, variant = 'primary', className, type = 'button', disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'soft'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-brand text-white hover:brightness-110',
    soft: 'bg-surface-2 text-white hover:bg-line',
    ghost: 'bg-transparent text-muted hover:text-white',
    danger: 'bg-expense/15 text-expense hover:bg-expense/25',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx('w-full py-3.5 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-40', styles, className)}
    >
      {children}
    </button>
  )
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="text-faint mb-3">{icon}</div>
      <div className="font-semibold text-[15px]">{title}</div>
      {hint && <div className="text-sm text-muted mt-1 max-w-xs">{hint}</div>}
      {action && <div className="mt-5 w-full max-w-xs">{action}</div>}
    </div>
  )
}

export function TopBar({ title, right, back }: { title: ReactNode; right?: ReactNode; back?: () => void }) {
  return (
    <div className="sticky top-0 z-30 bg-ink/90 backdrop-blur-md safe-t">
      <div className="flex items-center gap-2 px-4 h-14">
        {back && (
          <button onClick={back} className="grid place-items-center w-9 h-9 -ml-2 rounded-full text-muted hover:text-white">
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="text-lg font-bold flex-1 truncate">{title}</div>
        {right}
      </div>
    </div>
  )
}
