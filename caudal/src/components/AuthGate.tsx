import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { firebaseEnabled } from '../lib/firebase'
import { watchAuth, signInGoogle, signOutUser } from '../store/sync'

interface AuthState {
  user: User | null
  cloud: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}
const AuthCtx = createContext<AuthState>({ user: null, cloud: false, signIn: async () => {}, signOut: async () => {} })
export const useAuth = () => useContext(AuthCtx)

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!firebaseEnabled)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!firebaseEnabled) return
    const unsub = watchAuth((u) => {
      setUser(u)
      setReady(true)
    })
    return unsub
  }, [])

  const signIn = async () => {
    setError('')
    setBusy(true)
    try {
      await signInGoogle()
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo iniciar sesión')
    } finally {
      setBusy(false)
    }
  }
  const doSignOut = async () => {
    await signOutUser()
    setUser(null)
  }

  const ctx: AuthState = { user, cloud: firebaseEnabled, signIn, signOut: doSignOut }

  // Modo local (sin Firebase configurado): app directa
  if (!firebaseEnabled) return <AuthCtx.Provider value={ctx}>{children}</AuthCtx.Provider>

  if (!ready) {
    return (
      <div className="min-h-full grid place-items-center text-muted">
        <div className="animate-pulse">Cargando…</div>
      </div>
    )
  }

  if (!user) {
    return <Login onGoogle={signIn} busy={busy} error={error} />
  }

  return <AuthCtx.Provider value={ctx}>{children}</AuthCtx.Provider>
}

function Login({ onGoogle, busy, error }: { onGoogle: () => void; busy: boolean; error: string }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-8 max-w-md mx-auto text-center safe-t safe-b">
      <div className="w-20 h-20 rounded-3xl bg-brand grid place-items-center mb-6 shadow-lg shadow-brand/30">
        <Logo />
      </div>
      <h1 className="text-3xl font-bold">Caudal</h1>
      <p className="text-muted mt-2 mb-10">Tus finanzas, sincronizadas en todos tus dispositivos.</p>

      <button
        onClick={onGoogle}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3.5 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        <GoogleIcon />
        {busy ? 'Conectando…' : 'Continuar con Google'}
      </button>
      {error && <p className="text-expense text-sm mt-4">{error}</p>}
      <p className="text-xs text-faint mt-8">Al continuar aceptas guardar tus datos de forma privada en tu cuenta.</p>
    </div>
  )
}

function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
      <path d="M14 42c6-20 30-20 36 0" stroke="white" strokeWidth="6" strokeLinecap="round" />
      <circle cx="32" cy="24" r="5" fill="#37c978" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
