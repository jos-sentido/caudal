import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, UserPlus, Plus, Check, Copy, Share2, LogOut, UserMinus, Crown, Home, Loader2, Link2,
} from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useStore } from '../store/useStore'
import { useAuth } from '../components/AuthGate'
import { setActiveSpace } from '../store/sync'
import {
  apiCreateSpace, apiCreateInvite, apiAcceptInvite, apiLeaveSpace, apiRemoveMember, copyCurrentDataToSpace,
} from '../store/spaces'
import type { SpaceInfo } from '../lib/types'
import { TopBar, Btn, inputCls } from '../components/ui'

export function Collab() {
  const navigate = useNavigate()
  const { user, cloud } = useAuth()
  const activeSpaceId = useStore((s) => s.activeSpaceId)
  const spaces = useStore((s) => s.spaces)

  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState<SpaceInfo | null>(null)
  const [inviteCode, setInviteCode] = useState('')

  // Suscripción en vivo al documento de membresía del espacio activo.
  useEffect(() => {
    setInfo(null)
    setInviteCode('')
    if (!db || !activeSpaceId) return
    const unsub = onSnapshot(
      doc(db, `spaces/${activeSpaceId}/meta/info`),
      (d) => setInfo(d.exists() ? (d.data() as SpaceInfo) : null),
      () => setInfo(null),
    )
    return unsub
  }, [activeSpaceId])

  if (!cloud || !user) {
    return (
      <div>
        <TopBar title="Colaboración" back={() => navigate(-1)} />
        <div className="px-6 py-16 text-center text-muted">
          Inicia sesión con Google para compartir tus finanzas con alguien más.
        </div>
      </div>
    )
  }

  const run = async (label: string, fn: () => Promise<void>) => {
    setErr('')
    setBusy(label)
    try { await fn() } catch (e: any) { setErr(e?.message ?? 'Error') } finally { setBusy('') }
  }
  const switchTo = (id: string) => run('switch', async () => { await setActiveSpace(id) })

  return (
    <div className="pb-10">
      <TopBar title="Colaboración" back={() => navigate(-1)} />

      {err && <div className="mx-4 mb-3 rounded-xl bg-expense/15 text-expense text-sm px-3.5 py-2.5">{err}</div>}

      {/* Selector de espacio */}
      <Section title="Tus espacios">
        <SpaceRow active={!activeSpaceId} icon={<Home size={18} />} name="Personal" sub="Solo tú" onClick={() => switchTo('')} loading={busy === 'switch'} />
        {spaces.map((sp) => (
          <SpaceRow
            key={sp.id}
            active={activeSpaceId === sp.id}
            icon={<Users size={18} />}
            name={sp.name}
            sub={sp.role === 'owner' ? 'Creado por ti' : 'Compartido'}
            onClick={() => switchTo(sp.id)}
            loading={busy === 'switch'}
          />
        ))}
      </Section>

      {/* Miembros del espacio activo */}
      {activeSpaceId && info && (
        <Section title={`Miembros de "${info.name}"`}>
          {Object.entries(info.members || {}).map(([uid, m]) => (
            <div key={uid} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-surface-2 grid place-items-center text-brand-soft shrink-0">
                {info.createdBy === uid ? <Crown size={16} /> : <Users size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{m.name}{uid === user.uid ? ' (tú)' : ''}</div>
                <div className="text-xs text-muted truncate">{m.email}</div>
              </div>
              {info.createdBy === user.uid && uid !== user.uid && (
                <button
                  onClick={() => run('remove:' + uid, async () => { await apiRemoveMember(activeSpaceId, uid) })}
                  disabled={busy === 'remove:' + uid}
                  className="text-muted hover:text-expense p-1.5 disabled:opacity-40"
                  aria-label="Quitar"
                >
                  {busy === 'remove:' + uid ? <Loader2 size={18} className="animate-spin" /> : <UserMinus size={18} />}
                </button>
              )}
            </div>
          ))}

          <div className="p-4 space-y-3">
            <Btn
              variant="soft"
              disabled={busy === 'invite'}
              onClick={() => run('invite', async () => {
                const { code } = await apiCreateInvite(activeSpaceId)
                setInviteCode(code)
              })}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {busy === 'invite' ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                Invitar a alguien
              </span>
            </Btn>

            {inviteCode && <InviteCard code={inviteCode} />}

            <button
              onClick={() => run('leave', async () => { await apiLeaveSpace(activeSpaceId); await setActiveSpace('') })}
              disabled={busy === 'leave'}
              className="w-full flex items-center justify-center gap-2 text-expense text-sm font-medium py-2 disabled:opacity-40"
            >
              {busy === 'leave' ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              Salir del espacio
            </button>
          </div>
        </Section>
      )}

      {/* Crear / Unirse */}
      <CreateSpace
        busy={busy === 'create'}
        onCreate={(name) => run('create', async () => {
          const { spaceId } = await apiCreateSpace(name)
          await copyCurrentDataToSpace(spaceId)
          await setActiveSpace(spaceId)
        })}
      />
      <JoinSpace
        busy={busy === 'join'}
        onJoin={(code) => run('join', async () => {
          const { spaceId } = await apiAcceptInvite(code)
          await setActiveSpace(spaceId)
        })}
      />

      <p className="text-xs text-faint px-5 mt-2 leading-relaxed">
        En un espacio compartido, tú y quien invites ven y editan los mismos movimientos en tiempo real.
        Tu espacio personal sigue siendo privado.
      </p>
    </div>
  )
}

function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}/?invite=${code}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* */ }
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Caudal', text: `Únete a mi espacio en Caudal. Código: ${code}`, url: link })
      else await copy()
    } catch { /* cancelado */ }
  }
  return (
    <div className="rounded-xl bg-surface border border-line p-3.5">
      <div className="text-xs text-muted mb-1.5 flex items-center gap-1.5"><Link2 size={13} /> Comparte este código o enlace</div>
      <div className="font-mono text-lg font-bold tracking-widest text-center py-1">{code}</div>
      <div className="flex gap-2 mt-2">
        <button onClick={copy} className="flex-1 flex items-center justify-center gap-1.5 bg-surface-2 rounded-lg py-2 text-sm font-medium">
          {copied ? <Check size={15} className="text-income" /> : <Copy size={15} />} {copied ? 'Copiado' : 'Copiar enlace'}
        </button>
        <button onClick={share} className="flex-1 flex items-center justify-center gap-1.5 bg-surface-2 rounded-lg py-2 text-sm font-medium"><Share2 size={15} /> Compartir</button>
      </div>
    </div>
  )
}

