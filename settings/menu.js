/* The Syndicate — shared navigation. Place this file at settings/menu.js. */
(() => {
  'use strict';
  const script = document.currentScript;
  const siteRoot = new URL('../', script?.src || document.baseURI);
  const siteUrl = path => new URL(path, siteRoot).href;
  const links = [
    { label: 'Home', path: 'index.html' },
    { label: 'Guild', path: 'guild.html' },
    { label: 'Calendar', path: 'calendar.html' },
    { label: 'Raid Hub', path: 'raids.html', children: [
      { label: 'Raid Rules', path: 'raid-hub/raid-rules.html' },
      { label: 'Roll Bonuses', path: 'raid-hub/roll-bonuses.html' },
      { label: 'Consumables', path: 'raid-hub/raid-consumables.html' },
      { label: 'Required Addons', path: 'raid-hub/required-addons.html' },
      { label: 'Onyxia', path: 'raids/ony.html' },
      { label: 'Zul’Gurub', path: 'raids/zg.html' },
      { label: 'AQ20', path: 'raids/aq20.html' },
      { label: 'Molten Core', path: 'raids/mc.html' },
      { label: 'Blackwing Lair', path: 'raids/bwl.html' },
      { label: 'AQ40', path: 'raids/aq40.html' }
    ] },
    { label: 'Resources', path: 'resources.html', children: [
      { label: 'Addons', path: 'resources/addons.html' },
      { label: 'Attunement Keys', path: 'resources/attune-key.html' },
    /*  { label: 'Class Information', path: 'resources/class.html' }, */
      { label: 'Professions & Crafting', path: 'resources/professions-crafting.html' },
      { label: 'Reputations', path: 'resources/reputations.html' },
      { label: 'Supportive Websites', path: 'resources/support-websites.html' }
    ] }
  ];

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const current = new URL(location.href);
  const at = path => current.pathname === new URL(path, siteRoot).pathname;
  function render() {
    if (document.querySelector('.syn-menu')) return;
    const header = el('header','syn-menu');
    const inner = el('div','syn-menu__inner');
    const brand = el('a','syn-menu__logo'); brand.href=siteUrl('index.html'); brand.setAttribute('aria-label','The Syndicate home');
    const logo = el('img'); logo.src=siteUrl('images/HeaderLogo.png'); logo.alt='The Syndicate'; brand.appendChild(logo); inner.appendChild(brand);
    const toggle = el('button','syn-menu__toggle','☰'); toggle.type='button'; toggle.setAttribute('aria-label','Open navigation menu'); toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-controls','syn-menu-links'); inner.appendChild(toggle);
    const nav = el('nav','syn-menu__nav'); nav.id='syn-menu-links'; nav.setAttribute('aria-label','Main navigation');
    for (const item of links) {
      const group = el('div','syn-menu__group');
      const link = el('a','syn-menu__link',item.label); link.href=siteUrl(item.path);
      if (at(item.path)) link.setAttribute('aria-current','page');
      group.appendChild(link);
      if (item.children) {
        const dropdownId='syn-sub-'+item.label.toLowerCase().replace(/\W+/g,'-');
        const expand=el('button','syn-menu__expand','▾'); expand.type='button'; expand.setAttribute('aria-label',`Show ${item.label} submenu`); expand.setAttribute('aria-expanded','false'); expand.setAttribute('aria-controls',dropdownId);
        const sub=el('div','syn-menu__sub'); sub.id=dropdownId;
        for (const child of item.children) {
          const a=el('a','',child.label); a.href=siteUrl(child.path); if(at(child.path)) a.setAttribute('aria-current','page'); sub.appendChild(a);
        }
        expand.addEventListener('click',()=>{
          const open=group.dataset.open!=='true';
          nav.querySelectorAll('.syn-menu__group[data-open="true"]').forEach(g=>{
            g.dataset.open='false'; g.querySelector('.syn-menu__expand')?.setAttribute('aria-expanded','false');
          });
          group.dataset.open=String(open); expand.setAttribute('aria-expanded',String(open));
        });
        group.append(expand,sub);
      }
      nav.appendChild(group);
    }
    inner.appendChild(nav); header.appendChild(inner);
    const target=document.getElementById('syndicate-menu');
    if(target) target.replaceWith(header); else document.body.prepend(header);
    toggle.addEventListener('click',()=>{
      const open=header.dataset.mobileOpen!=='true'; header.dataset.mobileOpen=String(open); toggle.setAttribute('aria-expanded',String(open)); toggle.textContent=open?'✕':'☰'; toggle.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
    });
    document.addEventListener('click',ev=>{if(!header.contains(ev.target)) {header.dataset.mobileOpen='false';toggle.setAttribute('aria-expanded','false'); toggle.textContent='☰'; nav.querySelectorAll('.syn-menu__group[data-open="true"]').forEach(g=>{g.dataset.open='false';g.querySelector('.syn-menu__expand')?.setAttribute('aria-expanded','false')});}});
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape') {header.dataset.mobileOpen='false';toggle.setAttribute('aria-expanded','false');toggle.textContent='☰'; toggle.setAttribute('aria-label','Open navigation menu');nav.querySelectorAll('.syn-menu__group[data-open="true"]').forEach(g=>{g.dataset.open='false';g.querySelector('.syn-menu__expand')?.setAttribute('aria-expanded','false')});}});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render,{once:true}); else render();
})();
