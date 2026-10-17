/* THE SYNDICATE — Shared footer and officer-only shortcut.
   Save as settings/site-layout.js */
(() => {
  'use strict';

  const script = document.currentScript;
  const root = new URL('../', script?.src || document.baseURI);
  const url = path => new URL(path, root).href;
  let checkVersion = 0;

  function renderFooter() {
    if (document.querySelector('.syn-footer')) return;

    const footer = document.createElement('footer');
    footer.className = 'syn-footer';
    footer.innerHTML = `
      <div class="syn-footer__officer" hidden style="text-align:center;padding:1rem 1rem .6rem;">
        <a href="${url('officer/officer-hub.html')}"
           style="color:#d4af37;text-decoration:none;font-weight:600;letter-spacing:.05em;">
          ⚔ Officer's Corner ↗
        </a>
      </div>
      <div class="syn-footer__motto">
        <span class="syn-footer__motto-text">◆ THIS IS THE WAY ◆</span>
      </div>
      <div class="syn-footer__bottom">
        <a class="syn-footer__logo" href="${url('index.html')}" aria-label="The Syndicate home">
          <img src="${url('images/HeaderLogo.png')}" alt="The Syndicate">
        </a>
      </div>`;

    const target = document.getElementById('syndicate-footer');
    if (target) target.replaceWith(footer);
    else document.body.appendChild(footer);

    const officerLink = footer.querySelector('.syn-footer__officer');

    async function updateOfficerLink() {
      const version = ++checkVersion;
      officerLink.hidden = true; // Fail closed until officer verification succeeds.
      try {
        const auth = window.syndicateAuth;
        if (typeof auth?.verifyMembership !== 'function') return;
        const result = await auth.verifyMembership();
        if (version !== checkVersion || !footer.isConnected) return;
        officerLink.hidden = !(result?.verified === true &&
          result?.status === 'member' && result?.isOfficer === true);
      } catch (error) {
        console.warn('Officer footer link unavailable:', error);
      }
    }

    updateOfficerLink();

    // Re-check when the authenticated user changes, without initiating a new
    // verification directly inside Supabase's auth-state callback.
    const db = window.syndicateDB;
    if (db?.auth?.onAuthStateChange) {
      db.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          ++checkVersion;
          officerLink.hidden = true;
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setTimeout(updateOfficerLink, 0);
        }
      });
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', renderFooter, { once: true });
  else renderFooter();
})();
