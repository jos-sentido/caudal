import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}

/** true cuando hay configuración de Firebase (modo nube). Sin config → app 100% local. */
export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId && cfg.appId)

let app: FirebaseApp | undefined
let _auth: Auth | undefined
let _db: Firestore | undefined
export const googleProvider = new GoogleAuthProvider()

if (firebaseEnabled) {
  app = initializeApp(cfg)
  _auth = getAuth(app)
  _db = getFirestore(app)
}

export const auth = _auth
export const db = _db
