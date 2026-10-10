
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
  const CACHE_MS = 15000;

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
        redirectTo: homeURL,
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

  async function performVerification() {
    let session;

    try {
      const response = await db.auth.getSession();

      if (response.error) throw response.error;

      session = response.data.session;
    } catch (error) {
      console.error('Session check failed:', error);

      return {
        verified: false,
        status: 'verification_failed'
      };
    }

    if (!session) {
      return {
        verified: false,
        status: 'logged_out'
      };
    }

    let user;

    try {
      user = await getSyndicateUser();
    } catch (error) {
      console.error('User check failed:', error);

      return {
        verified: false,
        status: 'verification_failed'
      };
    }

    if (!user) {
      return {
        verified: false,
        status: 'verification_failed'
      };
    }

    const token = getDiscordToken(session);

    if (!token) {
      return {
        verified: false,
        status: 'reconnect_required'
      };
    }

    try {
      const { data, error } = await db.functions.invoke(
        'verify-syndicate-member',
        {
          body: {
            discordAccessToken: token
          }
        }
      );

      if (error) {
        console.error('Membership request failed:', error);

        return {
          verified: false,
          status: data?.status || 'verification_failed'
        };
      }

      
if (data?.verified === true &&
    data?.status === 'member') {
  return {
    verified: true,
    status: 'member',
    isOfficer: data.isOfficer === true,
    checkedAt: data.checkedAt
  };
}


      return {
        verified: false,
        status: data?.status || 'verification_failed'
      };

    } catch (error) {
      console.error('Membership verification error:', error);

      return {
        verified: false,
        status: 'verification_failed'
      };
    }
  }

  async function verifyMembership(options = {}) {
    const force = options.force === true;

    if (!force &&
        cachedResult?.verified === true &&
        Date.now() - cachedAt < CACHE_MS) {
      return cachedResult;
    }

    // Reuse an ongoing verification request.
    if (verificationPromise) {
      return verificationPromise;
    }

    verificationPromise = performVerification();

    try {
      const result = await verificationPromise;

      if (result.verified === true) {
        cachedResult = result;
        cachedAt = Date.now();
      } else {
        cachedResult = null;
        cachedAt = 0;
      }

      return result;
    } finally {
      verificationPromise = null;
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
