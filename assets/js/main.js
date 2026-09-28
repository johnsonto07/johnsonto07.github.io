(function () {
  var root = document.documentElement;
  var btn = document.querySelector('[data-theme-toggle]');
  var sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function paint() {
    if (!btn) return;
    var dark = isDark();
    btn.innerHTML = dark ? sun : moon;
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  if (btn) {
    paint();
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      paint();
    });
  }

  var page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page');
  });

  // Project carousel: loops forever and advances on its own.
  document.querySelectorAll('[data-carousel]').forEach(function (c) {
    var track = c.querySelector('.track');
    var btns = c.querySelectorAll('.arrow');
    var real = Array.prototype.slice.call(track.children);
    if (!real.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function clone(el) {
      var k = el.cloneNode(true);
      k.setAttribute('aria-hidden', 'true');
      k.querySelectorAll('a,button').forEach(function (x) { x.setAttribute('tabindex', '-1'); });
      return k;
    }
    real.forEach(function (el) { track.appendChild(clone(el)); });
    real.slice().reverse().forEach(function (el) { track.insertBefore(clone(el), track.firstChild); });

    function setWidth() { return track.children[real.length * 2].offsetLeft - track.children[real.length].offsetLeft; }
    function step() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return real[0].getBoundingClientRect().width + gap;
    }
    function jump(to) {
      track.style.scrollBehavior = 'auto';
      track.style.scrollSnapType = 'none';
      track.scrollLeft = to;
      track.offsetHeight;
      track.style.scrollSnapType = '';
      track.style.scrollBehavior = '';
    }
    function normalize() {
      var w = setWidth();
      if (track.scrollLeft < w - 2) jump(track.scrollLeft + w);
      else if (track.scrollLeft >= 2 * w - 2) jump(track.scrollLeft - w);
    }
    jump(setWidth());

    var t;
    track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(normalize, 140); }, { passive: true });
    window.addEventListener('resize', function () { jump(setWidth() + (track.scrollLeft % setWidth())); normalize(); });

    function go(dir) { track.scrollBy({ left: step() * dir, behavior: reduce ? 'auto' : 'smooth' }); }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { go(Number(b.getAttribute('data-dir'))); pauseFor(8000); });
    });

    // Auto-advance every 4 s; pause while hovered, focused, touched, or off screen.
    var hover = false, focus = false, held = 0, visible = true;
    function pauseFor(ms) { held = Date.now() + ms; }
    c.addEventListener('mouseenter', function () { hover = true; });
    c.addEventListener('mouseleave', function () { hover = false; });
    c.addEventListener('focusin', function () { focus = true; });
    c.addEventListener('focusout', function () { focus = false; });
    track.addEventListener('pointerdown', function () { pauseFor(8000); });
    track.addEventListener('wheel', function () { pauseFor(8000); }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(c);
    }
    if (!reduce) {
      setInterval(function () {
        if (hover || focus || !visible || document.hidden || Date.now() < held) return;
        go(1);
      }, 4000);
    }
  });

  var y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
