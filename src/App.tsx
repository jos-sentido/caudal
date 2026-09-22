import { Routes, Route } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Accounts } from './pages/Accounts'
import { AccountDetail } from './pages/AccountDetail'
import { CreditCards } from './pages/CreditCards'
import { Categories } from './pages/Categories'
import { Budgets } from './pages/Budgets'
import { Recurring } from './pages/Recurring'
import { Reports } from './pages/Reports'
import { More } from './pages/More'

export default function App() {
  return (
    <AuthGate>
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="/movimientos" element={<Transactions />} />
        <Route path="/cuentas" element={<Accounts />} />
        <Route path="/cuenta/:id" element={<AccountDetail />} />
        <Route path="/tarjetas" element={<CreditCards />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/presupuestos" element={<Budgets />} />
        <Route path="/recurrentes" element={<Recurring />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="/mas" element={<More />} />
      </Route>
    </Routes>
    </AuthGate>
  )
}
