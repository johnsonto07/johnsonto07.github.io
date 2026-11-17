(function () {
  var root = document.documentElement;
  // The <head> script hides not-yet-revealed elements (html.js). This flag
  // tells it this file loaded and will reveal them, so it leaves .js in place.
  window.siteReady = true;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var btn = document.querySelector('[data-theme-toggle]');
  var sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function paint(turn) {
    if (!btn) return;
    var dark = isDark();
    btn.innerHTML = dark ? sun : moon;
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    if (turn) btn.firstChild.classList.add('turn');
  }
  if (btn) {
    paint();
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      function apply() {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        paint(true);
      }
      // Where the browser supports it, the new theme opens in a circle from
      // the button. Elsewhere, or with reduced motion, it switches at once.
      if (reduce || !document.startViewTransition) { apply(); return; }
      var r = btn.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var far = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.classList.add('theme-swap');
      var vt = document.startViewTransition(apply);
      vt.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + far + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 550, easing: 'cubic-bezier(.3,.6,.2,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
      vt.finished.then(done, done);
      function done() { root.classList.remove('theme-swap'); }
    });
  }

  var page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page');
  });

  // Project carousel: a wheel that drifts sideways and loops forever.
  // The track is moved with a transform, so there is no scroll bar and no end.
  // Three copies of the cards sit side by side and the position wraps after
  // one copy, which is why the loop has no visible seam. It can be dragged or
  // swiped (a flick keeps it spinning), scrolled sideways on a trackpad, and
  // stepped with the arrow buttons or the arrow keys.
  // Without this script the list falls back to plain sideways scrolling.
  document.querySelectorAll('[data-carousel]').forEach(function (c) {
    var track = c.querySelector('.track');
    var btns = c.querySelectorAll('.arrow');
    var real = Array.prototype.slice.call(track.children);
    if (!real.length) return;

    function clone(el) {
      var k = el.cloneNode(true);
      k.setAttribute('aria-hidden', 'true');
      k.querySelectorAll('a,button').forEach(function (x) { x.setAttribute('tabindex', '-1'); });
      return k;
    }
    real.forEach(function (el) { track.appendChild(clone(el)); });
    real.slice().reverse().forEach(function (el) { track.insertBefore(clone(el), track.firstChild); });

    track.removeAttribute('tabindex');   // the arrows and arrow keys replace native scrolling
    c.classList.add('is-wheel');

    var setW = 1;        // width of one copy of the cards
    var stepW = 1;       // one card plus the gap after it
    var pos = 0;         // how far the wheel has turned, in px
    var vel = 0;         // current speed, px per second
    var tween = null;    // a glide started by an arrow, a key, or keyboard focus
    var drag = null;     // pointer currently holding the wheel
    var swallowClick = false;
    var hover = false, focused = false, holdUntil = 0;
    var visible = !('IntersectionObserver' in window);   // set by the observer below
    var raf = 0, last = 0;

    function wrap(x) { return ((x % setW) + setW) % setW; }
    function measure() {
      // Fractional widths matter here: rounding would show as a tiny jump at the wrap.
      var kids = track.children, n = real.length;
      function left(i) { return kids[i].getBoundingClientRect().left; }
      var turns = pos / stepW;
      stepW = left(1) - left(0);
      setW = left(n * 2) - left(n);
      pos = turns * stepW;   // keep the same card in the same place after a resize
    }
    // Sub-pixel positions keep the motion smooth; at rest it settles on a whole
    // device pixel so the text is sharp.
    function render(still) {
      var x = setW + wrap(pos);
      if (still) { var dpr = window.devicePixelRatio || 1; x = Math.round(x * dpr) / dpr; }
      track.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
    }

    // The wheel drifts on its own unless something is holding it still.
    function cruising() {
      return !reduce && visible && !document.hidden && !hover && !focused && !drag && performance.now() >= holdUntil;
    }
    function hold(ms) { holdUntil = performance.now() + ms; setTimeout(kick, ms + 30); }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    function frame(now) {
      raf = 0;
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (tween) {
        // Soft start, long soft landing
        var p = Math.max(0, Math.min(1, (now - tween.t0) / tween.ms));
        var s = p * p * (3 - 2 * p);
        pos = tween.from + tween.dist * (1 - (1 - s) * (1 - s));
        if (p === 1) { tween = null; vel = 0; pos = wrap(pos); }
        render(!tween);
      } else if (!(drag && drag.moved)) {
        // Speed eases toward the resting drift (or toward a stop), which also
        // gives a flick its slow-down.
        var want = cruising() ? stepW / 14 : 0;
        vel += (want - vel) * (1 - Math.exp(-3 * dt));
        if (Math.abs(want - vel) < 0.3) vel = want;
        pos = wrap(pos + vel * dt);
        render(!vel);
      }
      if (tween || vel || cruising()) raf = requestAnimationFrame(frame);
    }

    function glide(to, ms) {
      if (reduce) { pos = wrap(to); tween = null; vel = 0; render(true); return; }
      tween = { from: pos, dist: to - pos, t0: performance.now(), ms: ms || 700 };
      kick();
    }
    // Arrows and arrow keys move one card and land with a card on the left edge.
    function stepBy(dir) {
      var at = tween ? tween.from + tween.dist : pos;
      var i = dir > 0 ? Math.floor(at / stepW + 0.02) + 1 : Math.ceil(at / stepW - 0.02) - 1;
      glide(i * stepW);
      hold(6000);
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { stepBy(Number(b.getAttribute('data-dir'))); });
    });
    c.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      stepBy(e.key === 'ArrowRight' ? 1 : -1);
    });

    // Drag or swipe. It only counts as a drag after 6 px, so links still click.
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { id: e.pointerId, x0: e.clientX, x: e.clientX, t: e.timeStamp, v: 0, moved: false };
      tween = null; vel = 0;
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.x0) < 6) return;
        drag.moved = true; drag.x = e.clientX; drag.t = e.timeStamp;
        try { track.setPointerCapture(drag.id); } catch (err) {}
        c.classList.add('is-dragging');
        return;
      }
      var dx = e.clientX - drag.x, dt = (e.timeStamp - drag.t) / 1000;
      if (dt > 0) drag.v = 0.6 * (-dx / dt) + 0.4 * drag.v;
      drag.x = e.clientX; drag.t = e.timeStamp;
      pos = wrap(pos - dx);
      render();
    });
    function release(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      c.classList.remove('is-dragging');
      if (d.moved) {
        if (!reduce && e.type === 'pointerup' && e.timeStamp - d.t < 90) vel = Math.max(-4000, Math.min(4000, d.v));
        swallowClick = true;
        setTimeout(function () { swallowClick = false; }, 60);
        hold(3500);
      }
      kick();
    }
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    track.addEventListener('click', function (e) {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault(); e.stopPropagation();
    }, true);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // Sideways trackpad scrolling (or shift + wheel) turns the wheel.
    // Up and down scrolling is left to the page.
    c.addEventListener('wheel', function (e) {
      var dx = e.deltaX, dy = e.deltaY;
      if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      if (Math.abs(dx) <= Math.abs(dy)) return;
      e.preventDefault();
      tween = null; vel = 0;
      pos = wrap(pos + dx * (e.deltaMode === 1 ? 32 : 1));
      render();
      hold(2500);
      kick();
    }, { passive: false });

    // Hold still under the mouse and while a link inside has keyboard focus.
    c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    c.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hover = false; kick(); } });
    c.addEventListener('focusin', function (e) {
      var keyboard = true;
      try { keyboard = e.target.matches(':focus-visible'); } catch (err) {}
      if (!keyboard) return;
      focused = true;
      // Bring the focused card to the left edge, going the shorter way round.
      var i = real.indexOf(e.target.closest('.pcard'));
      if (i < 0) return;
      var d = i * stepW - wrap(pos);
      if (d > setW / 2) d -= setW; else if (d < -setW / 2) d += setW;
      if (Math.abs(d) > 1) glide(pos + d, 500);
    });
    c.addEventListener('focusout', function () { focused = false; kick(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(c);
    }
    document.addEventListener('visibilitychange', kick);
    window.addEventListener('resize', function () { tween = null; measure(); render(!vel); });
    // Older browsers clip with overflow:hidden, which can still be scrolled by focus.
    var win = c.querySelector('.wheel');
    if (win) win.addEventListener('scroll', function () { win.scrollLeft = 0; });

    measure();
    render(true);
    kick();
  });

  // Scroll reveals. The CSS hides [data-reveal] elements until they get .is-in.
  // Elements inside a [data-reveal-group] (the carousel) are revealed together
  // when the group arrives, so looping cards never show up half-revealed.
  // This runs after the carousel has made its clones so they are included.
  var slice = Array.prototype.slice;
  var revealEls = slice.call(document.querySelectorAll('[data-reveal]'));
  var groups = slice.call(document.querySelectorAll('[data-reveal-group]'));
  var plots = slice.call(document.querySelectorAll('.titration'));

  function show(el, delay) {
    if (delay) el.style.setProperty('--d', delay + 'ms');
    el.classList.add('is-in');
  }
  function drawPlot(svg, io) {
    var c = svg.closest('[data-carousel]');
    (c ? slice.call(c.querySelectorAll('.titration')) : [svg]).forEach(function (s) {
      s.classList.add('is-drawn');
      if (io) io.unobserve(s);
    });
  }

  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { show(el, 0); });
    plots.forEach(function (s) { drawPlot(s); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      // Let the page entrance get going before anything else starts.
      var base = root.classList.contains('play-intro') && performance.now() < 1500 ? 450 : 0;
      var n = 0;
      entries.forEach(function (e) {
        var el = e.target;
        var above = !e.isIntersecting && e.boundingClientRect.bottom <= 0;
        if (!e.isIntersecting && !above) return;
        io.unobserve(el);
        if (el.hasAttribute('data-reveal-group')) {
          var k = 0;
          slice.call(el.querySelectorAll('[data-reveal]')).forEach(function (child) {
            var r = child.getBoundingClientRect();
            var onScreen = !above && r.right > 0 && r.left < window.innerWidth;
            show(child, onScreen ? base + k++ * 110 : 0);
          });
        } else {
          show(el, above ? 0 : base + n++ * 120);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach(function (el) { if (!el.closest('[data-reveal-group]')) io.observe(el); });
    groups.forEach(function (g) { io.observe(g); });

    // Plot the titration curve the first time most of the chart is on screen.
    // In the carousel it waits until nearly all of it has come round.
    var plotIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var need = e.target.closest('[data-carousel]') ? 0.85 : 0.55;
        if (e.intersectionRatio >= need) drawPlot(e.target, plotIO);
      });
    }, { threshold: [0.55, 0.85] });
    plots.forEach(function (s) { plotIO.observe(s); });
  }

  var y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
