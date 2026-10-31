/* THE SYNDICATE — Privacy-conscious authenticated session counter.
 * Load AFTER settings/supabase-config.js and after your normal auth scripts.
 * Logs only session ID + authenticated user to the database; no page URLs.
 * One visit per browser tab's 30-minute activity window. Tabs are counted separately.
 */
(() => {
  'use strict';
  const KEY = 'syndicate_activity_session_v1';
  const IDLE_MS = 30 * 60 * 1000;
  const PING_MS = 5 * 60 * 1000;
  let lastPing = 0;
  let inFlight = false;
  let lastUser = null;

  function newUUID() {
    return crypto.randomUUID();
  }
  function sessionId(userId) {
    const now = Date.now();
    let record = null;
    try { record = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (_) {}
    if (!record || record.userId !== userId || !record.id ||
        !record.lastActive || now - record.lastActive >= IDLE_MS || record.lastActive > now) {
      record = { userId, id: newUUID(), lastActive: now };
    } else {
      record.lastActive = now;
    }
    try { sessionStorage.setItem(KEY, JSON.stringify(record)); } catch (_) {}
    return record.id;
  }
  async function recordActivity() {
    if (inFlight || document.visibilityState === 'hidden') return;
    const db = window.syndicateDB;
    if (!db?.auth?.getUser || !db?.rpc) return;
    inFlight = true;
    try {
      const { data, error } = await db.auth.getUser();
      const user = !error && data?.user;
      if (!user) return;
      const id = sessionId(user.id);
      if (lastUser !== user.id) { lastPing = 0; lastUser = user.id; }
      if (Date.now() - lastPing < PING_MS) return;
      const result = await db.rpc('syndicate_record_website_session', { p_session_id: id });
      if (!result.error) lastPing = Date.now();
      // Fail silently: analytics must never block normal website access.
    } catch (_) {
      // Ignore tracking failures.
    } finally {
      inFlight = false;
    }
  }
  function begin() {
    recordActivity();
    document.addEventListener('pointerdown', recordActivity, { passive: true });
    document.addEventListener('keydown', recordActivity);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') recordActivity();
    });
    window.addEventListener('focus', recordActivity);
    // Authentication may finish a moment after page load.
    window.addEventListener('syndicate-auth-ready', recordActivity);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
  else begin();
})();
