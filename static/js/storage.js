export const Storage = {
  getSessionStats() {
    try { return JSON.parse(localStorage.getItem('pt_stats') || '[]'); } catch { return []; }
  },
  pushResult(result) {
    const all = Storage.getSessionStats();
    all.push({ ...result, ts: Date.now() });
    localStorage.setItem('pt_stats', JSON.stringify(all).slice(0, 200000));
  },
  clear() { localStorage.removeItem('pt_stats'); }
};



