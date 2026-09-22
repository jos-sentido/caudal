import { useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet2, CreditCard, Bookmark, Wallet, Repeat, PieChart, Eye, EyeOff,
  Download, Upload, RotateCcw, Trash2, ChevronRight, Cloud, UserCircle2, LogOut, CloudOff,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuth } from '../components/AuthGate'
import { money } from '../lib/format'
import { totalCurrentBalance } from '../store/selectors'

export function More() {
  const s = useStore()
  const { user, cloud, signOut } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const bal = totalCurrentBalance(s.accounts, s.transactions)

  const exportJSON = () => {
    const data = {
      accounts: s.accounts, cards: s.cards, categories: s.categories,
      transactions: s.transactions, recurrings: s.recurrings, budgets: s.budgets, settings: s.settings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `caudal-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        s.importData(data)
        alert('Datos importados ✓')
      } catch {
        alert('Archivo inválido')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="pt-4 safe-t">
      {/* Perfil */}
      <div className="px-4 flex items-center gap-3 mb-5">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-surface grid place-items-center text-brand-soft">
            <UserCircle2 size={34} strokeWidth={1.5} />
          </div>
        )}
        <div className="min-w-0">
          <div className="font-bold text-lg truncate">{user?.displayName ?? 'Mi cuenta'}</div>
          <div className="text-sm text-muted truncate">
            {user?.email ?? `Balance total ${money(bal, { hide: s.settings.hideBalances })}`}
          </div>
        </div>
      </div>

      <Group title="Administrar">
        <Item to="/cuentas" icon={<Wallet2 size={20} />} label="Cuentas" />
        <Item to="/tarjetas" icon={<CreditCard size={20} />} label="Tarjetas de crédito" />
        <Item to="/categorias" icon={<Bookmark size={20} />} label="Categorías" />
        <Item to="/presupuestos" icon={<Wallet size={20} />} label="Presupuestos" />
        <Item to="/recurrentes" icon={<Repeat size={20} />} label="Transacciones recurrentes" />
      </Group>

      <Group title="Análisis">
        <Item to="/reportes" icon={<PieChart size={20} />} label="Reportes y gráficas" />
      </Group>

      <Group title="Ajustes">
        <button onClick={s.toggleHide} className="flex items-center gap-3 w-full px-4 py-3.5">
          <span className="text-muted">{s.settings.hideBalances ? <EyeOff size={20} /> : <Eye size={20} />}</span>
          <span className="flex-1 text-left font-medium">Ocultar saldos</span>
          <span className={`w-11 h-6 rounded-full p-1 transition-colors ${s.settings.hideBalances ? 'bg-brand' : 'bg-surface-2'}`}>
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${s.settings.hideBalances ? 'translate-x-5' : ''}`} />
          </span>
        </button>
        <button onClick={exportJSON} className="flex items-center gap-3 w-full px-4 py-3.5">
          <span className="text-muted"><Download size={20} /></span>
          <span className="flex-1 text-left font-medium">Exportar respaldo (JSON)</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-3.5">
          <span className="text-muted"><Upload size={20} /></span>
          <span className="flex-1 text-left font-medium">Importar respaldo</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJSON} />
      </Group>

      <Group title="Sincronización">
        {cloud && user ? (
          <>
            <div className="flex items-center gap-3 w-full px-4 py-3.5">
              <span className="text-income"><Cloud size={20} /></span>
              <span className="flex-1 text-left">
                <span className="font-medium block">Nube activa</span>
                <span className="text-xs text-muted">Sincronizando en tiempo real</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-income" />
            </div>
            <button onClick={signOut} className="flex items-center gap-3 w-full px-4 py-3.5 text-expense">
              <span><LogOut size={20} /></span>
              <span className="flex-1 text-left font-medium">Cerrar sesión</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 w-full px-4 py-3.5">
            <span className="text-muted"><CloudOff size={20} /></span>
            <span className="flex-1 text-left">
              <span className="font-medium block">Modo local</span>
              <span className="text-xs text-muted">Configura Firebase para sincronizar</span>
            </span>
          </div>
        )}
      </Group>

      <Group title="Datos">
        <button onClick={() => { if (confirm('¿Restaurar datos de ejemplo? Se reemplazará todo lo actual.')) s.resetSeed() }} className="flex items-center gap-3 w-full px-4 py-3.5">
          <span className="text-muted"><RotateCcw size={20} /></span>
          <span className="flex-1 text-left font-medium">Restaurar datos de ejemplo</span>
        </button>
        <button onClick={() => { if (confirm('¿Borrar TODOS los movimientos, cuentas y tarjetas? Esto no se puede deshacer.')) s.clearAll() }} className="flex items-center gap-3 w-full px-4 py-3.5 text-expense">
          <span><Trash2 size={20} /></span>
          <span className="flex-1 text-left font-medium">Empezar de cero</span>
        </button>
      </Group>

      <div className="text-center text-xs text-faint py-6">Caudal · v0.1 · hecho para ti</div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-faint uppercase tracking-wide px-4 mb-1.5">{title}</div>
      <div className="mx-3 bg-surface rounded-2xl divide-y divide-line/40 overflow-hidden">{children}</div>
    </div>
  )
}

function Item({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-muted">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight size={18} className="text-faint" />
    </Link>
  )
}
