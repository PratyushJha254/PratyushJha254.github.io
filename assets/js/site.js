/* Small behaviours shared by every page: the light/dark switch, the header
   hairline and reading progress, folds that slide open with "Expand all /
   Collapse all", highlighting a link's target, the floating guide, sections
   fading in, the scroll bar on the left edge and the "Copy BibTeX" buttons.
   The site works without this file. */
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

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Folds: slide open and shut -----------------------------------------

  var folds = document.querySelectorAll("details.fold");

  function setFold(fold, open, animate) {
    var body = fold.querySelector(".fold__body");
    if (fold._anim) {
      fold._anim.cancel();
      fold._anim = null;
    }
    if (!animate || reduceMotion || !body || !body.animate) {
      fold.open = open;
      return;
    }
    if (open === fold.open) return;
    var pad = window.getComputedStyle(body).paddingBottom;
    if (open) {
      fold.open = true;
      var height = body.scrollHeight;
      fold._anim = body.animate(
        [{ height: "0px", paddingBottom: "0px", opacity: 0 },
         { height: height + "px", paddingBottom: pad, opacity: 1 }],
        { duration: 280, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }
      );
      fold._anim.onfinish = function () {
        fold._anim = null;
      };
    } else {
      fold.classList.add("is-closing");
      fold._anim = body.animate(
        [{ height: body.scrollHeight + "px", paddingBottom: pad, opacity: 1 },
         { height: "0px", paddingBottom: "0px", opacity: 0 }],
        { duration: 220, easing: "ease-in" }
      );
      fold._anim.onfinish = function () {
        fold._anim = null;
        fold.open = false;
        fold.classList.remove("is-closing");
      };
    }
  }

  Array.prototype.forEach.call(folds, function (fold) {
    var summary = fold.querySelector("summary");
    if (!summary) return;
    summary.addEventListener("click", function (event) {
      event.preventDefault();
      setFold(fold, !fold.open || fold.classList.contains("is-closing"), true);
    });
  });

  // Expand all / Collapse all.
  Array.prototype.forEach.call(document.querySelectorAll("[data-fold-controls]"), function (controls) {
    var scope = document.getElementById(controls.getAttribute("data-fold-controls"));
    if (!scope) return;
    controls.hidden = false;
    controls.addEventListener("click", function (event) {
      var button = event.target.closest("[data-fold]");
      if (!button) return;
      var open = button.getAttribute("data-fold") === "open";
      Array.prototype.forEach.call(scope.querySelectorAll("details.fold"), function (fold) {
        setFold(fold, open, true);
      });
    });
  });

  // Printed pages show every position in full.
  window.addEventListener("beforeprint", function () {
    Array.prototype.forEach.call(folds, function (fold) {
      setFold(fold, true, false);
    });
  });

  // ---- Arriving at a link target ------------------------------------------
  // A link to one position (for example /experience/#mcgill) opens it, and
  // whatever a link points to is briefly highlighted so the eye finds it.

  function arrive() {
    if (!location.hash) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    if (target.matches("details.fold")) setFold(target, true, false);
    if (target.id === "top") return;
    target.classList.remove("is-flash");
    void target.offsetWidth;
    target.classList.add("is-flash");
    window.setTimeout(function () {
      target.classList.remove("is-flash");
    }, 1800);
  }
  arrive();
  window.addEventListener("hashchange", arrive);

  // ---- Floating guide -----------------------------------------------------
  // Points to the next part of the page that is still below the reader; once
  // everything has been reached it becomes "Back to top". On the home page
  // the stops are listed in the page; elsewhere ("auto") they are the page's
  // section headings.

  var guide = document.querySelector("[data-guide]");
  if (guide) {
    var stops = [];
    var spec = guide.getAttribute("data-guide");
    if (spec === "auto") {
      Array.prototype.forEach.call(
        document.querySelectorAll("main h2[id], main .fold-group[id]"),
        function (heading) {
          stops.push({ id: heading.id, label: heading.textContent.trim(), el: heading });
        }
      );
    } else {
      spec.split(";").forEach(function (part) {
        var bits = part.split("|");
        var heading = document.getElementById((bits[0] || "").trim());
        if (heading) {
          stops.push({ id: heading.id, label: (bits[1] || "").trim(),
            el: heading.closest("section") || heading });
        }
      });
    }
    var guideLabel = guide.querySelector(".guide__label");
    var updateGuide = function () {
      var view = window.innerHeight;
      var long = document.documentElement.scrollHeight > view * 1.6;
      var next = null;
      for (var i = 0; i < stops.length; i++) {
        if (stops[i].el.getBoundingClientRect().top > view * 0.6) {
          next = stops[i];
          break;
        }
      }
      if (!long || (!next && window.scrollY < view * 0.5)) {
        guide.classList.add("is-away");
        return;
      }
      guide.classList.remove("is-away");
      if (next) {
        guide.setAttribute("href", "#" + next.id);
        guideLabel.textContent = next.label;
        guide.classList.remove("is-up");
      } else {
        guide.setAttribute("href", "#top");
        guideLabel.textContent = "Back to top";
        guide.classList.add("is-up");
      }
    };
    guide.hidden = false;
    updateGuide();
    window.addEventListener("scroll", updateGuide, { passive: true });
    window.addEventListener("resize", updateGuide);
    document.addEventListener("toggle", updateGuide, true);
  }

  // ---- Sections fade in once, as they come into view ---------------------

  var rootEl = document.documentElement;
  if (rootEl.classList.contains("js-reveal") && "IntersectionObserver" in window) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    Array.prototype.forEach.call(document.querySelectorAll("main .block"), function (el) {
      revealer.observe(el);
    });
    rootEl.classList.add("reveal-ready");
  } else {
    rootEl.classList.remove("js-reveal");
  }

  // ---- Fade at the bottom edge --------------------------------------------
  // Text at the bottom of the window is softened, which hints that the page
  // continues. The fade goes away once the end of the page is reached.

  var edge = document.querySelector("[data-edge-fade]");
  if (edge) {
    var updateEdge = function () {
      var left = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      edge.classList.toggle("is-done", left < 48);
    };
    updateEdge();
    window.addEventListener("scroll", updateEdge, { passive: true });
    window.addEventListener("resize", updateEdge);
    document.addEventListener("toggle", updateEdge, true);
  }

  // ---- Reading progress, under the header --------------------------------

  var progress = document.querySelector("[data-progress]");
  if (progress) {
    var updateProgress = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var f = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.transform = "scaleX(" + f + ")";
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    document.addEventListener("toggle", updateProgress, true);
  }

  // ---- Scroll bar on the left edge ----------------------------------------
  // Shows where you are on the page while scrolling, then fades out. The
  // thumb can be dragged. The browser's own scroll bar is left as it is.

  var bar = document.createElement("div");
  bar.className = "scrollbar";
  bar.setAttribute("aria-hidden", "true");
  var thumb = document.createElement("div");
  thumb.className = "scrollbar__thumb";
  bar.appendChild(thumb);
  document.body.appendChild(bar);

  var hideTimer = null;
  var dragging = false;
  var hovering = false;
  var dragStartY = 0;
  var dragStartScroll = 0;
  var EDGE = 8;

  var barMetrics = function () {
    var view = window.innerHeight;
    var total = document.documentElement.scrollHeight;
    var track = view - 2 * EDGE;
    var size = Math.max(36, track * view / total);
    return { maxScroll: total - view, size: size, room: track - size };
  };

  var placeBar = function () {
    var m = barMetrics();
    if (m.maxScroll <= 1) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    thumb.style.height = m.size + "px";
    thumb.style.transform = "translateY(" + (EDGE + (window.scrollY / m.maxScroll) * m.room) + "px)";
  };

  var showBar = function () {
    bar.classList.add("is-active");
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(function () {
      if (!dragging && !hovering) bar.classList.remove("is-active");
    }, 1000);
  };

  window.addEventListener("scroll", function () {
    placeBar();
    showBar();
  }, { passive: true });
  window.addEventListener("resize", placeBar);
  document.addEventListener("toggle", placeBar, true);
  document.addEventListener("mousemove", function (event) {
    if (event.clientX < 24 && !bar.hidden) showBar();
  }, { passive: true });

  thumb.addEventListener("pointerenter", function () {
    hovering = true;
    showBar();
  });
  thumb.addEventListener("pointerleave", function () {
    hovering = false;
    showBar();
  });
  thumb.addEventListener("pointerdown", function (event) {
    dragging = true;
    dragStartY = event.clientY;
    dragStartScroll = window.scrollY;
    thumb.setPointerCapture(event.pointerId);
    bar.classList.add("is-dragging");
    event.preventDefault();
  });
  thumb.addEventListener("pointermove", function (event) {
    if (!dragging) return;
    var m = barMetrics();
    var y = dragStartScroll + (event.clientY - dragStartY) * m.maxScroll / Math.max(m.room, 1);
    window.scrollTo({ top: y, behavior: "instant" });
  });
  var endDrag = function () {
    dragging = false;
    bar.classList.remove("is-dragging");
    showBar();
  };
  thumb.addEventListener("pointerup", endDrag);
  thumb.addEventListener("pointercancel", endDrag);
  placeBar();

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
