
/* =========================================
   THE SYNDICATE
   SHARED NAVIGATION + DISCORD ACCOUNT
   ========================================= */

(() => {
  'use strict';

  const script = document.currentScript;
  const root = new URL('../', script ? script.src : document.baseURI);
  const url = path => new URL(path, root).href;

  const menuItems = [
    ['HOME', 'index.html'],
    ['The Syndicate', 'guild.html'],
    ['CALENDAR', 'calendar.html'],
    ['RAID HUB', 'raid-hub.html'],
    ['RESOURCES', 'resources.html']
  ];

  function render() {
    if (document.querySelector('.syn-menu')) return;

    const mount = document.getElementById('syndicate-menu');

    // =====================================
    // SHARED HEADER
    // =====================================

    const header = document.createElement('header');
    header.className = 'syn-menu';

    header.innerHTML = `
      <div class="syn-menu__inner">

        <a class="syn-menu__logo"
           href="${url('index.html')}"
           aria-label="The Syndicate home">
          <img src="${url('images/HeaderLogo.png')}"
               alt="The Syndicate">
        </a>

        <div class="syn-menu__actions">

          <div class="syn-account">

            <button
              class="syn-account__trigger"
              type="button"
              aria-label="Discord account"
              aria-haspopup="true"
              aria-controls="syn-account-dropdown"
              aria-expanded="false">

              <span class="syn-account__icon"
                    aria-hidden="true">♟</span>

              <span class="syn-account__name">
                LOGIN
              </span>

              <span class="syn-account__arrow"
                    aria-hidden="true">▾</span>

            </button>

            <div id="syn-account-dropdown"
                 class="syn-account__dropdown"
                 hidden>

              <div class="syn-account__details">

                <span class="syn-account__label">
                  DISCORD ACCOUNT
                </span>

                <strong class="syn-account__username">
                  Not connected
                </strong>

                <span class="syn-account__status"
                      aria-live="polite">
                  Sign in to continue
                </span>

              </div>

              <button
                class="syn-account__auth-button"
                type="button"
                disabled>
                CHECKING LOGIN...
              </button>

            </div>

          </div>

          <button
            class="syn-menu__toggle"
            type="button"
            aria-label="Open menu"
            aria-controls="syn-menu-drawer"
            aria-expanded="false">☰</button>

        </div>
      </div>
    `;

    if (mount) mount.replaceWith(header);
    else document.body.prepend(header);

    // =====================================
    // ACCOUNT DROPDOWN
    // =====================================

    const account = header.querySelector('.syn-account');
    const accountTrigger =
      account.querySelector('.syn-account__trigger');
    const accountDropdown =
      account.querySelector('.syn-account__dropdown');
    const accountName =
      account.querySelector('.syn-account__name');
    const accountUsername =
      account.querySelector('.syn-account__username');
    const accountStatus =
      account.querySelector('.syn-account__status');
    const accountButton =
      account.querySelector('.syn-account__auth-button');

    let currentUser = null;
    let currentAction = 'login';
    let accountOpen = false;

    function setAccountOpen(open) {
      accountOpen = open;
      accountDropdown.hidden = !open;
      accountTrigger.setAttribute(
        'aria-expanded', String(open)
      );

      if (open) {
        accountButton.focus();
      }
    }

    accountTrigger.addEventListener('click', () => {
      setAccountOpen(!accountOpen);
    });

    document.addEventListener('click', event => {
      if (!account.contains(event.target)) {
        setAccountOpen(false);
      }
    });

    async function refreshAccount() {
      const auth = window.syndicateAuth;

      if (!auth) {
        accountName.textContent = 'LOGIN';
        accountUsername.textContent = 'Unavailable';
        accountStatus.textContent =
          'Discord authentication is unavailable.';
        accountButton.textContent = 'LOGIN UNAVAILABLE';
        accountButton.disabled = true;
        return;
      }

      accountButton.disabled = true;

      try {
        const user = await auth.getUser();
        currentUser = user;

        if (user) {
          const metadata = user.user_metadata || {};

          const username =
            metadata.custom_claims?.global_name ||
            metadata.full_name ||
            metadata.name ||
            metadata.user_name ||
            metadata.preferred_username ||
            'Discord User';

          accountName.textContent = username;
          accountUsername.textContent = username;

          // Discord authentication only.
          // Guild membership verification comes next.
          accountStatus.textContent =
            'Discord connected • Membership not verified';

          accountButton.textContent = 'LOG OUT';
          currentAction = 'logout';

        } else {
          accountName.textContent = 'LOGIN';
          accountUsername.textContent = 'Not connected';
          accountStatus.textContent =
            'Connect Discord to access guild features.';

          accountButton.textContent =
            'CONNECT WITH DISCORD';
          currentAction = 'login';
        }

        accountButton.disabled = false;

      } catch (error) {
        console.error('Account check failed:', error);

        accountStatus.textContent =
          'Unable to check Discord login.';

        accountButton.textContent = 'RETRY';
        currentAction = 'retry';
        accountButton.disabled = false;
      }
    }

    accountButton.addEventListener('click', async () => {
      const auth = window.syndicateAuth;
      if (!auth || accountButton.disabled) return;

      if (currentAction === 'retry') {
        await refreshAccount();
        return;
      }

      accountButton.disabled = true;

      try {
        if (currentAction === 'logout') {
          await auth.logout();
        } else {
          await auth.login();
        }
      } catch (error) {
        console.error('Discord auth error:', error);
        accountStatus.textContent =
          'Authentication failed. Please try again.';
      } finally {
        await refreshAccount();
      }
    });

    if (window.syndicateDB) {
      window.syndicateDB.auth.onAuthStateChange(() => {
        // Run outside the auth callback.
        setTimeout(refreshAccount, 0);
      });
    }

    refreshAccount();

    // =====================================
    // EXISTING SLIDE-OUT MENU
    // =====================================

    const overlay = document.createElement('div');
    overlay.className = 'syn-menu__overlay';
    overlay.hidden = true;

    const drawer = document.createElement('aside');
    drawer.id = 'syn-menu-drawer';
    drawer.className = 'syn-menu__drawer';
    drawer.setAttribute('aria-label', 'Site navigation');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;

    const closeButton = document.createElement('button');
    closeButton.className = 'syn-menu__close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close menu');
    closeButton.textContent = '×';

    const brand = document.createElement('a');
    brand.className = 'syn-menu__drawer-logo';
    brand.href = url('index.html');

    brand.innerHTML = `
      <img src="${url('images/HeaderLogo.png')}"
           alt="The Syndicate">
    `;

    const nav = document.createElement('nav');
    nav.className = 'syn-menu__drawer-links';
    nav.setAttribute('aria-label', 'Main navigation');

    for (const [label, path] of menuItems) {
      const a = document.createElement('a');
      a.textContent = label;
      a.href = url(path);

      if (
        location.pathname ===
        new URL(path, root).pathname
      ) {
        a.setAttribute('aria-current', 'page');
      }

      nav.appendChild(a);
    }

    const motto = document.createElement('div');
    motto.className = 'syn-menu__drawer-motto';
    motto.textContent = '◆ THIS IS THE WAY. ◆';

    drawer.append(closeButton, brand, nav, motto);
    document.body.append(overlay, drawer);

    const openButton =
      header.querySelector('.syn-menu__toggle');

    let previouslyFocused = null;

    function setOpen(open) {
      if (open) {
        setAccountOpen(false);
        previouslyFocused = document.activeElement;
      }

      overlay.hidden = !open;

      drawer.classList.toggle('is-open', open);
      overlay.classList.toggle('is-open', open);

      drawer.setAttribute(
        'aria-hidden', String(!open)
      );

      drawer.inert = !open;

      openButton.setAttribute(
        'aria-expanded', String(open)
      );

      document.body.classList.toggle(
        'syn-menu-drawer-open', open
      );

      if (open) {
        closeButton.focus();
      } else if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    }

    openButton.addEventListener('click', () => setOpen(true));
    closeButton.addEventListener('click', () => setOpen(false));
    overlay.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && accountOpen) {
        event.preventDefault();
        setAccountOpen(false);
        accountTrigger.focus();
        return;
      }

      if (!drawer.classList.contains('is-open')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }

      if (event.key === 'Tab') {
        const controls = Array.from(
          drawer.querySelectorAll('button, a')
        );

        const first = controls[0];
        const last = controls[controls.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      render,
      { once: true }
    );
  } else {
    render();
  }
})();
