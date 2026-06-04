/* firebase.js — Firebase app initialization, Firestore and Auth exports
 *
 * SETUP: Replace every "YOUR_..." placeholder below with your real Firebase
 * project credentials. Find them in the Firebase console at:
 * https://console.firebase.google.com → Project Settings → General → Your Apps
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  enableIndexedDbPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ---------------------------------------------------------------------------
// Replace these placeholders with your Firebase project configuration.
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_AUTH_DOMAIN',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
};
// ---------------------------------------------------------------------------

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence via IndexedDB so the app works without network.
// The promise is intentionally not awaited — persistence is best-effort and
// failures (e.g. multiple tabs) are non-fatal.
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open; persistence can only be enabled in one tab at a time.
    console.warn('[Firebase] IndexedDB persistence unavailable: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support IndexedDB persistence.
    console.warn('[Firebase] IndexedDB persistence not supported in this browser.');
  } else {
    console.warn('[Firebase] enableIndexedDbPersistence error:', err);
  }
});
