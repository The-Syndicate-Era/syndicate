/* THE SYNDICATE — SHARED DISCORD AUTHENTICATION */
(() => {
  'use strict';
  const db = window.syndicateDB;
  if (!db) { console.error('Syndicate database connection missing.'); return; }

  const script = document.currentScript;
  const siteRoot = new URL('../', script.src);
  const homeURL = new URL('index.html', siteRoot).href;
  const TOKEN_KEY = 'syndicate_discord_oauth';
  const VERIFIED_KEY = 'syndicate_member_verification_v2';
  const LIMIT_KEY = 'syndicate_verification_cooldown_v2';
  const LOCK_KEY = 'syndicate_verification_inflight_v2';
  const TOKEN_MAX_AGE = 30 * 60 * 1000;
  const VERIFIED_MS = 5 * 60 * 1000;
  const LIMIT_MS = 60 * 1000;
  const LOCK_MS = 10000;
  let verificationPromise = null;
  let cachedResult = null;
  let cachedUserId = null;
  let cachedAt = 0;

  function readShared(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function writeShared(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  function removeShared(key) {
    try { localStorage.removeItem(key); } catch {}
  }
  function clearVerificationCache() {
    cachedResult = null; cachedUserId = null; cachedAt = 0;
    removeShared(VERIFIED_KEY);
    // Do not reset an active request or remove a global Discord cooldown.
  }
  function saveDiscordToken(session) {
    if (!session?.provider_token || !session.user?.id) return;
    try {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
        token: session.provider_token, userId: session.user.id, savedAt: Date.now()
      }));
    } catch (error) { console.warn('Discord token storage unavailable:', error); }
  }
  function getDiscordToken(session) {
    if (session?.provider_token) { saveDiscordToken(session); return session.provider_token; }
    try {
      const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
      if (!saved) return null;
      if (saved.userId !== session?.user?.id || !saved.token ||
          !Number.isFinite(saved.savedAt) || Date.now() - saved.savedAt >= TOKEN_MAX_AGE) {
        sessionStorage.removeItem(TOKEN_KEY); return null;
      }
      return saved.token;
    } catch { return null; }
  }
  function verifiedFor(userId) {
    const now = Date.now();
    if (cachedResult?.verified && cachedUserId === userId && now - cachedAt < VERIFIED_MS)
      return cachedResult;
    const shared = readShared(VERIFIED_KEY);
    if (shared?.userId === userId && shared?.result?.verified === true &&
        shared.result.status === 'member' && Number.isFinite(shared.at) &&
        shared.at <= now && now - shared.at < VERIFIED_MS) {
      cachedResult = shared.result; cachedUserId = userId; cachedAt = shared.at;
      return cachedResult;
    }
    return null;
  }
  function setVerified(userId, result) {
    cachedResult = result; cachedUserId = userId; cachedAt = Date.now();
    // Share only the short-lived verification RESULT, never Discord bearer tokens.
    writeShared(VERIFIED_KEY, { userId, result, at: cachedAt });
  }
  function cooldownActive() {
    const value = readShared(LIMIT_KEY);
    return Number.isFinite(value?.until) && value.until > Date.now();
  }
  function startCooldown(ms = LIMIT_MS) {
    writeShared(LIMIT_KEY, { until: Date.now() + ms });
  }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
      clearVerificationCache();
      return;
    }
    if (session?.provider_token) saveDiscordToken(session);
    // An ordinary SIGNED_IN event can be emitted during session refresh or on another tab.
    // Don't discard an existing, still-valid membership check on that event.
    if (session?.user?.id && cachedUserId && cachedUserId !== session.user.id)
      clearVerificationCache();
  });

  async function loginWithDiscord() {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.href, scopes: 'identify email guilds.members.read' }
    });
    if (error) throw error;
    return { data, error: null };
  }
  async function logoutFromSyndicate() {
    const { error } = await db.auth.signOut();
    if (error) throw error;
    try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
    clearVerificationCache();
    window.location.replace(homeURL);
  }
  async function getSyndicateUser() {
    const { data, error } = await db.auth.getUser();
    if (error) throw error;
    return data.user || null;
  }

  async function performVerification(session, userId) {
    const token = getDiscordToken(session);
    if (!token) return { verified: false, status: 'reconnect_required' };
    try {
      const { data, error } = await db.functions.invoke('verify-syndicate-member', {
        body: { discordAccessToken: token }
async function performVerification(session, userId) {
  try {
    const { data, error } = await db.functions.invoke(
      'verify-syndicate-member'
    );

    if (error) {
      const status = error?.context?.status;

      console.warn(
        'Discord verification failed:',
        status || 'unknown'
      );

      if (status === 429) {
        startCooldown();

        return {
          verified: false,
          status: 'rate_limited'
        };
      }

      if (status === 401) {
        return {
          verified: false,
          status: 'logged_out'
        };
      }

      return {
        verified: false,
        status: 'verification_failed'
      };
    }

    if (
      data?.verified === true &&
      data?.status === 'member'
    ) {
      const result = {
        verified: true,
        status: 'member',
        isOfficer: data.isOfficer === true,
        isGuildMember: data.isGuildMember === true,
        checkedAt: data.checkedAt
      };

      setVerified(userId, result);

      return result;
    }

    if (data?.status === 'rate_limited') {
      startCooldown();
    }

    return {
      verified: false,
      status: data?.status || 'verification_failed'
    };

  } catch (error) {
    console.warn('Membership verification failed:', error);

    return {
      verified: false,
      status: 'verification_failed'
    };
  }
}

  async function verifyMembership(options = {}) {
    // Intentionally reuse a recent successful result even if legacy callers use force:true.
    // That prevents independently loaded Officer pages from bypassing the rate-limit guard.
    if (verificationPromise) return verificationPromise;
    verificationPromise = (async () => {
      let session;
      try {
        const response = await db.auth.getSession();
        if (response.error) throw response.error;
        session = response.data.session;
      } catch (error) {
        console.warn('Session check failed:', error);
        return { verified: false, status: 'verification_failed' };
      }
      if (!session?.user?.id) return { verified: false, status: 'logged_out' };
      const userId = session.user.id;
      const cached = verifiedFor(userId);
      if (cached) return cached;
      if (cooldownActive()) return { verified: false, status: 'rate_limited' };

      // Coordinate first-time verification across tabs; only one tab contacts Discord.
      const existing = readShared(LOCK_KEY);
      if (existing?.until > Date.now() && existing.userId === userId) {
        const waitUntil = Math.min(existing.until, Date.now() + 7000);
        while (Date.now() < waitUntil) {
          await delay(300);
          const result = verifiedFor(userId);
          if (result) return result;
          if (cooldownActive()) return { verified: false, status: 'rate_limited' };
          const live = readShared(LOCK_KEY);
          if (!live || live.until <= Date.now()) break;
        }
      }
      if (cooldownActive()) return { verified: false, status: 'rate_limited' };
      const recentlyVerified = verifiedFor(userId);
      if (recentlyVerified) return recentlyVerified;
      const lockId = Math.random().toString(36).slice(2) + Date.now();
      writeShared(LOCK_KEY, { userId, id: lockId, until: Date.now() + LOCK_MS });
      // Give concurrent tabs time to see the shared lock.
      await delay(90);
      const lock = readShared(LOCK_KEY);
      if (lock?.id !== lockId) {
        for (let n = 0; n < 24; n++) {
          await delay(300);
          const result = verifiedFor(userId);
          if (result) return result;
          if (cooldownActive()) return { verified: false, status: 'rate_limited' };
          if (!readShared(LOCK_KEY)) break;
        }
        return { verified: false, status: 'verification_failed' };
      }
      try {
        return await performVerification(session, userId);
      } finally {
        if (readShared(LOCK_KEY)?.id === lockId) removeShared(LOCK_KEY);
      }
    })();
    try { return await verificationPromise; }
    finally { verificationPromise = null; }
  }

  window.syndicateAuth = {
    login: loginWithDiscord, logout: logoutFromSyndicate,
    getUser: getSyndicateUser, verifyMembership, clearVerificationCache
  };
})();
