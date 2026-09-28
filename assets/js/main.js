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

  document.querySelectorAll('[data-carousel]').forEach(function (c) {
    var track = c.querySelector('.track');
    var btns = c.querySelectorAll('.arrow');
    function step() {
      var card = track.querySelector('.pcard');
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      btns[0].disabled = track.scrollLeft <= 2;
      btns[1].disabled = track.scrollLeft >= max;
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        track.scrollBy({ left: step() * Number(b.getAttribute('data-dir')) });
      });
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  var y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
