/* auth.js — anonymous authentication and display-name management */

import {
  signInAnonymously,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { auth } from './firebase.js';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _currentUser = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the currently signed-in Firebase user object, or null if not yet
 * authenticated.
 * @returns {import('firebase/auth').User|null}
 */
export function getCurrentUser() {
  return _currentUser;
}

/**
 * Initialises Firebase Authentication.
 *
 * Returns a Promise that resolves with the signed-in user once authentication
 * is complete.  If no user is currently signed in a new anonymous account is
 * created automatically.
 *
 * @returns {Promise<import('firebase/auth').User>}
 */
export function initAuth() {
  return new Promise((resolve, reject) => {
    try {
      // onAuthStateChanged fires once with the current auth state and then on
      // every subsequent change.  We only need to act on the first event here.
      const unsubscribe = onAuthStateChanged(
        auth,
        async user => {
          try {
            if (user) {
              _currentUser = user;
              unsubscribe(); // stop listening after the first resolved state
              resolve(user);
            } else {
              // No signed-in user — create an anonymous account.
              const credential = await signInAnonymously(auth);
              _currentUser = credential.user;
              unsubscribe();
              resolve(credential.user);
            }
          } catch (err) {
            unsubscribe();
            reject(err);
          }
        },
        err => {
          // onAuthStateChanged error handler
          reject(err);
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Returns the user's chosen display name stored in localStorage, or an empty
 * string if none has been set yet.
 *
 * @returns {string}
 */
export function getDisplayName() {
  try {
    return localStorage.getItem('tc_display_name') || '';
  } catch (e) {
    return '';
  }
}

/**
 * Persists the user's display name to localStorage.
 *
 * @param {string} name
 */
export function setDisplayName(name) {
  try {
    localStorage.setItem('tc_display_name', name || '');
  } catch (e) {
    // localStorage unavailable — silently ignore
  }
}
