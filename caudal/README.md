# Caudal

App de finanzas personales (PWA) — control de gastos, ingresos, cuentas, tarjetas de crédito, presupuestos, recurrentes y reportes. Inspirada en Mobills, hecha a la medida.

## Stack

- **React 19 + Vite + TypeScript**
- **Tailwind CSS v4**
- **Zustand** (estado + persistencia local)
- **Firebase** (Auth con Google + Firestore) — sincronización en la nube
- **Recharts** · **lucide-react** · **PWA** (instalable)

## Desarrollo

```bash
pnpm install
pnpm dev
```

Sin variables de entorno, la app corre en **modo local** (datos en el navegador).
Para activar la nube, crea `.env.local` a partir de `.env.example` con la config de Firebase.

## Build

```bash
pnpm build      # genera dist/
```

## Variables de entorno (Firebase)

Ver `.env.example`. En Vercel se configuran en *Project Settings → Environment Variables*.

## Seguridad

Las reglas de Firestore (`firestore.rules`) restringen cada usuario a sus propios datos
(`users/{uid}/**`).
