/* THE SYNDICATE — Shared footer. Save as settings/site-layout.js */
(() => {
  'use strict';
  const script = document.currentScript;
  const root = new URL('../', script?.src || document.baseURI);
  const url = path => new URL(path, root).href;

  function renderFooter() {
    if (document.querySelector('.syn-footer')) return;
    const footer = document.createElement('footer');
    footer.className = 'syn-footer';
    footer.innerHTML = `
      <div class="syn-footer__motto">
        <span class="syn-footer__motto-text">◆ THIS IS THE WAY ◆</span>
      </div>
      <div class="syn-footer__bottom">
        <a class="syn-footer__logo" href="${url('index.html')}" aria-label="The Syndicate home">
          <img src="${url('images/HeaderLogo.png')}" alt="The Syndicate">
        </a>
      </div>`;
    const target = document.getElementById('syndicate-footer');
    if (target) target.replaceWith(footer);
    else document.body.appendChild(footer);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', renderFooter, {once:true});
  else renderFooter();
})();
