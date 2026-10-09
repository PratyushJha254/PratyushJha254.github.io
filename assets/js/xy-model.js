/*
 * The 2D XY model, sampled live by Metropolis Monte Carlo.
 *
 *   H = -J * sum over nearest neighbours of cos(theta_i - theta_j)
 *
 * on an N x N square lattice with periodic boundaries (a torus). Temperature
 * is in units of J / k_B, in which the BKT transition is at T = 0.893.
 *
 * Each spin is drawn as one cell, coloured by its angle with a cyclic colour
 * map. Vortices are found from the winding of the angle around each plaquette.
 *
 * The lattice starts from random spins and thermalizes in real time. Each
 * animation frame runs as many sweeps as fit in a few milliseconds, so fast
 * machines thermalize sooner. Dragging on the lattice randomizes the spins
 * under the pointer.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-xy]");
  if (!root) return;

  var canvas = root.querySelector("canvas");
  var ctx = canvas && canvas.getContext("2d");
  if (!ctx) return;

  var slider = root.querySelector("[data-xy-temperature]");
  var valueOut = root.querySelector("[data-xy-value]");
  var toggle = root.querySelector("[data-xy-toggle]");
  var restart = root.querySelector("[data-xy-restart]");
  var sweepsOut = root.querySelector("[data-xy-sweeps]");
  var vortexOut = root.querySelector("[data-xy-vortices]");
  var magnetOut = root.querySelector("[data-xy-magnetization]");

  var N = 64;
  var SITES = N * N;
  var TWO_PI = 2 * Math.PI;
  var FRAME_BUDGET_MS = 5;   // time for Monte Carlo per animation frame
  var MAX_SWEEPS_PER_FRAME = 8;
  var STIR_RADIUS = 3;       // in lattice cells

  // ---- Lattice ------------------------------------------------------------

  var theta = new Float32Array(SITES);
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

  function randomize() {
    for (var i = 0; i < SITES; i++) theta[i] = Math.random() * TWO_PI;
    sweepCount = 0;
  }

  // Randomize the spins within STIR_RADIUS cells of (col, row), wrapping
  // around the torus.
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

  // One Monte Carlo sweep: N * N single-spin Metropolis updates. The proposal
  // width depends only on T, so detailed balance holds at fixed temperature.
  function sweep(T) {
    var width = Math.min(Math.PI, 0.4 + 1.6 * T);
    var beta = 1 / T;
    for (var k = 0; k < SITES; k++) {
      var i = (Math.random() * SITES) | 0;
      var a = theta[i];
      var b = a + (2 * Math.random() - 1) * width;
      var n1 = theta[up[i]];
      var n2 = theta[down[i]];
      var n3 = theta[left[i]];
      var n4 = theta[right[i]];
      var dE =
        Math.cos(a - n1) + Math.cos(a - n2) + Math.cos(a - n3) + Math.cos(a - n4) -
        Math.cos(b - n1) - Math.cos(b - n2) - Math.cos(b - n3) - Math.cos(b - n4);
      if (dE <= 0 || Math.random() < Math.exp(-dE * beta)) {
        if (b < 0) b += TWO_PI;
        else if (b >= TWO_PI) b -= TWO_PI;
        theta[i] = b;
      }
    }
    sweepCount++;
  }

  // ---- Observables --------------------------------------------------------

  // Bring an angle difference into (-pi, pi].
  function wrap(x) {
    if (x > Math.PI) return x - TWO_PI;
    if (x <= -Math.PI) return x + TWO_PI;
    return x;
  }

  var vortexSite = new Int32Array(SITES);
  var vortexSign = new Int8Array(SITES);
  var vortexCount = 0;
  var magnetization = 0;

  function measure() {
    var mx = 0;
    var my = 0;
    vortexCount = 0;
    for (var i = 0; i < SITES; i++) {
      var a = theta[i];
      mx += Math.cos(a);
      my += Math.sin(a);

      // Winding around the plaquette whose top-left corner is site i.
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

  // ---- Drawing ------------------------------------------------------------

  // matplotlib's "twilight" cyclic colour map, sampled at 32 points.
  var ANCHORS = [
    "e2d9e2", "d7d7dd", "c4ced4", "acc2cc", "95b5c7", "81a6c3", "7297c1", "6887be",
    "6276ba", "5f64b5", "5e51ad", "5d3da1", "592a8f", "511b77", "45135c", "381145",
    "2f1436", "3a113a", "4a1342", "5f174a", "741e4f", "872750", "983550", "a64550",
    "b25652", "bb6958", "c27c63", "c89073", "cca389", "d1b6a3", "d8c7be", "dfd4d6"
  ];
  var LEVELS = 256;
  var lut = new Uint8Array(LEVELS * 3);
  (function buildLut() {
    var n = ANCHORS.length;
    for (var k = 0; k < LEVELS; k++) {
      var x = (k / LEVELS) * n;
      var lo = Math.floor(x) % n;
      var hi = (lo + 1) % n;
      var f = x - Math.floor(x);
      for (var ch = 0; ch < 3; ch++) {
        var p = parseInt(ANCHORS[lo].substr(ch * 2, 2), 16);
        var q = parseInt(ANCHORS[hi].substr(ch * 2, 2), 16);
        lut[k * 3 + ch] = Math.round(p + (q - p) * f);
      }
    }
  })();

  var cells = document.createElement("canvas");
  cells.width = N;
  cells.height = N;
  var cellCtx = cells.getContext("2d");
  var image = cellCtx.createImageData(N, N);

  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.max(1, Math.round(canvas.clientWidth * ratio));
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
  }

  function draw() {
    var data = image.data;
    for (var i = 0; i < SITES; i++) {
      var level = ((theta[i] / TWO_PI) * LEVELS) & (LEVELS - 1);
      data[i * 4] = lut[level * 3];
      data[i * 4 + 1] = lut[level * 3 + 1];
      data[i * 4 + 2] = lut[level * 3 + 2];
      data[i * 4 + 3] = 255;
    }
    cellCtx.putImageData(image, 0, 0);

    var size = canvas.width;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cells, 0, 0, size, size);

    // A vortex core sits at the centre of its plaquette, which is the corner
    // shared by four cells.
    var step = size / N;
    var radius = step * 0.38;
    ctx.lineWidth = Math.max(1, step * 0.18);
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

  function report() {
    if (sweepsOut) sweepsOut.textContent = sweepCount.toLocaleString("en-US");
    if (vortexOut) vortexOut.textContent = String(vortexCount);
    if (magnetOut) magnetOut.textContent = magnetization.toFixed(2);
  }

  // ---- Running ------------------------------------------------------------

  var T = slider ? parseFloat(slider.value) : 0.6;
  var running = false;
  var visible = true;
  var frameId = 0;
  var lastReport = 0;
  var sweepsPerFrame = 2;

  function frame(now) {
    frameId = 0;
    if (!running || !visible) return;
    var start = performance.now();
    for (var s = 0; s < sweepsPerFrame; s++) sweep(T);
    // Fit the number of sweeps to the time budget of this machine.
    var spent = performance.now() - start;
    if (spent < FRAME_BUDGET_MS * 0.6 && sweepsPerFrame < MAX_SWEEPS_PER_FRAME) sweepsPerFrame++;
    else if (spent > FRAME_BUDGET_MS * 1.4 && sweepsPerFrame > 1) sweepsPerFrame--;
    measure();
    draw();
    if (now - lastReport > 200) {
      report();
      lastReport = now;
    }
    frameId = window.requestAnimationFrame(frame);
  }

  function schedule() {
    if (running && visible && !frameId) frameId = window.requestAnimationFrame(frame);
  }

  // Advance a paused simulation by a fixed number of sweeps and show it.
  function relax(sweeps) {
    for (var s = 0; s < sweeps; s++) sweep(T);
    measure();
    draw();
    report();
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

  if (slider) {
    slider.addEventListener("input", function () {
      T = parseFloat(slider.value);
      if (valueOut) valueOut.textContent = T.toFixed(2);
      if (!running) relax(30);
    });
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setRunning(!running);
    });
  }

  if (restart) {
    restart.addEventListener("click", function () {
      randomize();
      redraw();
    });
  }

  // ---- Stirring with the pointer -----------------------------------------

  var stirring = false;

  function stirAt(event) {
    var rect = canvas.getBoundingClientRect();
    var col = Math.floor(((event.clientX - rect.left) / rect.width) * N);
    var row = Math.floor(((event.clientY - rect.top) / rect.height) * N);
    if (col < 0 || row < 0 || col >= N || row >= N) return;
    stir(col, row);
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

  if ("ResizeObserver" in window) {
    new ResizeObserver(function () {
      resize();
      measure();
      draw();
    }).observe(canvas);
  } else {
    window.addEventListener("resize", function () {
      resize();
      measure();
      draw();
    });
  }

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("is-live");
  randomize();
  resize();
  if (valueOut) valueOut.textContent = T.toFixed(2);

  if (reduceMotion) {
    // Show a settled configuration and wait to be asked before animating.
    relax(1500);
    setRunning(false);
  } else {
    // Start from a disordered state and let it cool: vortices and
    // antivortices find each other and annihilate.
    redraw();
    setRunning(true);
  }
})();
