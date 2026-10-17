/* =========================================
   THE SYNDICATE
   SITE-WIDE FONT SETTINGS
   ========================================= */
(() => {
  'use strict';

  const STORAGE_KEY = 'syndicate-font-scale';
  const sizes = {
    standard: 1,
    large: 1.15,
    extra: 1.3
  };

  function setFontSize(requestedSize) {
    const size = Object.hasOwn(sizes, requestedSize) ? requestedSize : 'standard';
    const scale = sizes[size];

    // Retain compatibility with styles that explicitly use --font-scale.
    document.documentElement.style.setProperty('--font-scale', String(scale));

    // Scale the root font size so all rem-based text changes too.
    // The !important priority prevents page-specific root styles from overriding it.
    document.documentElement.style.setProperty('font-size', `${scale * 100}%`, 'important');

    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch (_) {
      // Controls continue to work without storage.
    }

    document.querySelectorAll('#syndicate-font-controls .font-size-btn').forEach(button => {
      const active = button.dataset.size === size;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function createFontControls() {
    if (document.getElementById('syndicate-font-controls')) return;

    const controls = document.createElement('div');
    controls.id = 'syndicate-font-controls';
    controls.className = 'font-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Text size');
    controls.innerHTML = `
      <span class="font-controls-label">Text Size</span>
      <button type="button" class="font-size-btn" data-size="standard" aria-label="Standard text size">A</button>
      <button type="button" class="font-size-btn" data-size="large" aria-label="Large text size">A+</button>
      <button type="button" class="font-size-btn" data-size="extra" aria-label="Extra large text size">A++</button>
    `;
    document.body.appendChild(controls);
    controls.querySelectorAll('.font-size-btn').forEach(button => {
      button.addEventListener('click', () => setFontSize(button.dataset.size));
    });
  }

  function initialize() {
    createFontControls();
    let savedSize = 'standard';
    try {
      savedSize = localStorage.getItem(STORAGE_KEY) || 'standard';
    } catch (_) {}
    setFontSize(savedSize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
