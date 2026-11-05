/* ============================================================
   store.js — persistence.

   Everything lives in this browser's localStorage. Nothing is
   uploaded. localStorage can be unavailable (private windows,
   blocked site data), so every access is wrapped: the app has to
   work, in memory, even when saving silently fails.
   ============================================================ */

const Store = (function () {
  const KEY = 'the-desk-v1';
  const EMPTY = { version: 1, completions: [], profile: {} };

  let state = structuredClone(EMPTY);

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign(structuredClone(EMPTY), JSON.parse(raw));
    } catch (e) {
      // Private window, blocked storage, or corrupt JSON. Carry on in memory.
      console.warn('The Desk: could not read saved data, starting fresh.', e);
    }
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn('The Desk: could not save. Progress will be lost on reload.', e);
      return false;
    }
  }

  return {
    load,
    all:         () => state,
    completions: () => state.completions,
    profile:     () => state.profile,

    addCompletion(c) {
      state.completions.push({ id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6), ...c });
      save();
    },

    setProfile(patch) {
      state.profile = { ...state.profile, ...patch };
      save();
    },

    /** Download the whole store as JSON. */
    exportFile() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `the-desk-${new Date().toLocaleDateString('en-CA')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    /**
     * Merge a previously exported file in. Completions are merged by id
     * rather than replaced, so importing an older backup never loses
     * work done since.
     */
    async importFile(file) {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.completions)) throw new Error('Not a Desk export');
      const seen = new Set(state.completions.map(c => c.id));
      let added = 0;
      data.completions.forEach(c => { if (c && c.id && !seen.has(c.id)) { state.completions.push(c); added++; } });
      state.profile = { ...data.profile, ...state.profile };
      save();
      return added;
    },

    reset() {
      state = structuredClone(EMPTY);
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing to do */ }
    }
  };
})();
