
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
    ['Home', 'index.html'],
    ['The Syndicate', 'guild.html'],
    ['Guild Bank & Donations', 'guild/guild-bank-needs.html'],
    ['Calendar', 'calendar.html'],
    ['Raid Hub', 'raid-hub.html'],
    ['Resources', 'resources.html']
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

              <span class="syn-account__name">CHECKING...</span>

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
                  Checking login...
                </span>

              </div>

              <a class="syn-account__profile-link"
                 href="${url('guild/my-profile.html')}"
                 hidden>♟ &nbsp; MY PROFILE</a>

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

    // Account label colors are shared across desktop and mobile.
    // Names are only purple after verified officer membership.
    if (!document.getElementById('syn-account-rank-colors')) {
      const colors = document.createElement('style');
      colors.id = 'syn-account-rank-colors';
      colors.textContent = `
        .syn-account__trigger .syn-account__name[data-rank="logged-out"] {
          color: #ef6464 !important;
          font-weight: 700;
        }
        .syn-account__trigger .syn-account__name[data-rank="reconnect"] {
          color: #ef6464 !important;
          font-weight: 700;
        }
        .syn-account__trigger .syn-account__name[data-rank="member"] {
          color: #e5c978 !important;
          font-weight: 700;
        }
        .syn-account__trigger .syn-account__name[data-rank="officer"] {
          color: #b78aff !important;
          font-weight: 700;
        }
        .syn-account__trigger .syn-account__name[data-rank="checking"] {
          color: #b5a88f !important;
        }
      `;
      colors.textContent += `
        .syn-account__profile-link {
          display:block; margin:.6rem 0; padding:.75rem 1rem;
          color:#e5c978; border:1px solid #70562c;
          background:#241b12; border-radius:5px;
          text-align:center; text-decoration:none;
          font-weight:700; letter-spacing:.04em;
        }
        .syn-account__profile-link[hidden] { display:none !important; }
        .syn-account__profile-link:hover,
        .syn-account__profile-link:focus-visible {background:#3b2b17;}
      `;
      colors.textContent += `
        .syn-profile-overlay {position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:15000;}
        .syn-profile-overlay[hidden], .syn-profile-drawer[hidden] {display:none!important;}
        .syn-profile-drawer {position:fixed;z-index:15001;right:0;top:0;height:100dvh;
          width:min(100%,540px);display:flex;flex-direction:column;
          background:#0b0908;border-left:1px solid #9a742a;box-shadow:-14px 0 70px #000a;}
        .syn-profile-drawer__top {padding:.8rem 1rem;display:flex;align-items:center;
          justify-content:space-between;gap:1rem;background:#21190f;border-bottom:1px solid #70562c;}
        .syn-profile-drawer__title {color:#e5c978;font-weight:700;letter-spacing:.08em;}
        .syn-profile-drawer__close {background:transparent;border:1px solid #7a613a;
          color:#e5c978;border-radius:5px;padding:.3rem .7rem;cursor:pointer;font-size:1.3rem;}
        .syn-profile-drawer__frame {display:block;flex:1;width:100%;min-height:0;border:0;background:#0b0908;}
        body.syn-profile-open {overflow:hidden;}
      `;
      document.head.appendChild(colors);
    }

    // Profile drawer: reuse the existing profile page inside a compact panel.
    // Same-origin iframe retains the current Supabase session and backend logic.
    const profileOverlay = document.createElement('div');
    profileOverlay.className = 'syn-profile-overlay';
    profileOverlay.hidden = true;
    const profileDrawer = document.createElement('section');
    profileDrawer.className = 'syn-profile-drawer';
    profileDrawer.hidden = true;
    profileDrawer.setAttribute('role', 'dialog');
    profileDrawer.setAttribute('aria-modal', 'true');
    profileDrawer.setAttribute('aria-label', 'My Profile');
    profileDrawer.innerHTML = `
      <div class="syn-profile-drawer__top">
        <span class="syn-profile-drawer__title">⚓ MY PROFILE</span>
        <button type="button" class="syn-profile-drawer__close" aria-label="Close profile">×</button>
      </div>
      <iframe class="syn-profile-drawer__frame" title="My Profile" loading="eager"></iframe>`;
    document.body.append(profileOverlay, profileDrawer);
    const profileFrame = profileDrawer.querySelector('iframe');
    const closeProfileButton = profileDrawer.querySelector('.syn-profile-drawer__close');
    let profileOpen = false;
    let previousProfileFocus = null;
    function openProfile(welcome = false) {
      if (profileOpen) return;
      previousProfileFocus = document.activeElement;
      profileOpen = true;
      setAccountOpen(false);
      profileOverlay.hidden = false;
      profileDrawer.hidden = false;
      document.body.classList.add('syn-profile-open');
      const destination = new URL(url('guild/my-profile.html'));
      destination.searchParams.set('embed', '1');
      if (welcome) destination.searchParams.set('welcome', '1');
      profileFrame.src = destination.href;
      closeProfileButton.focus();
    }
    function closeProfile() {
      if (!profileOpen) return;
      profileOpen = false;
      profileDrawer.hidden = true;
      profileOverlay.hidden = true;
      document.body.classList.remove('syn-profile-open');
      profileFrame.removeAttribute('src');
      if (previousProfileFocus?.isConnected) previousProfileFocus.focus();
      // Update display name after a profile was saved/confirmed.
      refreshAccount();
    }
    closeProfileButton.addEventListener('click', closeProfile);
    profileOverlay.addEventListener('click', closeProfile);
    profileDrawer.addEventListener('keydown', event => {
      if (event.key === 'Tab' && event.target === closeProfileButton && event.shiftKey) {
        event.preventDefault();
        profileFrame.focus();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && profileOpen) {
        event.preventDefault();
        closeProfile();
      }
    });

    // =====================================
    // DISCORD ACCOUNT ELEMENTS
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
    const profileLink = account.querySelector('.syn-account__profile-link');
    const profilePageURL = url('guild/my-profile.html');
    const isProfilePage = window.location.pathname === new URL(profilePageURL).pathname;
    const PROFILE_PROMPT_KEY = 'syndicate_profile_prompt_checked_v1';

    let currentUser = null;
    let currentAction = 'login';
    let accountOpen = false;
    let refreshVersion = 0;

    function displayAccount(name, rank) {
      accountName.textContent = name;
      accountName.dataset.rank = rank;
    }

    function setAccountOpen(open) {
      accountOpen = open;
      accountDropdown.hidden = !open;

      accountTrigger.setAttribute(
        'aria-expanded',
        String(open)
      );

      if (open) {
        if (!profileLink.hidden) profileLink.focus();
        else if (!accountButton.disabled) accountButton.focus();
      }
    }

    profileLink.addEventListener('click', event => {
      event.preventDefault();
      if (profileLink.hidden || !currentUser) return;
      openProfile(false);
    });

    accountTrigger.addEventListener('click', () => {
      setAccountOpen(!accountOpen);
    });

    document.addEventListener('click', event => {
      if (!account.contains(event.target)) {
        setAccountOpen(false);
      }
    });

    // =====================================
    // DISPLAY MEMBERSHIP STATUS
    // =====================================

    function showMembershipStatus(result) {
      accountStatus.removeAttribute('data-status');

      if (result?.verified === true &&
          result?.status === 'member') {

        accountStatus.textContent =
          '✓ Verified Syndicate Member';

        accountStatus.dataset.status = 'verified';
        return;
      }

      switch (result?.status) {

        case 'not_member':
          accountStatus.textContent =
            'Not a member of The Syndicate Discord server';
          accountStatus.dataset.status = 'denied';
          break;

        case 'reconnect_required':
          displayAccount('RECONNECT', 'reconnect');
          accountStatus.textContent =
            'Discord reconnection required';
          accountStatus.dataset.status = 'pending';
          accountButton.textContent = 'RECONNECT DISCORD';
          currentAction = 'reconnect';
          break;

        case 'logged_out':
          accountStatus.textContent =
            'Connect Discord to access guild features.';
          accountStatus.dataset.status = 'pending';
          break;

        default:
          accountStatus.textContent =
            'Membership verification unavailable';
          accountStatus.dataset.status = 'pending';
          break;
      }
    }

    // =====================================
    // REFRESH LOGIN + MEMBERSHIP
    // =====================================

    async function refreshAccount() {
      const version = ++refreshVersion;
      const auth = window.syndicateAuth;

      if (!auth) {
        displayAccount('LOG IN', 'logged-out');
        accountUsername.textContent = 'Unavailable';
        accountStatus.textContent =
          'Discord authentication unavailable.';
        accountButton.textContent = 'LOGIN UNAVAILABLE';
        accountButton.disabled = true;
        return;
      }

      accountButton.disabled = true;
      profileLink.hidden = true;
      displayAccount('CHECKING...', 'checking');
      accountStatus.textContent = 'Checking Discord login...';

      try {
        const user = await auth.getUser();

        // Ignore outdated requests.
        if (version !== refreshVersion) return;

        currentUser = user;

        if (!user) {
          displayAccount('LOG IN', 'logged-out');
          accountUsername.textContent = 'Not connected';

          accountStatus.textContent =
            'Connect Discord to access guild features.';

          accountStatus.dataset.status = 'pending';

          accountButton.textContent =
            'CONNECT WITH DISCORD';

          currentAction = 'login';
          return;
        }

        // =================================
        // DISPLAY DISCORD USERNAME
        // =================================

        const metadata = user.user_metadata || {};

        const username =
          metadata.custom_claims?.global_name ||
          metadata.full_name ||
          metadata.name ||
          metadata.user_name ||
          metadata.preferred_username ||
          'Discord User';

        displayAccount(username, 'member');
        accountUsername.textContent = username;

        currentAction = 'logout';
        accountButton.textContent = 'LOG OUT';

        // =================================
        // VERIFY SYNDICATE MEMBERSHIP
        // =================================

        accountStatus.textContent =
          'Verifying Syndicate membership...';

        accountStatus.dataset.status = 'pending';

        if (typeof auth.verifyMembership !== 'function') {
          accountStatus.textContent =
            'Membership verification unavailable';
          return;
        }

        const membership = await auth.verifyMembership();

        if (version !== refreshVersion) return;

        showMembershipStatus(membership);
        // Officer / Guild Master role is verified by the Discord Edge Function.
         if (membership?.verified === true && membership?.status === 'member') {
           const rank = membership.isOfficer === true ? 'officer' : 'member';
           displayAccount(username, rank);
           profileLink.hidden = false;

           // Profile RPCs are optional during deployment: leave login usable
           // even before the profile SQL has been installed.
           const db = window.syndicateDB;
           if (db?.rpc) {
             try {
               const { data, error } = await db.rpc('syndicate_my_profile');
               if (version !== refreshVersion) return;
               if (error) throw error;
               const person = Array.isArray(data) ? data[0] : data;
               const displayName = person?.main_name || person?.outside_character;
               if (displayName) displayAccount(displayName, rank);

               // A one-time, optional welcome per browser session per user.
               // Excludes the profile page itself to avoid redirect loops.
               const key = PROFILE_PROMPT_KEY + ':' + user.id;
               if (!isProfilePage && !sessionStorage.getItem(key)) {
                 sessionStorage.setItem(key, 'checked');
                 const result = await db.rpc('syndicate_profile_welcome_needed');
                 if (version !== refreshVersion) return;
                 if (!result.error && result.data === true) {
                   openProfile(true);
                   return;
                 }
                 if (result.error) sessionStorage.removeItem(key);
               }
             } catch (profileError) {
               console.warn('Optional Syndicate profile lookup unavailable:', profileError);
             }
           }
        }



} catch (error) {
  if (version !== refreshVersion) return;

  console.error('Account verification error:', error);

  displayAccount('LOG IN', 'logged-out');
  accountUsername.textContent = 'Not connected';

  accountStatus.textContent =
    'Unable to check your account. Try connecting with Discord.';

  accountStatus.dataset.status = 'pending';

  accountButton.textContent = 'CONNECT WITH DISCORD';
  currentAction = 'login';


      } finally {
        if (version === refreshVersion) {
          accountButton.disabled = false;
        }
      }
    }

    // =====================================
    // LOGIN / LOGOUT BUTTON
    // =====================================

    accountButton.addEventListener('click', async () => {
      const auth = window.syndicateAuth;

      if (!auth || accountButton.disabled) return;

      if (currentAction === 'retry') {
        await refreshAccount();
        return;
      }

      const action = currentAction;
      accountButton.disabled = true;

      try {
        if (action === 'logout') {
          await auth.logout();

        } else if (
          action === 'login' ||
          action === 'reconnect'
        ) {
          await auth.login();
        }

      } catch (error) {
        console.error('Discord authentication error:', error);

        accountStatus.textContent =
          'Authentication failed. Please try again.';

      } finally {
        // OAuth login normally redirects away.
        // Refresh if we remain on the page.
        if (document.visibilityState === 'visible') {
          await refreshAccount();
        }
      }
    });

    // Update account when Supabase login changes.
    if (window.syndicateDB) {
      window.syndicateDB.auth.onAuthStateChange(
        (event) => {
          if (
            event === 'SIGNED_IN' ||
            event === 'SIGNED_OUT' ||
            event === 'INITIAL_SESSION' ||
            event === 'USER_UPDATED'
          ) {
            if (event === 'SIGNED_OUT' && currentUser?.id) {
              try { sessionStorage.removeItem(PROFILE_PROMPT_KEY + ':' + currentUser.id); } catch (_) {}
            }
            setTimeout(() => {
              refreshAccount();
            }, 0);
          }
        }
      );
    }

    refreshAccount();

    // =====================================
    // EXISTING SLIDE-OUT NAVIGATION
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
        'aria-hidden',
        String(!open)
      );

      drawer.inert = !open;

      openButton.setAttribute(
        'aria-expanded',
        String(open)
      );

      document.body.classList.toggle(
        'syn-menu-drawer-open',
        open
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
          drawer.querySelectorAll(
            'button:not(:disabled), a'
          )
        );

        const first = controls[0];
        const last = controls[controls.length - 1];

        if (!first || !last) return;

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
