
/* =========================================
   THE SYNDICATE
   DISCORD AUTHENTICATION & MEMBERSHIP
   ========================================= */

(() => {
  'use strict';

  // Use the existing shared Supabase connection.
  const db = window.syndicateDB;

  if (!db) {
    console.error('Syndicate Supabase connection missing.');
    return;
  }

  const HOME_URL = new URL(
    'index.html',
    new URL('../', document.currentScript.src)
  ).href;

  const FUNCTION_NAME = 'verify-syndicate-member';

  // Temporary storage for Discord's OAuth token.
  // This is NOT the Supabase session token.
  const TOKEN_KEY = 'syndicate_discord_oauth';
  const TOKEN_LIFETIME = 30 * 60 * 1000;

  let discordToken = null;
  let tokenSavedAt = 0;

  function clearDiscordToken() {
    discordToken = null;
    tokenSavedAt = 0;

    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn('Token storage unavailable:', error);
    }
  }

  function rememberDiscordToken(session) {
    if (!session?.provider_token) return;

    discordToken = session.provider_token;
    tokenSavedAt = Date.now();

    try {
      sessionStorage.setItem(
        TOKEN_KEY,
        JSON.stringify({
          token: discordToken,
          savedAt: tokenSavedAt,
          userId: session.user?.id
        })
      );
    } catch (error) {
      console.warn('Unable to store Discord token:', error);
    }
  }

  function getStoredDiscordToken(userId) {
    if (
      discordToken &&
      Date.now() - tokenSavedAt < TOKEN_LIFETIME
    ) {
      return discordToken;
    }

    try {
      const raw = sessionStorage.getItem(TOKEN_KEY);
      if (!raw) return null;

      const saved = JSON.parse(raw);

      if (
        saved.userId !== userId ||
        typeof saved.token !== 'string' ||
        Date.now() - saved.savedAt >= TOKEN_LIFETIME
      ) {
        clearDiscordToken();
        return null;
      }

      discordToken = saved.token;
      tokenSavedAt = saved.savedAt;

      return discordToken;
    } catch {
      clearDiscordToken();
      return null;
    }
  }

  // Capture the Discord token after OAuth completes.
  // Do not make additional Supabase API calls
  // synchronously inside this callback.
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      clearDiscordToken();
      return;
    }

    if (session?.provider_token) {
      rememberDiscordToken(session);
    }
  });

  // =====================================
  // LOGIN
  // =====================================

  async function loginWithDiscord() {
    const { data, error } =
      await db.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: HOME_URL,
          scopes: 'identify email guilds.members.read'
        }
      });

    if (error) {
      console.error('Discord login failed:', error);
      throw error;
    }

    return { data, error: null };
  }

  // =====================================
  // LOGOUT
  // =====================================

  async function logoutFromSyndicate() {
    const { error } = await db.auth.signOut();

    if (error) {
      console.error('Discord logout failed:', error);
      throw error;
    }

    clearDiscordToken();
    window.location.href = HOME_URL;
  }

  // =====================================
  // GET CURRENT USER
  // =====================================

  async function getSyndicateUser() {
    const { data, error } = await db.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  // =====================================
  // VERIFY SERVER MEMBERSHIP
  // =====================================

  async function verifyMembership() {

    // First confirm Supabase authentication.
    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError || !sessionData.session) {
      return {
        verified: false,
        status: 'logged_out'
      };
    }

    const session = sessionData.session;

    // Get an independently validated user.
    const user = await getSyndicateUser();

    if (!user) {
      return {
        verified: false,
        status: 'logged_out'
      };
    }

    // Capture a newly supplied OAuth token.
    rememberDiscordToken(session);

    const token = getStoredDiscordToken(user.id);

    if (!token) {
      return {
        verified: false,
        status: 'reconnect_required',
        message: 'Reconnect Discord to verify membership.'
      };
    }

    // Ask the secure Edge Function to check Discord.
    try {
      const { data, error } =
        await db.functions.invoke(FUNCTION_NAME, {
          body: {
            discordAccessToken: token
          }
        });

      if (error) {
        console.error('Membership function error:', error);

        return {
          verified: false,
          status: 'verification_failed',
          message: 'Unable to verify membership right now.'
        };
      }

      if (data?.verified === true &&
          data?.status === 'member') {
        return {
          verified: true,
          status: 'member',
          checkedAt: data.checkedAt
        };
      }

      if (data?.status === 'not_member') {
        return {
          verified: false,
          status: 'not_member',
          message: 'This Discord account is not in The Syndicate server.'
        };
      }

      return {
        verified: false,
        status: 'verification_failed',
        message: data?.error || 'Membership could not be verified.'
      };

    } catch (error) {
      console.error('Membership verification failed:', error);

      return {
        verified: false,
        status: 'verification_failed',
        message: 'Membership verification is unavailable.'
      };
    }
  }

  // Shared interface for every Syndicate page.
  window.syndicateAuth = {
    login: loginWithDiscord,
    logout: logoutFromSyndicate,
    getUser: getSyndicateUser,
    verifyMembership: verifyMembership
  };

})();
