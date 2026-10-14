
/* =========================================
   THE SYNDICATE
   SHARED DISCORD AUTHENTICATION
   ========================================= */

(() => {
  'use strict';

  const db = window.syndicateDB;

  if (!db) {
    console.error('Syndicate database connection missing.');
    return;
  }

  const script = document.currentScript;
  const siteRoot = new URL('../', script.src);
  const homeURL = new URL('index.html', siteRoot).href;

  const TOKEN_KEY = 'syndicate_discord_oauth';
  const TOKEN_MAX_AGE = 30 * 60 * 1000;
  const CACHE_MS = 30000;
  const RETRY_DELAYS_MS = [0, 650, 1600];
  const channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('syndicate-discord-tab-verification') : null;
  const pendingTokenRequests = new Map();

  let verificationPromise = null;
  let cachedResult = null;
  let cachedAt = 0;

  function clearVerificationCache() {
    cachedResult = null;
    cachedAt = 0;
    verificationPromise = null;
  }

  function saveDiscordToken(session) {
    if (!session?.provider_token || !session.user?.id) {
      return;
    }

    try {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
        token: session.provider_token,
        userId: session.user.id,
        savedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Discord token storage unavailable:', error);
    }
  }

  function getDiscordToken(session) {
    if (session?.provider_token) {
      saveDiscordToken(session);
      return session.provider_token;
    }

    try {
      const saved = JSON.parse(
        sessionStorage.getItem(TOKEN_KEY) || 'null'
      );

      if (!saved) return null;

      if (
        saved.userId !== session?.user?.id ||
        !saved.token ||
        !Number.isFinite(saved.savedAt) ||
        Date.now() - saved.savedAt >= TOKEN_MAX_AGE
      ) {
        sessionStorage.removeItem(TOKEN_KEY);
        return null;
      }

      return saved.token;
    } catch {
      return null;
    }
  }

  // Share an existing Discord provider token only on demand, only with another
  // open tab on this same origin. Never persist that token in localStorage.
  if (channel) {
    channel.onmessage = event => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'token-request' && msg.userId && msg.requestId) {
        try {
          const stored = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
          if (stored?.userId === msg.userId && stored.token &&
              Number.isFinite(stored.savedAt) &&
              Date.now() - stored.savedAt < TOKEN_MAX_AGE) {
            channel.postMessage({
              type: 'token-response', requestId: msg.requestId,
              userId: msg.userId, token: stored.token,
              savedAt: stored.savedAt
            });
          }
        } catch (error) { console.warn('Unable to share Discord session:', error); }
      } else if (msg.type === 'token-response') {
        const pending = pendingTokenRequests.get(msg.requestId);
        if (pending && pending.userId === msg.userId &&
            typeof msg.token === 'string' &&
            Number.isFinite(msg.savedAt) &&
            Date.now() - msg.savedAt < TOKEN_MAX_AGE) {
          pendingTokenRequests.delete(msg.requestId);
          pending.resolve({ token: msg.token, savedAt: msg.savedAt });
        }
      }
    };
  }

  async function requestTokenFromAnotherTab(session) {
    if (!channel || !session?.user?.id) return null;
    const userId = session.user.id;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const received = new Promise(resolve => {
      pendingTokenRequests.set(requestId, { userId, resolve });
      setTimeout(() => {
        if (pendingTokenRequests.has(requestId)) {
          pendingTokenRequests.delete(requestId);
          resolve(null);
        }
      }, 1200);
    });
    channel.postMessage({ type: 'token-request', requestId, userId });
    const result = await received;
    if (result) {
      try {
        sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
          token: result.token, userId, savedAt: result.savedAt
        }));
      } catch {}
      return result.token;
    }
    return null;
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
      } catch {}

      clearVerificationCache();
      return;
    }

    if (session?.provider_token) {
      saveDiscordToken(session);
    }

    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      cachedResult = null;
      cachedAt = 0;
    }
  });

  // =====================================
  // LOGIN / LOGOUT
  // =====================================

  async function loginWithDiscord() {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'discord',
      options: {
      redirectTo: window.location.href,
        scopes: 'identify email guilds.members.read'
      }
    });

    if (error) throw error;
    return { data, error: null };
  }

  async function logoutFromSyndicate() {
    const { error } = await db.auth.signOut();
    if (error) throw error;

    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}

    clearVerificationCache();
    window.location.replace(homeURL);
  }

  async function getSyndicateUser() {
    const { data, error } = await db.auth.getUser();

    if (error) throw error;
    return data.user || null;
  }

  // =====================================
  // SERVER MEMBERSHIP VERIFICATION
  // =====================================

  async function performVerificationOnce() {
    let session;
    try {
      const response = await db.auth.getSession();
      if (response.error) throw response.error;
      session = response.data.session;
    } catch (error) {
      console.warn('Syndicate session check temporarily failed:', error);
      return { verified: false, status: 'verification_failed' };
    }

    if (!session) return { verified: false, status: 'logged_out' };

    // Supabase sessions are shared across tabs; sessionStorage is not.
    // Recover the Discord provider token from another already-open tab.
    let token = getDiscordToken(session);
    if (!token) token = await requestTokenFromAnotherTab(session);
    if (!token) return { verified: false, status: 'reconnect_required' };

    try {
      const { data, error } = await db.functions.invoke('verify-syndicate-member', {
        body: { discordAccessToken: token }
      });
      if (error) {
        console.warn('Discord verification request failed:', error);
        return { verified: false, status: data?.status || 'verification_failed' };
      }
      if (data?.verified === true && data?.status === 'member') {
        return { verified: true, status: 'member',
          isOfficer: data.isOfficer === true, checkedAt: data.checkedAt };
      }
      return { verified: false, status: data?.status || 'verification_failed' };
    } catch (error) {
      console.warn('Discord verification temporarily failed:', error);
      return { verified: false, status: 'verification_failed' };
    }
  }

  async function performVerification() {
    let result;
    for (const delay of RETRY_DELAYS_MS) {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      result = await performVerificationOnce();
      // Only retry temporary failures, never definitive member/role decisions.
      if (result.status !== 'verification_failed') return result;
    }
    return result;
  }

  async function verifyMembership(options = {}) {
    const force = options.force === true;
    if (!force && cachedResult?.verified === true &&
        Date.now() - cachedAt < CACHE_MS) return cachedResult;
    if (verificationPromise) return verificationPromise;

    const request = performVerification();
    verificationPromise = request;
    try {
      const result = await request;
      if (result.verified === true) {
        cachedResult = result;
        cachedAt = Date.now();
      } else {
        cachedResult = null;
        cachedAt = 0;
      }
      return result;
    } finally {
      if (verificationPromise === request) verificationPromise = null;
    }
  }

  // =====================================
  // SHARED WEBSITE API
  // =====================================

  window.syndicateAuth = {
    login: loginWithDiscord,
    logout: logoutFromSyndicate,
    getUser: getSyndicateUser,
    verifyMembership,
    clearVerificationCache
  };

})();
