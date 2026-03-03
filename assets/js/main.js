(function () {
  const root = document.documentElement;
  const toggleBtn = document.querySelector('[data-theme-toggle]');

  // Load saved theme
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') {
    root.setAttribute('data-theme', saved);
  }

  // Set active nav link based on current file
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
  });

  // Toggle theme
  function setTheme(next) {
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      toggleBtn.innerText = next === 'dark' ? '☀️' : '🌙';
    }
  }

  if (toggleBtn) {
    // Initialize icon based on current theme
    const current = root.getAttribute('data-theme') || 'light';
    toggleBtn.innerText = current === 'dark' ? '☀️' : '🌙';

    toggleBtn.addEventListener('click', () => {
      const now = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(now);
    });
  }
})();
