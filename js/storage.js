/* storage.js — Firestore data layer replacing the old localStorage Storage object
 *
 * Collections layout
 * ──────────────────
 *  trips/{tripId}                       trip metadata (NO coverImage)
 *  trips/{tripId}/items/{itemId}        itinerary items
 *  budgets/{tripId}                     budget limit doc  { totalBudget }
 *  budgets/{tripId}/expenses/{expId}    expense items
 *  checklists/{tripId}                  { groups: [...], updatedAt }
 *  infos/{tripId}                       { flight, hotels, emergency, updatedAt }
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { db } from './firebase.js';
import { getCurrentUser, getDisplayName } from './auth.js';

// ---------------------------------------------------------------------------
// In-memory cache  (kept in sync by onSnapshot listeners)
// ---------------------------------------------------------------------------

const _cache = {
  trips:        [],               // Trip[]
  items:        new Map(),        // tripId → Item[]
  expenses:     new Map(),        // tripId → Expense[]
  checklists:   new Map(),        // tripId → checklist data
  infos:        new Map(),        // tripId → info data
  budgetLimits: new Map(),        // tripId → number
};

// ---------------------------------------------------------------------------
// Cache accessors  (synchronous reads for UI modules)
// ---------------------------------------------------------------------------

/** @returns {Array} all cached trips */
export function getCachedTrips() {
  return _cache.trips;
}

/** @returns {Object|null} */
export function getCachedTrip(id) {
  return _cache.trips.find(t => t.id === id) || null;
}

/** @returns {Array} */
export function getCachedItems(tripId) {
  return _cache.items.get(tripId) || [];
}

/** @returns {Array} */
export function getCachedExpenses(tripId) {
  return _cache.expenses.get(tripId) || [];
}

/** @returns {Object|null} */
export function getCachedChecklist(tripId) {
  return _cache.checklists.get(tripId) || null;
}

/** @returns {Object|null} */
export function getCachedInfo(tripId) {
  return _cache.infos.get(tripId) || null;
}

/** @returns {number} */
export function getCachedBudgetLimit(tripId) {
  return _cache.budgetLimits.get(tripId) || 0;
}

// ---------------------------------------------------------------------------
// LocalStorage helpers  (cover images are NOT stored in Firestore)
// ---------------------------------------------------------------------------

