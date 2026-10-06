import { useEffect, useState } from 'react'
import { Routes, Route, useSearchParams } from 'react-router-dom'
import { AuthGate, useAuth } from './components/AuthGate'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Accounts } from './pages/Accounts'
import { AccountDetail } from './pages/AccountDetail'
import { CreditCards } from './pages/CreditCards'
import { CardDetail } from './pages/CardDetail'
import { Categories } from './pages/Categories'
import { Budgets } from './pages/Budgets'
import { Recurring } from './pages/Recurring'
import { Reminders } from './pages/Reminders'
import { Reports } from './pages/Reports'
import { More } from './pages/More'
import { Collab } from './pages/Collab'
import { apiAcceptInvite } from './store/spaces'
import { setActiveSpace } from './store/sync'

export default function App() {
  return (
    <AuthGate>
      <InviteHandler />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/movimientos" element={<Transactions />} />
          <Route path="/cuentas" element={<Accounts />} />
          <Route path="/cuenta/:id" element={<AccountDetail />} />
          <Route path="/tarjetas" element={<CreditCards />} />
          <Route path="/tarjeta/:id" element={<CardDetail />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/presupuestos" element={<Budgets />} />
          <Route path="/recurrentes" element={<Recurring />} />
          <Route path="/recordatorios" element={<Reminders />} />
          <Route path="/reportes" element={<Reports />} />
          <Route path="/colaborar" element={<Collab />} />
          <Route path="/mas" element={<More />} />
        </Route>
      </Routes>
    </AuthGate>
  )
}

/** Procesa el enlace de invitación (?invite=CODE) una vez que hay sesión. */
function InviteHandler() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const code = params.get('invite')
    if (!user || !code) return
    let cancelled = false
    ;(async () => {
      try {
        const { spaceId, name } = await apiAcceptInvite(code)
        await setActiveSpace(spaceId)
        if (!cancelled) setMsg({ ok: true, text: `Te uniste a "${name}"` })
      } catch (e: any) {
        if (!cancelled) setMsg({ ok: false, text: e?.message || 'No se pudo unir al espacio' })
      } finally {
        params.delete('invite')
        setParams(params, { replace: true })
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3500)
    return () => clearTimeout(t)
  }, [msg])

  if (!msg) return null
  return (
    <div className="fixed top-4 inset-x-0 z-[60] flex justify-center px-4 animate-fade pointer-events-none">
      <div className={`max-w-md w-full rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${msg.ok ? 'bg-income text-white' : 'bg-expense text-white'}`}>
        {msg.text}
      </div>
    </div>
  )
}
