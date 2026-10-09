import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Users, ChevronDown, Check, Settings2, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuth } from './AuthGate'
import { setActiveSpace } from '../store/sync'
import { Sheet } from './ui'

/** Pastilla para cambiar entre el espacio personal y los compartidos. Solo visible si hay espacios. */
export function SpaceSwitcher() {
  const navigate = useNavigate()
  const { user, cloud } = useAuth()
  const activeSpaceId = useStore((s) => s.activeSpaceId)
  const spaces = useStore((s) => s.spaces)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!cloud || !user || spaces.length === 0) return null

  const active = spaces.find((s) => s.id === activeSpaceId)
  const label = active ? active.name : 'Personal'

  const choose = async (id: string) => {
    setBusy(true)
    try { await setActiveSpace(id) } finally { setBusy(false); setOpen(false) }
  }

  return (
    <>
      <div className="flex justify-center">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-full pl-3 pr-2.5 py-1.5 text-sm font-medium active:scale-95 transition-transform"
        >
          {active ? <Users size={14} className="text-brand-soft" /> : <Home size={14} className="text-muted" />}
          <span className="max-w-[9rem] truncate">{label}</span>
          <ChevronDown size={15} className="text-muted" />
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Cambiar de espacio">
        <div className="pb-3 space-y-1">
          <Row active={!activeSpaceId} icon={<Home size={18} />} name="Personal" sub="Solo tú" onClick={() => choose('')} busy={busy} />
          {spaces.map((sp) => (
            <Row
              key={sp.id}
              active={activeSpaceId === sp.id}
              icon={<Users size={18} />}
              name={sp.name}
              sub={sp.role === 'owner' ? 'Creado por ti' : 'Compartido'}
              onClick={() => choose(sp.id)}
              busy={busy}
            />
          ))}
          <button
            onClick={() => { setOpen(false); navigate('/colaborar') }}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-muted"
          >
            <span className="w-9 h-9 rounded-full bg-surface grid place-items-center"><Settings2 size={18} /></span>
            <span className="font-medium">Gestionar e invitar</span>
          </button>
        </div>
      </Sheet>
    </>
  )
}

function Row({
  active, icon, name, sub, onClick, busy,
}: {
  active: boolean; icon: React.ReactNode; name: string; sub: string; onClick: () => void; busy: boolean
}) {
  return (
    <button onClick={onClick} disabled={busy} className="flex items-center gap-3 w-full px-3 py-3 rounded-xl bg-surface disabled:opacity-60">
      <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${active ? 'bg-brand text-ink' : 'bg-surface-2 text-muted'}`}>{icon}</span>
      <span className="flex-1 text-left min-w-0">
        <span className="font-medium block truncate">{name}</span>
        <span className="text-xs text-muted">{sub}</span>
      </span>
      {active ? <Check size={18} className="text-brand-soft" /> : busy ? <Loader2 size={16} className="animate-spin text-faint" /> : null}
    </button>
  )
}