export const LocalStorage = {
  /**
   * Retrieves the base-64 cover image for a trip from localStorage.
   * @param {string} tripId
   * @returns {string|null}
   */
  getCover(tripId) {
    try {
      return localStorage.getItem('tc_cover_' + tripId) || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Stores a base-64 cover image in localStorage.
   * @param {string} tripId
   * @param {string} b64  base-64 encoded image string
   */
  setCover(tripId, b64) {
    try {
      localStorage.setItem('tc_cover_' + tripId, b64);
    } catch (e) {
      // storage quota exceeded or unavailable
    }
  },

  /**
   * Removes the cover image for a trip from localStorage.
   * @param {string} tripId
   */
  removeCover(tripId) {
    try {
      localStorage.removeItem('tc_cover_' + tripId);
    } catch (e) {
      // ignore
    }
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generates a random 6-character uppercase invite code.
 * @returns {string}
 */
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Returns a shallow copy of `data` with the `coverImage` field removed so
 * cover images are never accidentally written to Firestore.
 * @param {Object} data
 * @returns {Object}
 */
function stripCoverImage(data) {
  const copy = { ...data };
  delete copy.coverImage;
  return copy;
}

// ---------------------------------------------------------------------------
// Subscription functions  (each returns an unsubscribe function)
// ---------------------------------------------------------------------------

/**
 * Subscribes to all trips where the current user is a member.
 * Keeps _cache.trips up to date.
 *
 * @param {function(Array): void} callback
 * @returns {function} unsubscribe
 */
export function subscribeTrips(callback) {
  try {
    const user = getCurrentUser();
    if (!user) return () => {};

    const q = query(
      collection(db, 'trips'),
      where('members', 'array-contains', user.uid)
    );

    return onSnapshot(q, snapshot => {
      try {
        const trips = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // sort newest-created first to match original behaviour
        trips.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        _cache.trips = trips;
        callback(trips);
      } catch (e) {
        console.error('[storage] subscribeTrips snapshot error:', e);
      }
    }, err => {
      console.error('[storage] subscribeTrips error:', err);
    });
  } catch (e) {
    console.error('[storage] subscribeTrips setup error:', e);
    return () => {};
  }
}

/**
 * Subscribes to itinerary items for the given trip, ordered by date then order.
 * Keeps _cache.items up to date.
 *
 * @param {string} tripId
 * @param {function(Array): void} callback
 * @returns {function} unsubscribe
 */
export function subscribeItems(tripId, callback) {
  try {
    const q = query(
      collection(db, 'trips', tripId, 'items'),
      orderBy('date'),
      orderBy('order')
    );

    return onSnapshot(q, snapshot => {
      try {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        _cache.items.set(tripId, items);
        callback(items);
      } catch (e) {
        console.error('[storage] subscribeItems snapshot error:', e);
      }
    }, err => {
      console.error('[storage] subscribeItems error:', err);
    });
  } catch (e) {
    console.error('[storage] subscribeItems setup error:', e);
    return () => {};
  }
}

/**
 * Subscribes to expenses for the given trip.
 * Keeps _cache.expenses up to date.
 *
 * @param {string} tripId
 * @param {function(Array): void} callback
 * @returns {function} unsubscribe
 */
export function subscribeExpenses(tripId, callback) {
  try {
    const q = collection(db, 'budgets', tripId, 'expenses');

    return onSnapshot(q, snapshot => {
      try {
        const expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // sort newest first
        expenses.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        _cache.expenses.set(tripId, expenses);
        callback(expenses);
      } catch (e) {
        console.error('[storage] subscribeExpenses snapshot error:', e);
      }
    }, err => {
      console.error('[storage] subscribeExpenses error:', err);
    });
  } catch (e) {
    console.error('[storage] subscribeExpenses setup error:', e);
    return () => {};
  }
}

/**
 * Subscribes to the budget limit document for the given trip.
 * Keeps _cache.budgetLimits up to date.
 *
 * @param {string} tripId
 * @param {function(number): void} callback
 * @returns {function} unsubscribe
 */
export function subscribeBudgetLimit(tripId, callback) {
  try {
    const ref = doc(db, 'budgets', tripId);

    return onSnapshot(ref, snapshot => {
      try {
        const amount = snapshot.exists() ? (snapshot.data().totalBudget || 0) : 0;
        _cache.budgetLimits.set(tripId, amount);
        callback(amount);
      } catch (e) {
        console.error('[storage] subscribeBudgetLimit snapshot error:', e);
      }
    }, err => {
      console.error('[storage] subscribeBudgetLimit error:', err);
    });
  } catch (e) {
    console.error('[storage] subscribeBudgetLimit setup error:', e);
    return () => {};
  }
}

/**
 * Subscribes to the checklist document for the given trip.
 * Keeps _cache.checklists up to date.
 *
 * @param {string} tripId
 * @param {function(Object): void} callback
 * @returns {function} unsubscribe
 */
export function subscribeChecklist(tripId, callback) {
  try {
    const ref = doc(db, 'checklists', tripId);

    return onSnapshot(ref, snapshot => {
      try {
        const data = snapshot.exists() ? snapshot.data() : null;
        _cache.checklists.set(tripId, data);
        callback(data);
      } catch (e) {
        console.error('[storage] subscribeChecklist snapshot error:', e);
      }
    }, err => {
      console.error('[storage] subscribeChecklist error:', err);
    });
  } catch (e) {
    console.error('[storage] subscribeChecklist setup error:', e);
    return () => {};
  }
}

/**
 * Subscribes to the travel-info document for the given trip.
 * Keeps _cache.infos up to date.
 *
 * @param {string} tripId
 * @param {function(Object): void} callback
 * @returns {function} unsubscribe
 */
export function subscribeInfo(tripId, callback) {
  try {
    const ref = doc(db, 'infos', tripId);

    return onSnapshot(ref, snapshot => {
      try {
        const data = snapshot.exists() ? snapshot.data() : null;
        _cache.infos.set(tripId, data);
        callback(data);
      } catch (e) {
        console.error('[storage] subscribeInfo snapshot error:', e);
      }
    }, err => {
      console.error('[storage] subscribeInfo error:', err);
    });
  } catch (e) {
    console.error('[storage] subscribeInfo setup error:', e);
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// Async write functions — Trips
// ---------------------------------------------------------------------------

/**
 * Creates a new trip document in Firestore.
 *
 * @param {Object} data  trip fields (coverImage is stripped before writing)
 * @returns {Promise<string>} the new trip ID
 */
export async function createTrip(data) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('使用者未登入');

    const tripData = stripCoverImage({
      ...data,
      createdBy:   user.uid,
      members:     [user.uid],
      memberNames: { [user.uid]: getDisplayName() || '旅伴' },
      inviteCode:  generateInviteCode(),
      createdAt:   serverTimestamp(),
    });

    const ref = doc(collection(db, 'trips'));
    await setDoc(ref, tripData);
    return ref.id;
  } catch (e) {
    console.error('[storage] createTrip error:', e);
    throw e;
  }
}

/**
 * Updates an existing trip document.
 *
 * @param {string} tripId
 * @param {Object} data  fields to update (coverImage is stripped)
 * @returns {Promise<void>}
 */
export async function updateTrip(tripId, data) {
  try {
    const ref = doc(db, 'trips', tripId);
    await updateDoc(ref, stripCoverImage(data));
  } catch (e) {
    console.error('[storage] updateTrip error:', e);
    throw e;
  }
}

/**
 * Deletes a trip and all associated subcollection documents, budget data,
 * checklist, info, and the cover image from localStorage.
 *
 * Firestore does not automatically delete subcollections when a parent document
 * is deleted, so we batch-delete everything manually.
 *
 * @param {string} tripId
 * @returns {Promise<void>}
 */
export async function deleteTrip(tripId) {
  try {
    const batch = writeBatch(db);

    // --- itinerary items ---
    const itemsSnap = await getDocs(collection(db, 'trips', tripId, 'items'));
    itemsSnap.forEach(d => batch.delete(d.ref));

    // --- budget expenses ---
    const expSnap = await getDocs(collection(db, 'budgets', tripId, 'expenses'));
    expSnap.forEach(d => batch.delete(d.ref));

    // --- budget limit doc ---
    batch.delete(doc(db, 'budgets', tripId));

    // --- checklist doc ---
    batch.delete(doc(db, 'checklists', tripId));

    // --- info doc ---
    batch.delete(doc(db, 'infos', tripId));

    // --- trip doc itself ---
    batch.delete(doc(db, 'trips', tripId));

    await batch.commit();

    // --- cover image from localStorage ---
    LocalStorage.removeCover(tripId);
  } catch (e) {
    console.error('[storage] deleteTrip error:', e);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Async write functions — Itinerary Items
// ---------------------------------------------------------------------------

/**
 * Adds an itinerary item to a trip.
 *
 * @param {string} tripId
 * @param {Object} data
 * @returns {Promise<string>} the new item ID
 */
export async function createItem(tripId, data) {
  try {
    const user = getCurrentUser();
    const itemData = {
      ...data,
      lastEditBy:   user ? user.uid : null,
      lastEditName: getDisplayName() || '旅伴',
      updatedAt:    serverTimestamp(),
    };

    const ref = doc(collection(db, 'trips', tripId, 'items'));
    await setDoc(ref, itemData);
    return ref.id;
  } catch (e) {
    console.error('[storage] createItem error:', e);
    throw e;
  }
}

/**
 * Updates an existing itinerary item.
 *
 * @param {string} tripId
 * @param {string} itemId
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function updateItem(tripId, itemId, data) {
  try {
    const user = getCurrentUser();
    const ref = doc(db, 'trips', tripId, 'items', itemId);
    await updateDoc(ref, {
      ...data,
      lastEditBy:   user ? user.uid : null,
      lastEditName: getDisplayName() || '旅伴',
      updatedAt:    serverTimestamp(),
    });
  } catch (e) {
    console.error('[storage] updateItem error:', e);
    throw e;
  }
}

/**
 * Deletes an itinerary item.
 *
 * @param {string} tripId
 * @param {string} itemId
 * @returns {Promise<void>}
 */
export async function deleteItem(tripId, itemId) {
  try {
    await deleteDoc(doc(db, 'trips', tripId, 'items', itemId));
  } catch (e) {
    console.error('[storage] deleteItem error:', e);
    throw e;
  }
}

/**
 * Re-orders itinerary items by writing each item's new index as its `order`
 * field in a single atomic batch.
 *
 * @param {string}   tripId
 * @param {string[]} orderedIds  item IDs in their desired display order
 * @returns {Promise<void>}
 */
export async function batchUpdateItemOrder(tripId, orderedIds) {
  try {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
      const ref = doc(db, 'trips', tripId, 'items', id);
      batch.update(ref, { order: index });
    });
    await batch.commit();
  } catch (e) {
    console.error('[storage] batchUpdateItemOrder error:', e);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Async write functions — Budget / Expenses
// ---------------------------------------------------------------------------

/**
 * Creates a new expense document for a trip.
 *
 * @param {string} tripId
 * @param {Object} data
 * @returns {Promise<string>} the new expense ID
 */
export async function createExpense(tripId, data) {
  try {
    const expData = {
      ...data,
      createdAt: serverTimestamp(),
    };
    const ref = doc(collection(db, 'budgets', tripId, 'expenses'));
    await setDoc(ref, expData);
    return ref.id;
  } catch (e) {
    console.error('[storage] createExpense error:', e);
    throw e;
  }
}

/**
 * Deletes an expense document.
 *
 * @param {string} tripId
 * @param {string} expenseId
 * @returns {Promise<void>}
 */
export async function deleteExpense(tripId, expenseId) {
  try {
    await deleteDoc(doc(db, 'budgets', tripId, 'expenses', expenseId));
  } catch (e) {
    console.error('[storage] deleteExpense error:', e);
    throw e;
  }
}

/**
 * Saves the total budget limit for a trip.  Uses merge so other fields on the
 * budget doc (if any) are preserved.
 *
 * @param {string} tripId
 * @param {number} amount
 * @returns {Promise<void>}
 */
export async function saveBudgetLimit(tripId, amount) {
  try {
    await setDoc(
      doc(db, 'budgets', tripId),
      { totalBudget: Number(amount) || 0 },
      { merge: true }
    );
  } catch (e) {
    console.error('[storage] saveBudgetLimit error:', e);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Async write functions — Checklist
// ---------------------------------------------------------------------------

/**
 * Saves the full checklist groups array for a trip.
 *
 * @param {string} tripId
 * @param {Array}  groups
 * @returns {Promise<void>}
 */
export async function saveChecklist(tripId, groups) {
  try {
    await setDoc(doc(db, 'checklists', tripId), {
      groups,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[storage] saveChecklist error:', e);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Async write functions — Travel Info
// ---------------------------------------------------------------------------

/**
 * Saves the travel info document for a trip (flight, hotels, emergency contact).
 *
 * @param {string} tripId
 * @param {Object} data  { flight, hotels, emergency }
 * @returns {Promise<void>}
 */
export async function saveInfo(tripId, data) {
  try {
    await setDoc(doc(db, 'infos', tripId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[storage] saveInfo error:', e);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Data export helper
// ---------------------------------------------------------------------------

/**
 * Returns a plain-object snapshot of all cached data, suitable for JSON
 * serialisation and download as a backup file.
 *
 * @returns {Object}
 */
export function exportAllData() {
  try {
    const result = {
      exportedAt: new Date().toISOString(),
      trips: _cache.trips.map(trip => ({
        ...trip,
        items:       getCachedItems(trip.id),
        expenses:    getCachedExpenses(trip.id),
        checklist:   getCachedChecklist(trip.id),
        info:        getCachedInfo(trip.id),
        budgetLimit: getCachedBudgetLimit(trip.id),
      })),
    };
    return result;
  } catch (e) {
    console.error('[storage] exportAllData error:', e);
    return { exportedAt: new Date().toISOString(), trips: [] };
  }
}

