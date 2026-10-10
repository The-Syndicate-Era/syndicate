/* =========================================
   THE SYNDICATE
   DARK COUNCIL ACCESS GUARD
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
      sessionStorage.setItem(RETURN_KEY,
        window.location.pathname + window.location.search + window.location.hash);
    } catch (error) {
      console.warn('Unable to remember destination:', error);
    }
  }

  function withBody(callback) {
    if (document.body) callback();
    else document.addEventListener('DOMContentLoaded', callback, { once: true });
  }

  function grantAccess() {
    document.getElementById('syndicate-officer-access-message')?.remove();
    document.documentElement.classList.remove('syn-access-pending');
    document.documentElement.classList.add('syn-access-granted');
  }

  function showAccessMessage(title, message, action = 'retry') {
    withBody(() => {
      document.getElementById('syndicate-officer-access-message')?.remove();
      const panel = document.createElement('section');
      panel.id = 'syndicate-officer-access-message';
      panel.setAttribute('role', 'alert');
      Object.assign(panel.style, {
        maxWidth: '35rem', margin: '5rem auto', padding: '2rem',
        textAlign: 'center', background: '#15110d',
        border: '1px solid #8f7320', color: '#e4dac7',
        fontFamily: 'Georgia, serif', lineHeight: '1.7'
      });
      const heading = document.createElement('h2');
      heading.textContent = title;
      Object.assign(heading.style, {
        color: '#d4af37', fontSize: '1.6rem', margin: '0 0 1rem'
      });
      const description = document.createElement('p');
      description.textContent = message;
      const motto = document.createElement('p');
      motto.textContent = 'Some secrets are above your pay grade.';
      motto.style.fontStyle = 'italic';
      motto.style.color = '#d4af37';
      if (action !== 'denied') motto.hidden = true;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action === 'reconnect' ? 'CONNECT WITH DISCORD' :
        action === 'denied' ? '← RETURN TO THE SYNDICATE' : 'TRY AGAIN';
      Object.assign(button.style, {
        marginTop: '1rem', padding: '.8rem 1.5rem',
        background: '#241b10', border: '1px solid #d4af37',
        color: '#d4af37', cursor: 'pointer', maxWidth: '100%'
      });
      button.addEventListener('click', async () => {
        if (action === 'denied') {
          window.location.replace(homeURL);
          return;
        }
        if (action === 'reconnect') {
          rememberDestination();
          try {
            if (!window.syndicateAuth?.login) throw new Error('Discord login unavailable');
            await window.syndicateAuth.login();
          } catch (error) {
            console.error('Officer reconnect failed:', error);
            showAccessMessage('Connection Failed', 'Unable to reconnect Discord. Please try again.', 'reconnect');
          }
          return;
        }
        button.disabled = true;
        button.textContent = 'VERIFYING...';
        await checkOfficerAccess();
      });
      panel.append(heading, description, motto, button);
      document.body.append(panel);
    });
  }

  async function checkOfficerAccess() {
    if (checking) return;
    checking = true;
    document.documentElement.classList.add('syn-access-pending');
    document.documentElement.classList.remove('syn-access-granted');
    try {
      const auth = window.syndicateAuth;
      if (!auth || typeof auth.verifyMembership !== 'function') {
        showAccessMessage('Verification Unavailable', 'Unable to initialize Discord verification.', 'retry');
        return;
      }
      // Request a fresh role check; do not reuse the short-lived verification cache.
      const result = await auth.verifyMembership({ force: true });
      if (result?.verified === true && result?.status === 'member') {
        if (result.isOfficer === true) {
          grantAccess();
        } else {
          showAccessMessage('THE DARK COUNCIL CHAMBERS',
            'Nice try, Noob. This chamber is reserved for Syndicate Officers.', 'denied');
        }
        return;
      }
      if (result?.status === 'logged_out') {
        rememberDestination();
        window.location.replace(homeURL);
        return;
      }
      if (result?.status === 'reconnect_required') {
        showAccessMessage('Discord Reconnection Required',
          'Reconnect your Discord account to verify your Council access.', 'reconnect');
        return;
      }
      if (result?.status === 'not_member' || result?.status === 'discord_not_linked') {
        showAccessMessage('THE DARK COUNCIL CHAMBERS',
          'Nice try, Noob. This chamber is reserved for Syndicate Officers.', 'denied');
        return;
      }
      showAccessMessage('Verification Unavailable',
        'We could not confirm your Officer or Guild Master role. Please try again.', 'retry');
    } catch (error) {
      console.error('Officer access check failed:', error);
      showAccessMessage('Verification Unavailable',
        'Officer verification encountered an error. Please try again.', 'retry');
    } finally {
      checking = false;
    }
  }

  // Do not leave access-pending if the document has already loaded.
  checkOfficerAccess();
})();

