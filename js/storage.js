/* storage.js — localStorage wrapper with tc_ prefix */

const Storage = (() => {
  const PREFIX = 'tc_';

  function key(k) { return PREFIX + k; }

  function get(k, fallback = null) {
    try {
      const raw = localStorage.getItem(key(k));
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch(e) {
      return fallback;
    }
  }

  function set(k, v) {
    try {
      localStorage.setItem(key(k), JSON.stringify(v));
      return true;
    } catch(e) {
      showToast('儲存失敗，儲存空間可能不足', 'error');
      return false;
    }
  }

  function remove(k) {
    try { localStorage.removeItem(key(k)); } catch(e) {}
  }

  function getAll() {
    const result = {};
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => {
          try { result[k] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
        });
    } catch(e) {}
    return result;
  }

  function importAll(data) {
    try {
      Object.entries(data).forEach(([k, v]) => {
        if (k.startsWith(PREFIX)) localStorage.setItem(k, JSON.stringify(v));
      });
      return true;
    } catch(e) {
      return false;
    }
  }

  return { get, set, remove, getAll, importAll };
})();
