(() => {
  const storageKey = 'jro-search.items.theme';
  const themes = new Set(['dark', 'light', 'ocean', 'sky', 'forest', 'mint', 'violet', 'sakura', 'amber', 'sunlight']);
  const toggle = document.getElementById('themeToggle');
  const popover = document.getElementById('colorModePopover');
  const choices = [...popover.querySelectorAll('[data-theme-choice]')];
  const menu = document.getElementById('navMenuToggle');

  const showTheme = (theme) => {
    const selected = themes.has(theme) ? theme : 'dark';
    document.documentElement.dataset.theme = selected;
    toggle.dataset.themeValue = selected;
    for (const choice of choices) {
      choice.setAttribute('aria-pressed', String(choice.dataset.themeChoice === selected));
    }
  };

  const closePopover = () => {
    popover.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };

  showTheme(document.documentElement.dataset.theme);

  toggle.addEventListener('click', () => {
    popover.hidden = !popover.hidden;
    toggle.setAttribute('aria-expanded', String(!popover.hidden));
  });

  for (const choice of choices) {
    choice.addEventListener('click', () => {
      const theme = choice.dataset.themeChoice;
      showTheme(theme);
      try {
        localStorage.setItem(storageKey, theme);
      } catch {
        // The chosen theme still applies to this page if storage is blocked.
      }
      closePopover();
      toggle.focus();
    });
  }

  document.addEventListener('click', (event) => {
    if (!popover.hidden && !popover.contains(event.target) && !toggle.contains(event.target)) closePopover();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!popover.hidden) {
      closePopover();
      toggle.focus();
    }
    menu.checked = false;
  });

  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) showTheme(event.newValue);
  });
})();