function CreateSpace({ busy, onCreate }: { busy: boolean; onCreate: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  if (!open) {
    return (
      <Section title="Crear un espacio compartido">
        <button onClick={() => setOpen(true)} className="flex items-center gap-3 w-full px-4 py-3.5">
          <span className="w-9 h-9 rounded-full bg-brand/15 text-brand-soft grid place-items-center"><Plus size={18} /></span>
          <span className="flex-1 text-left">
            <span className="font-medium block">Nuevo espacio</span>
            <span className="text-xs text-muted">Copia tus datos actuales como punto de partida</span>
          </span>
        </button>
      </Section>
    )
  }
  return (
    <Section title="Crear un espacio compartido">
      <div className="p-4 space-y-3">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (ej. Casa, Nosotros)" className={inputCls} />
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => { setOpen(false); setName('') }}>Cancelar</Btn>
          <Btn onClick={() => onCreate(name.trim() || 'Espacio compartido')} disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Crear y copiar'}
          </Btn>
        </div>
      </div>
    </Section>
  )
}

function JoinSpace({ busy, onJoin }: { busy: boolean; onJoin: (code: string) => void }) {
  const [code, setCode] = useState('')
  return (
    <Section title="Unirme con un código">
      <div className="p-4 space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CÓDIGO"
          className={inputCls + ' font-mono tracking-widest text-center'}
          maxLength={8}
        />
        <Btn variant="soft" onClick={() => onJoin(code.trim())} disabled={busy || code.trim().length < 4}>
          {busy ? <Loader2 size={18} className="animate-spin mx-auto" /> : <span className="inline-flex items-center justify-center gap-2"><Check size={18} /> Unirme</span>}
        </Btn>
      </div>
    </Section>
  )
}

function SpaceRow({
  active, icon, name, sub, onClick, loading,
}: {
  active: boolean; icon: React.ReactNode; name: string; sub: string; onClick: () => void; loading?: boolean
}) {
  return (
    <button onClick={onClick} disabled={loading} className="flex items-center gap-3 w-full px-4 py-3.5 disabled:opacity-60">
      <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${active ? 'bg-brand text-white' : 'bg-surface-2 text-muted'}`}>{icon}</span>
      <span className="flex-1 text-left min-w-0">
        <span className="font-medium block truncate">{name}</span>
        <span className="text-xs text-muted">{sub}</span>
      </span>
      {active && <Check size={18} className="text-brand-soft" />}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-faint uppercase tracking-wide px-5 mb-1.5">{title}</div>
      <div className="mx-3 bg-surface rounded-2xl divide-y divide-line/40 overflow-hidden">{children}</div>
    </div>
  )
}
