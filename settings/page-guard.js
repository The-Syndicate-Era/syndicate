
/* =========================================
   THE SYNDICATE
   PROTECTED PAGE ACCESS GUARD
   ========================================= */

(() => {
  'use strict';

  const script = document.currentScript;
  const siteRoot = new URL('../', script.src);
  const homeURL = new URL('index.html', siteRoot).href;

  const RETURN_KEY = 'syndicate_return_to';

  let checking = false;

  function rememberDestination() {
    try {
      sessionStorage.setItem(
        RETURN_KEY,
        window.location.pathname +
        window.location.search +
        window.location.hash
      );
    } catch {}
  }

  function grantAccess() {
    document.documentElement.classList.remove(
      'syn-access-pending'
    );

    document.documentElement.classList.add(
      'syn-access-granted'
    );

    document.getElementById(
      'syndicate-access-message'
    )?.remove();

    console.info(
      'Syndicate membership verified. Page unlocked.'
    );
  }

  function showAccessMessage(title, message, action) {
    document.getElementById(
      'syndicate-access-message'
    )?.remove();

    const panel = document.createElement('section');
    panel.id = 'syndicate-access-message';
    panel.setAttribute('role', 'status');

    Object.assign(panel.style, {
      maxWidth: '34rem',
      margin: '5rem auto',
      padding: '2rem',
      textAlign: 'center',
      background: '#15110d',
      border: '1px solid #8f7320',
      color: '#d8c98f',
      fontFamily: 'Georgia, serif'
    });

    const heading = document.createElement('h2');
    heading.textContent = title;
    heading.style.color = '#d4af37';

    const description = document.createElement('p');
    description.textContent = message;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent =
      action === 'reconnect' ? 'CONNECT WITH DISCORD' :
      action === 'home' ? 'RETURN HOME' :
      'TRY AGAIN';

    Object.assign(button.style, {
      marginTop: '1rem',
      padding: '0.8rem 1.5rem',
      background: '#241b10',
      border: '1px solid #d4af37',
      color: '#d4af37',
      cursor: 'pointer'
    });

    button.addEventListener('click', async () => {
      if (action === 'home') {
        window.location.replace(homeURL);
        return;
      }

      if (action === 'reconnect') {
        rememberDestination();

        try {
          await window.syndicateAuth.login();
        } catch (error) {
          console.error('Discord reconnect failed:', error);
          showAccessMessage(
            'Connection Failed',
            'Unable to reconnect Discord. Please try again.',
            'reconnect'
          );
        }

        return;
      }

      button.disabled = true;
      button.textContent = 'VERIFYING...';

      await checkPageAccess();
    });

    panel.append(heading, description, button);
    document.body.appendChild(panel);
  }

  async function checkPageAccess() {
    if (checking) return;

    if (
      window.location.pathname === homeURL.pathname ||
      window.location.pathname === siteRoot.pathname
    ) {
      grantAccess();
      return;
    }

    checking = true;

    document.documentElement.classList.add(
      'syn-access-pending'
    );

    try {
      const auth = window.syndicateAuth;

      if (!auth ||
          typeof auth.verifyMembership !== 'function') {
        showAccessMessage(
          'Verification Unavailable',
          'Unable to initialize Discord verification.',
          'retry'
        );
        return;
      }

const result = await auth.verifyMembership();

console.log('Page guard verification result:', result);

      if (result?.verified === true &&
          result?.status === 'member') {
        grantAccess();
        return;
      }

      if (result?.status === 'logged_out') {
        rememberDestination();
        window.location.replace(homeURL);
        return;
      }

      if (result?.status === 'reconnect_required') {
        showAccessMessage(
          'Discord Reconnection Required',
          'Reconnect your Discord account to verify Syndicate membership.',
          'reconnect'
        );
        return;
      }

      if (result?.status === 'not_member') {
        showAccessMessage(
          'Syndicate Membership Required',
          'This Discord account could not be confirmed as a member of The Syndicate server.',
          'home'
        );
        return;
      }

      showAccessMessage(
        'Verification Unavailable',
        'We could not confirm your Syndicate membership right now. Please try again.',
        'retry'
      );

    } catch (error) {
      console.error('Page access check failed:', error);

      showAccessMessage(
        'Verification Unavailable',
        'Membership verification encountered an error.',
        'retry'
      );

    } finally {
      checking = false;
    }
  }

  checkPageAccess();
})();
