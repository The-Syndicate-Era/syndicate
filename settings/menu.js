/* The Syndicate — shared slide-out navigation. Save as settings/menu.js */
(() => {
  'use strict';
  const script = document.currentScript;
  const root = new URL('../', script ? script.src : document.baseURI);
  const url = path => new URL(path, root).href;
  const menuItems = [
    ['HOME', 'index.html'],
    ['The Syndicate', 'guild.html'],
    ['CALENDAR', 'calendar.html'],
    ['RAID HUB', 'raids.html'],
    ['RESOURCES', 'resources.html']
  ];

  function render() {
    if (document.querySelector('.syn-menu')) return;
    const mount = document.getElementById('syndicate-menu');
    const header = document.createElement('header');
    header.className = 'syn-menu';
    header.innerHTML = `
      <div class="syn-menu__inner">
        <a class="syn-menu__logo" href="${url('index.html')}" aria-label="The Syndicate home">
          <img src="${url('images/HeaderLogo.png')}" alt="The Syndicate">
        </a>
        <button class="syn-menu__toggle" type="button" aria-label="Open menu"
          aria-controls="syn-menu-drawer" aria-expanded="false">☰</button>
      </div>`;
    if (mount) mount.replaceWith(header); else document.body.prepend(header);

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
    brand.innerHTML = `<img src="${url('images/HeaderLogo.png')}" alt="The Syndicate">`;
    const nav = document.createElement('nav');
    nav.className = 'syn-menu__drawer-links';
    nav.setAttribute('aria-label', 'Main navigation');
    for (const [label, path] of menuItems) {
      const a = document.createElement('a');
      a.textContent = label;
      a.href = url(path);
      if (location.pathname === new URL(path, root).pathname) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    }
    const motto = document.createElement('div');
    motto.className = 'syn-menu__drawer-motto';
    motto.textContent = '◆ THIS IS THE WAY. ◆';
    drawer.append(closeButton, brand, nav, motto);
    document.body.append(overlay, drawer);
    const openButton = header.querySelector('.syn-menu__toggle');
    let previouslyFocused = null;
    function setOpen(open) {
      if (open) previouslyFocused = document.activeElement;
      overlay.hidden = !open;
      drawer.classList.toggle('is-open', open);
      overlay.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      drawer.inert = !open;
      openButton.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('syn-menu-drawer-open', open);
      if (open) closeButton.focus();
      else if (previouslyFocused?.isConnected) previouslyFocused.focus();
    }
    openButton.addEventListener('click', () => setOpen(true));
    closeButton.addEventListener('click', () => setOpen(false));
    overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', e => {
      if (!drawer.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      if (e.key === 'Tab') {
        const controls = Array.from(drawer.querySelectorAll('button, a'));
        const first = controls[0], last = controls[controls.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once:true });
  else render();
})();
