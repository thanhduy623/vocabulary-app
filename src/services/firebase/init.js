// Firebase initialization — the single entry point for the Firebase SDK.
//
// This module is the ONLY place (together with @/firebase/config.js) that
// imports from 'firebase/*'. Repositories import `db` from here; nothing else
// in the app touches the SDK directly (docs/architecture.md §2).

import { app } from '@/firebase/config'
import { getFirestore } from 'firebase/firestore'

/** Firestore database instance (exported to repositories only). */
export const db = getFirestore(app)

export { app }
export default app