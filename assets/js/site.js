/* Small behaviours shared by every page: the light/dark switch, the header
   hairline and the "Copy BibTeX" buttons. The site works without this file. */
(function () {
  "use strict";

  // ---- Light / dark switch ------------------------------------------------

  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");

  function currentTheme() {
    var chosen = root.getAttribute("data-theme");
    if (chosen === "light" || chosen === "dark") return chosen;
    var prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  function labelToggle() {
    var other = currentTheme() === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-label", "Switch to " + other + " theme");
    toggle.setAttribute("title", "Switch to " + other + " theme");
  }

  if (toggle) {
    toggle.hidden = false;
    labelToggle();
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      labelToggle();
      // Keep the comments box, if there is one, in the same theme.
      var frame = document.querySelector("iframe.giscus-frame");
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(
          { giscus: { setConfig: { theme: next } } },
          "https://giscus.app"
        );
      }
    });
  }

  // ---- Header hairline once the page scrolls under it ---------------------

  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---- Copy BibTeX --------------------------------------------------------

  var buttons = document.querySelectorAll("[data-copy]");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    Array.prototype.forEach.call(buttons, function (button) {
      var label = button.textContent;
      var source = button.parentNode.querySelector("pre");
      if (!source) return;
      button.hidden = false;
      button.addEventListener("click", function () {
        navigator.clipboard.writeText(source.textContent).then(function () {
          button.textContent = "Copied";
          window.setTimeout(function () {
            button.textContent = label;
          }, 2000);
        });
      });
    });
  }
})();
