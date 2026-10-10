
/* =========================================
   THE SYNDICATE
   PROTECTED PAGE ACCESS GUARD
   ========================================= */

(() => {
  'use strict';

  const script = document.currentScript;

  // Determine the website root from the shared
  // settings folder. Works on subpages too.
  const siteRoot = new URL('../', script.src);
  const homeURL = new URL('index.html', siteRoot);

  const RETURN_KEY = 'syndicate_return_to';

  function rememberDestination() {
    try {
      sessionStorage.setItem(
        RETURN_KEY,
        window.location.pathname +
        window.location.search +
        window.location.hash
      );
    } catch (error) {
      console.warn(
        'Unable to remember destination:',
        error
      );
    }
  }

  function denyAccess(reason) {
    console.warn(
      'Syndicate page access denied:',
      reason
    );

    rememberDestination();

    // Send visitor to the public homepage.
    window.location.replace(homeURL.href);
  }

  function grantAccess() {
    // Make the protected page visible.
    document.documentElement.classList.remove(
      'syn-access-pending'
    );

    document.documentElement.classList.add(
      'syn-access-granted'
    );

    console.info(
      'Syndicate membership verified. Page unlocked.'
    );
  }

  async function checkPageAccess() {
    // Home is always public.
    if (
      window.location.pathname === homeURL.pathname ||
      window.location.pathname === siteRoot.pathname
    ) {
      grantAccess();
      return;
    }

    const auth = window.syndicateAuth;

    if (
      !auth ||
      typeof auth.getUser !== 'function' ||
      typeof auth.verifyMembership !== 'function'
    ) {
      denyAccess('Authentication unavailable');
      return;
    }

    try {
      // Step 1: Confirm active login.
      const user = await auth.getUser();

      if (!user) {
        denyAccess('Not logged in');
        return;
      }

      // Step 2: Verify Discord server membership.
      const result = await auth.verifyMembership();

      if (
        result?.verified === true &&
        result?.status === 'member'
      ) {
        grantAccess();
        return;
      }

      // All other results deny access.
      denyAccess(result?.status || 'Not verified');

    } catch (error) {
      console.error(
        'Syndicate access check failed:',
        error
      );

      denyAccess('Verification error');
    }
  }

  checkPageAccess();
})();
