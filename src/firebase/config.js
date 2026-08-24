// Firebase Web SDK initialization.
//
// Security note (SEC-1 in docs/analysis.md):
// NEVER import Admin SDK credentials here. This file holds only the PUBLIC
// Firebase Web SDK configuration, which is safe to ship in the browser.
// Real protection is enforced by Firestore Security Rules, not by this config.

import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyBo6FBLDIi_PU0qm5Q48C5JAvMRKmwuqyA',
  authDomain: 'inventory-service-6e309.firebaseapp.com',
  projectId: 'inventory-service-6e309',
  storageBucket: 'inventory-service-6e309.firebasestorage.app',
  messagingSenderId: '1052774553599',
  appId: '1:1052774553599:web:47977c6b851379830579ca',
  measurementId: 'G-C5RHYMLQFX',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

export { app, analytics }
export default app