
/* =========================================
   THE SYNDICATE
   SITE-WIDE FONT SETTINGS
   ========================================= */

(function () {
  const STORAGE_KEY = "syndicate-font-scale";

  const sizes = {
    standard: "1",
    large: "1.15",
    extra: "1.3"
  };

  function setFontSize(size) {
    if (!sizes[size]) {
      size = "standard";
    }

    document.documentElement.style.setProperty(
      "--font-scale",
      sizes[size]
    );

    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch (error) {
      // Font controls still work if storage is unavailable.
    }

    document.querySelectorAll(".font-size-btn")
      .forEach(button => {
        const active = button.dataset.size === size;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
  }

  function createFontControls() {
    if (document.getElementById("syndicate-font-controls")) {
      return;
    }

    const controls = document.createElement("div");
    controls.id = "syndicate-font-controls";
    controls.className = "font-controls";

    controls.innerHTML = `
      <span class="font-controls-label">Text Size</span>
      <button class="font-size-btn" data-size="standard">A</button>
      <button class="font-size-btn" data-size="large">A+</button>
      <button class="font-size-btn" data-size="extra">A++</button>
    `;

    document.body.appendChild(controls);

    controls.querySelectorAll(".font-size-btn")
      .forEach(button => {
        button.addEventListener("click", () => {
          setFontSize(button.dataset.size);
        });
      });
  }

  function initialize() {
    createFontControls();

    let savedSize = "standard";

    try {
      savedSize = localStorage.getItem(STORAGE_KEY) || "standard";
    } catch (error) {
      // Default to standard if browser storage is unavailable.
    }

    setFontSize(savedSize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
