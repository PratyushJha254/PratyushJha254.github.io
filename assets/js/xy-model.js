/*
 * The 2D XY model on the home page, sampled live by Metropolis Monte Carlo.
 *
 *   H = -J * sum over nearest neighbours of cos(theta_i - theta_j)
 *
 * on an N x N square lattice with periodic boundaries (a torus). Temperature
 * is in units of J / k_B, in which the BKT transition is at T = 0.893.
 *
 * The lattice starts from random spins and thermalizes in real time. Each
 * animation frame runs as many sweeps as fit in a few milliseconds. Dragging
 * on the lattice randomizes the spins under the pointer.
 *
 * Spins are drawn as arrows, coloured by angle around the colour wheel.
 * Vortices are found from the winding of the angle around each plaquette.
 *
 * Below the lattice, a plot follows the energy per spin as the lattice
 * thermalizes. The dashed line is the equilibrium value at the same
 * temperature, from a separate Monte Carlo run started with all spins
 * aligned.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-xy]");
  if (!root) return;

  var canvas = root.querySelector(".xy__canvas");
  var ctx = canvas && canvas.getContext("2d");
  if (!ctx) return;

  var $ = function (sel) { return root.querySelector(sel); };
  var slider = $("[data-xy-temperature]");
  var valueOut = $("[data-xy-value]");
  var toggle = $("[data-xy-toggle]");
  var restart = $("[data-xy-restart]");
  var sweepsOut = $("[data-xy-sweeps]");
  var vortexOut = $("[data-xy-vortices]");
  var magnetOut = $("[data-xy-magnetization]");
  var energyOut = $("[data-xy-energy]");
  var plot = $("[data-xy-plot]");
  var plotCtx = plot && plot.getContext("2d");

  var N = 32;
  var SITES = N * N;
  var TWO_PI = 2 * Math.PI;
  var FRAME_BUDGET_MS = 5;
  var MAX_SWEEPS_PER_FRAME = 12;
  var STIR_RADIUS = 2;
  var PLOT_WINDOW = 1500;    // sweeps shown in the plot

  // ---- Lattice ------------------------------------------------------------

  var theta = new Float64Array(SITES);
  var up = new Int32Array(SITES);
  var down = new Int32Array(SITES);
  var left = new Int32Array(SITES);
  var right = new Int32Array(SITES);

  for (var row = 0; row < N; row++) {
    for (var col = 0; col < N; col++) {
      var i = row * N + col;
      up[i] = ((row + N - 1) % N) * N + col;
      down[i] = ((row + 1) % N) * N + col;
      left[i] = row * N + ((col + N - 1) % N);
      right[i] = row * N + ((col + 1) % N);
    }
  }

  var sweepCount = 0;

  function randomize(t) {
    for (var i = 0; i < SITES; i++) t[i] = Math.random() * TWO_PI;
  }

  function stir(col, row) {
    var r = STIR_RADIUS;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        var c = (((col + dx) % N) + N) % N;
        var w = (((row + dy) % N) + N) % N;
        theta[w * N + c] = Math.random() * TWO_PI;
      }
    }
  }

  // One Monte Carlo sweep: N * N single-spin Metropolis updates.
  function sweep(t, T) {
    var width = Math.min(Math.PI, 0.4 + 1.6 * T);
    var beta = 1 / T;
    for (var k = 0; k < SITES; k++) {
      var i = (Math.random() * SITES) | 0;
      var a = t[i];
      var b = a + (2 * Math.random() - 1) * width;
      var n1 = t[up[i]], n2 = t[down[i]], n3 = t[left[i]], n4 = t[right[i]];
      var dE =
        Math.cos(a - n1) + Math.cos(a - n2) + Math.cos(a - n3) + Math.cos(a - n4) -
        Math.cos(b - n1) - Math.cos(b - n2) - Math.cos(b - n3) - Math.cos(b - n4);
      if (dE <= 0 || Math.random() < Math.exp(-dE * beta)) t[i] = b;
    }
  }

  // Energy per spin.
  function energy(t) {
    var e = 0;
    for (var i = 0; i < SITES; i++) {
      e -= Math.cos(t[i] - t[right[i]]) + Math.cos(t[i] - t[down[i]]);
    }
    return e / SITES;
  }

  // ---- Observables --------------------------------------------------------

  function wrap(x) {
    x = x % TWO_PI;
    if (x > Math.PI) return x - TWO_PI;
    if (x <= -Math.PI) return x + TWO_PI;
    return x;
  }

  var vortexSite = new Int32Array(SITES);
  var vortexSign = new Int8Array(SITES);
  var vortexCount = 0;
  var magnetization = 0;

  function measure() {
    var mx = 0, my = 0;
    vortexCount = 0;
    for (var i = 0; i < SITES; i++) {
      var a = theta[i];
      mx += Math.cos(a);
      my += Math.sin(a);
      var b = theta[right[i]];
      var c = theta[down[right[i]]];
      var d = theta[down[i]];
      var winding = wrap(b - a) + wrap(c - b) + wrap(d - c) + wrap(a - d);
      if (winding > 3 || winding < -3) {
        vortexSite[vortexCount] = i;
        vortexSign[vortexCount] = winding > 0 ? 1 : -1;
        vortexCount++;
      }
    }
    magnetization = Math.sqrt(mx * mx + my * my) / SITES;
  }

  // ---- Colours ------------------------------------------------------------

  // Arrow colours: hue follows the spin angle around the colour wheel, at a
  // fixed lightness so every arrow stays visible on the page background.
  var BUCKETS = 48;
  var bucketColour = [];
  function buildColours(dark) {
    bucketColour.length = 0;
    for (var k = 0; k < BUCKETS; k++) {
      var hue = Math.round(((k + 0.5) / BUCKETS) * 360);
      bucketColour.push("hsl(" + hue + " " + (dark ? "42% 72%" : "40% 40%") + ")");
    }
  }

  var theme = {};
  function readTheme() {
    var css = window.getComputedStyle(document.documentElement);
    var get = function (name, fallback) {
      var v = css.getPropertyValue(name).trim();
      return v || fallback;
    };
    theme.surface = get("--surface", "#f3edd6");
    theme.ink = get("--ink", "#1c2541");
    theme.muted = get("--muted", "#545b70");
    theme.rule = get("--rule", "#e2d9ba");
    theme.link = get("--link", "#2b4c9b");
    theme.paper = get("--paper", "#fbf7e9");
    theme.dark = theme.paper.toLowerCase() === "#1c0e21";
    buildColours(theme.dark);
  }

  // ---- Drawing the lattice ------------------------------------------------

  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.max(1, Math.round(canvas.clientWidth * ratio));
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    if (plot) {
      var w = Math.max(1, Math.round(plot.clientWidth * ratio));
      var h = Math.max(1, Math.round(plot.clientHeight * ratio));
      if (plot.width !== w || plot.height !== h) {
        plot.width = w;
        plot.height = h;
      }
    }
  }

  var byBucket = [];
  for (var b0 = 0; b0 < BUCKETS; b0++) byBucket.push([]);

  function draw() {
    var size = canvas.width;
    var step = size / N;
    var half = step * 0.4;
    var head = step * 0.2;
    ctx.fillStyle = theme.surface;
    ctx.fillRect(0, 0, size, size);

    for (var b = 0; b < BUCKETS; b++) byBucket[b].length = 0;
    for (var i = 0; i < SITES; i++) {
      var a = theta[i] % TWO_PI;
      if (a < 0) a += TWO_PI;
      byBucket[Math.min(BUCKETS - 1, ((a / TWO_PI) * BUCKETS) | 0)].push(i);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1, step * 0.11);
    for (var k = 0; k < BUCKETS; k++) {
      var sites = byBucket[k];
      if (!sites.length) continue;
      ctx.strokeStyle = bucketColour[k];
      ctx.beginPath();
      for (var s = 0; s < sites.length; s++) {
        var j = sites[s];
        var cx = ((j % N) + 0.5) * step;
        var cy = (((j / N) | 0) + 0.5) * step;
        var ang = theta[j];
        // Angle measured anticlockwise on screen, so y is flipped.
        var ux = Math.cos(ang), uy = -Math.sin(ang);
        var tx = cx + ux * half, ty = cy + uy * half;
        ctx.moveTo(cx - ux * half, cy - uy * half);
        ctx.lineTo(tx, ty);
        // Arrowhead: two short strokes back from the tip.
        var c1 = Math.cos(2.6), s1 = Math.sin(2.6);
        ctx.moveTo(tx + (ux * c1 - uy * s1) * head, ty + (ux * s1 + uy * c1) * head);
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx + (ux * c1 + uy * s1) * head, ty + (-ux * s1 + uy * c1) * head);
      }
      ctx.stroke();
    }

    // A vortex core sits at the centre of its plaquette.
    var radius = step * 0.22;
    ctx.lineWidth = Math.max(1, step * 0.08);
    for (var v = 0; v < vortexCount; v++) {
      var site = vortexSite[v];
      var x = ((site % N) + 1) * step;
      var y = (((site / N) | 0) + 1) * step;
      var positive = vortexSign[v] > 0;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TWO_PI);
      ctx.fillStyle = positive ? "#ffffff" : "#2f1436";
      ctx.strokeStyle = positive ? "#2f1436" : "#ffffff";
      ctx.fill();
      ctx.stroke();
    }
  }


  // ---- Equilibrium reference ---------------------------------------------

  var refCache = {};
  // Equilibrium energy per spin at temp, from Monte Carlo started aligned.
  function referenceEnergy(temp) {
    var key = temp.toFixed(2);
    if (refCache[key] !== undefined) return refCache[key];
    var t = new Float64Array(SITES);
    for (var s = 0; s < 400; s++) sweep(t, temp);
    var sum = 0, count = 0;
    for (s = 0; s < 1000; s++) {
      sweep(t, temp);
      if (s % 5 === 0) {
        sum += energy(t);
        count++;
      }
    }
    refCache[key] = sum / count;
    return refCache[key];
  }

  // ---- Energy plot --------------------------------------------------------

  var history = [];          // [sweep, energy per spin]
  var refEnergy = null;

  function record() {
    history.push([sweepCount, energy(theta)]);
    while (history.length > 2 && history[0][0] < sweepCount - PLOT_WINDOW) history.shift();
  }

  function resetHistory() {
    history = [];
    record();
  }

  function drawPlot() {
    if (!plotCtx || !history.length) return;
    var w = plot.width, h = plot.height;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var pad = { l: 38 * ratio, r: 8 * ratio, t: 10 * ratio, b: 18 * ratio };
    var x0 = Math.max(0, sweepCount - PLOT_WINDOW);
    var x1 = Math.max(x0 + 50, sweepCount);
    var lo = refEnergy !== null ? refEnergy : 0, hi = lo;
    for (var k = 0; k < history.length; k++) {
      if (history[k][1] < lo) lo = history[k][1];
      if (history[k][1] > hi) hi = history[k][1];
    }
    var span = Math.max(0.2, hi - lo);
    lo -= span * 0.12;
    hi += span * 0.12;
    var X = function (s) { return pad.l + ((s - x0) / (x1 - x0)) * (w - pad.l - pad.r); };
    var Y = function (e) { return pad.t + ((hi - e) / (hi - lo)) * (h - pad.t - pad.b); };

    plotCtx.clearRect(0, 0, w, h);
    plotCtx.font = (10 * ratio) + "px " + window.getComputedStyle(root).fontFamily;
    plotCtx.textBaseline = "middle";
    plotCtx.strokeStyle = theme.rule;
    plotCtx.lineWidth = ratio;
    plotCtx.beginPath();
    plotCtx.moveTo(pad.l, pad.t);
    plotCtx.lineTo(pad.l, h - pad.b);
    plotCtx.lineTo(w - pad.r, h - pad.b);
    plotCtx.stroke();

    plotCtx.fillStyle = theme.muted;
    plotCtx.textAlign = "right";
    plotCtx.fillText(hi.toFixed(2), pad.l - 4 * ratio, Y(hi) + 5 * ratio);
    if (refEnergy !== null) plotCtx.fillText(refEnergy.toFixed(2), pad.l - 4 * ratio, Y(refEnergy));
    plotCtx.textAlign = "left";
    plotCtx.fillText("E / N", pad.l + 4 * ratio, pad.t + 4 * ratio);
    plotCtx.textAlign = "right";
    plotCtx.fillText("sweeps", w - pad.r, h - pad.b / 2);

    if (refEnergy !== null) {
      plotCtx.strokeStyle = theme.muted;
      plotCtx.setLineDash([4 * ratio, 4 * ratio]);
      plotCtx.beginPath();
      plotCtx.moveTo(pad.l, Y(refEnergy));
      plotCtx.lineTo(w - pad.r, Y(refEnergy));
      plotCtx.stroke();
      plotCtx.setLineDash([]);
      plotCtx.textAlign = "right";
      plotCtx.fillText("equilibrium", w - pad.r, Y(refEnergy) - 8 * ratio);
    }

    plotCtx.strokeStyle = theme.link;
    plotCtx.lineWidth = 1.6 * ratio;
    plotCtx.beginPath();
    for (k = 0; k < history.length; k++) {
      var px = X(history[k][0]), py = Y(history[k][1]);
      if (k === 0) plotCtx.moveTo(px, py);
      else plotCtx.lineTo(px, py);
    }
    plotCtx.stroke();
  }

  // ---- Running ------------------------------------------------------------

  var T = slider ? parseFloat(slider.value) : 0.6;
  var running = false;
  var visible = true;
  var frameId = 0;
  var lastReport = 0;
  var sweepsPerFrame = 2;

  function report() {
    if (sweepsOut) sweepsOut.textContent = sweepCount.toLocaleString("en-US");
    if (vortexOut) vortexOut.textContent = String(vortexCount);
    if (magnetOut) magnetOut.textContent = magnetization.toFixed(2);
    if (energyOut) energyOut.textContent = energy(theta).toFixed(3);
    drawPlot();
  }

  function frame(now) {
    frameId = 0;
    if (!running || !visible) return;
    var start = performance.now();
    for (var s = 0; s < sweepsPerFrame; s++) sweep(theta, T);
    sweepCount += sweepsPerFrame;
    var spent = performance.now() - start;
    if (spent < FRAME_BUDGET_MS * 0.6 && sweepsPerFrame < MAX_SWEEPS_PER_FRAME) sweepsPerFrame++;
    else if (spent > FRAME_BUDGET_MS * 1.4 && sweepsPerFrame > 1) sweepsPerFrame--;
    measure();
    draw();
    record();
    if (now - lastReport > 150) {
      report();
      lastReport = now;
    }
    frameId = window.requestAnimationFrame(frame);
  }

  function schedule() {
    if (running && visible && !frameId) frameId = window.requestAnimationFrame(frame);
  }

  function setRunning(next) {
    running = next;
    root.classList.toggle("is-paused", !running);
    if (toggle) {
      var label = running ? "Pause" : "Run";
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
    }
    schedule();
  }

  function redraw() {
    measure();
    draw();
    report();
  }

  // ---- Controls -----------------------------------------------------------

  if (slider) {
    slider.addEventListener("input", function () {
      T = parseFloat(slider.value);
      if (valueOut) valueOut.textContent = T.toFixed(2);
      if (!running) {
        for (var s = 0; s < 30; s++) sweep(theta, T);
        sweepCount += 30;
        record();
        redraw();
      }
    });
    // A new temperature gets a new equilibrium line and a fresh plot.
    slider.addEventListener("change", function () {
      refEnergy = referenceEnergy(T);
      resetHistory();
      redraw();
    });
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setRunning(!running);
    });
  }

  if (restart) {
    restart.addEventListener("click", function () {
      randomize(theta);
      sweepCount = 0;
      resetHistory();
      redraw();
    });
  }

  // Stirring with the pointer.
  var stirring = false;
  function stirAt(event) {
    var rect = canvas.getBoundingClientRect();
    var c = Math.floor(((event.clientX - rect.left) / rect.width) * N);
    var r = Math.floor(((event.clientY - rect.top) / rect.height) * N);
    if (c < 0 || r < 0 || c >= N || r >= N) return;
    stir(c, r);
    if (!running) redraw();
  }
  canvas.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;
    stirring = true;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    stirAt(event);
  });
  canvas.addEventListener("pointermove", function (event) {
    if (stirring) stirAt(event);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) {
    canvas.addEventListener(type, function () {
      stirring = false;
    });
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      schedule();
    }).observe(canvas);
  }

  var onResize = function () {
    resize();
    redraw();
  };
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(onResize);
    ro.observe(canvas);
    if (plot) ro.observe(plot);
  } else {
    window.addEventListener("resize", onResize);
  }

  // Follow the light/dark switch.
  var onTheme = function () {
    readTheme();
    redraw();
  };
  new MutationObserver(onTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", onTheme);
  }

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("is-live");
  readTheme();
  randomize(theta);
  resize();
  if (valueOut) valueOut.textContent = T.toFixed(2);
  refEnergy = referenceEnergy(T);
  resetHistory();

  if (reduceMotion) {
    for (var s0 = 0; s0 < 1500; s0++) {
      sweep(theta, T);
      if (s0 % 25 === 0) {
        sweepCount = s0;
        record();
      }
    }
    sweepCount = 1500;
    record();
    redraw();
    setRunning(false);
  } else {
    redraw();
    setRunning(true);
  }
})();
