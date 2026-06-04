/* state.js — shared application state to avoid circular imports */

export const State = {
  currentTripId: null,
  _navigateFn: null,
};

/**
 * Returns the currently active trip ID, or null if none selected.
 * @returns {string|null}
 */
export function getCurrentTripId() {
  return State.currentTripId;
}

/**
 * Sets the active trip ID and persists it to localStorage.
 * @param {string|null} id
 */
export function setCurrentTripId(id) {
  try {
    State.currentTripId = id;
    if (id) {
      localStorage.setItem('tc_current_trip', id);
    } else {
      localStorage.removeItem('tc_current_trip');
    }
  } catch (e) {
    // localStorage unavailable — state still updated in memory
  }
}

/**
 * Calls the registered navigation function if available.
 * The navigate function must be registered by app.js via State._navigateFn.
 * @param {string} page
 */
export function navigate(page) {
  try {
    if (typeof State._navigateFn === 'function') {
      State._navigateFn(page);
    }
  } catch (e) {
    // navigation handler not yet registered or threw
  }
}
