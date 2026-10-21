/* Shared poll page UI only. No privileged operations or direct database access. */
(() => {
  'use strict';
  window.syndicatePollsUI = {
    escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
    tabs(navSelector) {
      const controls = [...document.querySelectorAll(`${navSelector} [data-tab]`)];
      const sections = [...document.querySelectorAll('[data-panel]')];
      function show(name) {
        controls.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
        sections.forEach(s => s.classList.toggle('poll-hidden', s.dataset.panel !== name));
      }
      controls.forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
      if(controls.length) show(controls[0].dataset.tab);
    },
    localCountdown(end, output) {
      if (!output || !end) return;
      const diff = Math.max(0, new Date(end) - Date.now());
      output.textContent = diff ? `${Math.ceil(diff/3600000)} hours remaining` : 'Voting closed';
    },
    async verifiedClient() {
      const db=window.syndicateDB;
      if (!db || typeof db.auth?.getUser !== 'function') throw new Error('Supabase configuration could not be loaded.');
      const { data, error } = await db.auth.getUser();
      if (error || !data?.user) throw new Error('Please sign in with Discord.');
      return db;
    }
  };
})();
