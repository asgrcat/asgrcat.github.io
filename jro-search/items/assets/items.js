    const mainGrid = document.getElementById('mainGrid');
    const paneResizer = document.getElementById('paneResizer');
    const searchTab = document.getElementById('searchTab');
    const previewTab = document.getElementById('previewTab');
    const keywordInput = document.getElementById('keywordInput');
    const searchTargetSelect = document.getElementById('searchTargetSelect');
    const searchButton = document.getElementById('searchButton');
    const resetButton = document.getElementById('resetButton');
    const resultCount = document.getElementById('resultCount');
    const emptyResult = document.getElementById('emptyResult');
    const resultItems = document.querySelectorAll('.result-item');
    const resultButtons = document.querySelectorAll('.result-button');
    const effectButtons = document.querySelectorAll('.effect-button');
    const filterChips = document.querySelectorAll('.chip[data-filter-group]');
    const enchantSetToggles = document.querySelectorAll('.enchant-set-toggle');
    const previewTitle = document.getElementById('previewTitle');
    const previewUrl = document.getElementById('previewUrl');
    const officialFrame = document.getElementById('officialFrame');
    const openOfficial = document.getElementById('openOfficial');
    const paneWidthStorageKey = 'jro-search.items.searchPaneWidth';

    const setActiveMainTab = (tabName) => {
      const isPreview = tabName === 'preview';

      mainGrid.classList.toggle('show-preview', isPreview);
      searchTab.setAttribute('aria-selected', String(!isPreview));
      previewTab.setAttribute('aria-selected', String(isPreview));
    };

    const getSearchPaneWidthBounds = () => {
      const rect = mainGrid.getBoundingClientRect();
      const minLeft = 390;
      const minRight = 320;
      const resizerWidth = paneResizer.getBoundingClientRect().width || 10;
      const gapWidth = 20;
      const maxLeft = Math.max(minLeft, rect.width - minRight - resizerWidth - gapWidth);

      return { maxLeft, minLeft, rect };
    };

    const applySearchPaneWidth = (width) => {
      const { maxLeft, minLeft } = getSearchPaneWidthBounds();
      const nextWidth = Math.min(Math.max(width, minLeft), maxLeft);

      mainGrid.style.setProperty('--search-pane-width', `${Math.round(nextWidth)}px`);

      return nextWidth;
    };

    const saveSearchPaneWidth = (width) => {
      try {
        window.localStorage.setItem(paneWidthStorageKey, String(Math.round(width)));
      } catch {
        // Ignore storage failures in private browsing or restricted environments.
      }
    };

    const restoreSearchPaneWidth = () => {
      if (window.matchMedia('(max-width: 960px)').matches) {
        return;
      }

      try {
        const savedWidth = Number.parseInt(window.localStorage.getItem(paneWidthStorageKey) || '', 10);

        if (!Number.isNaN(savedWidth)) {
          applySearchPaneWidth(savedWidth);
        }
      } catch {
        // Ignore storage failures in private browsing or restricted environments.
      }
    };

    const setSearchPaneWidth = (clientX) => {
      const { rect } = getSearchPaneWidthBounds();
      const nextWidth = applySearchPaneWidth(clientX - rect.left);

      saveSearchPaneWidth(nextWidth);
    };

    const stopResizing = () => {
      mainGrid.classList.remove('is-resizing');
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', resizeWithPointer);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
    };

    const resizeWithPointer = (event) => {
      setSearchPaneWidth(event.clientX);
    };

    const normalizeSearchText = (value) => value
      .normalize('NFKC')
      .toLowerCase()
      .trim();

    const getSelectedFilters = (group) => Array.from(filterChips)
      .filter((chip) => chip.dataset.filterGroup === group && chip.getAttribute('aria-pressed') === 'true')
      .map((chip) => chip.dataset.filterValue);

    const splitDataValues = (value) => (value || '').split(/\s+/).filter(Boolean);

    const includesAny = (values, selectedValues) => (
      selectedValues.length === 0 || selectedValues.some((selectedValue) => values.includes(selectedValue))
    );

    const getSearchableText = (button, target) => {
      const name = button.dataset.name || '';
      const description = button.dataset.description || '';
      const enchantText = button.dataset.enchantText || '';

      if (target === '説明') {
        return description;
      }

      if (target === 'エンチャント情報') {
        return enchantText;
      }

      if (target === 'すべて') {
        return `${name} ${description} ${enchantText}`;
      }

      return name;
    };

    const activateResult = (button, shouldSwitchPreviewTab = false) => {
      resultButtons.forEach((item) => item.classList.remove('is-active'));
      effectButtons.forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');

      const name = button.dataset.name || '公式アイテムページ';
      const url = button.dataset.url || 'about:blank';

      previewTitle.textContent = name;
      previewUrl.textContent = url;
      officialFrame.src = url;
      openOfficial.href = url;

      if (shouldSwitchPreviewTab && window.matchMedia('(max-width: 960px)').matches) {
        setActiveMainTab('preview');
      }
    };

    const applyFilters = () => {
      const keyword = normalizeSearchText(keywordInput.value);
      const target = searchTargetSelect.value;
      const selectedPositions = getSelectedFilters('position');
      const selectedEnchants = getSelectedFilters('enchant');
      let visibleCount = 0;

      resultItems.forEach((item) => {
        const button = item.querySelector('.result-button');
        const searchableText = normalizeSearchText(getSearchableText(button, target));
        const positions = splitDataValues(button.dataset.positions);
        const enchants = splitDataValues(button.dataset.enchants);
        const matchesKeyword = keyword === '' || searchableText.includes(keyword);
        const matchesPositions = includesAny(positions, selectedPositions);
        const matchesEnchants = includesAny(enchants, selectedEnchants);
        const isVisible = matchesKeyword && matchesPositions && matchesEnchants;

        item.hidden = !isVisible;

        if (isVisible) {
          visibleCount += 1;
        }
      });

      resultCount.textContent = `${visibleCount}件`;
      emptyResult.classList.toggle('is-visible', visibleCount === 0);

      const activeButton = document.querySelector('.result-button.is-active');
      const activeItem = activeButton?.closest('.result-item');

      if (visibleCount === 0) {
        resultButtons.forEach((button) => button.classList.remove('is-active'));
        return;
      }

      if (visibleCount > 0 && (!activeItem || activeItem.hidden)) {
        const firstVisibleButton = Array.from(resultItems)
          .find((item) => !item.hidden)
          ?.querySelector('.result-button');

        if (firstVisibleButton) {
          activateResult(firstVisibleButton);
        }
      }
    };

    const resetFilters = () => {
      keywordInput.value = '';
      searchTargetSelect.value = 'アイテム名';
      filterChips.forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
      applyFilters();
    };

    paneResizer.addEventListener('pointerdown', (event) => {
      if (window.matchMedia('(max-width: 960px)').matches) {
        return;
      }

      event.preventDefault();
      mainGrid.classList.add('is-resizing');
      document.body.style.userSelect = 'none';
      paneResizer.setPointerCapture?.(event.pointerId);
      setSearchPaneWidth(event.clientX);
      window.addEventListener('pointermove', resizeWithPointer);
      window.addEventListener('pointerup', stopResizing);
      window.addEventListener('pointercancel', stopResizing);
    });

    paneResizer.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }

      event.preventDefault();

      const { rect } = getSearchPaneWidthBounds();
      const current = parseInt(getComputedStyle(mainGrid).getPropertyValue('--search-pane-width'), 10);
      const fallback = Math.round(rect.width * 0.46);
      const currentWidth = Number.isNaN(current) ? fallback : current;
      const step = event.shiftKey ? 80 : 32;

      if (event.key === 'Home') {
        setSearchPaneWidth(rect.left + 390);
      } else if (event.key === 'End') {
        setSearchPaneWidth(rect.right - 320);
      } else {
        setSearchPaneWidth(rect.left + currentWidth + (event.key === 'ArrowRight' ? step : -step));
      }
    });

    searchTab.addEventListener('click', () => setActiveMainTab('search'));
    previewTab.addEventListener('click', () => setActiveMainTab('preview'));
    searchButton.addEventListener('click', applyFilters);
    resetButton.addEventListener('click', resetFilters);
    keywordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyFilters();
      }
    });

    searchTargetSelect.addEventListener('change', applyFilters);

    enchantSetToggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const enchantSet = toggle.closest('.enchant-set');
        const expanded = toggle.getAttribute('aria-expanded') === 'true';

        toggle.setAttribute('aria-expanded', String(!expanded));
        enchantSet?.classList.toggle('is-collapsed', expanded);
      });
    });

    resultButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activateResult(button, true);
      });
    });

    effectButtons.forEach((button) => {
      button.addEventListener('click', () => {
        effectButtons.forEach((item) => item.classList.remove('is-active'));
        button.classList.add('is-active');

        const name = button.dataset.effectName || 'エンチャント効果';
        const url = button.dataset.effectUrl || 'about:blank';

        previewTitle.textContent = `エンチャント効果: ${name}`;
        previewUrl.textContent = url;
        officialFrame.src = url;
        openOfficial.href = url;
      });
    });

    filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const pressed = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', String(!pressed));
        applyFilters();
      });
    });

    restoreSearchPaneWidth();
    applyFilters();
