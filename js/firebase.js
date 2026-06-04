/* firebase.js — Firebase initialization */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';

const firebaseConfig = {
  apiKey:            'AIzaSyDC0mjId_eWymL0WPDK747U08f1i47Kr3g',
  authDomain:        'travel-companion-b90ca.firebaseapp.com',
  projectId:         'travel-companion-b90ca',
  storageBucket:     'travel-companion-b90ca.firebasestorage.app',
  messagingSenderId: '354609961775',
  appId:             '1:354609961775:web:01e05b6a08461594955fda',
  measurementId:     'G-9HFRY40F8Y',
};

const app = initializeApp(firebaseConfig);

// Use persistent local cache (IndexedDB) for offline support — v12 API
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const auth = getAuth(app);
