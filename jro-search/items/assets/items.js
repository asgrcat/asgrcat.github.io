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
    const previewEmpty = document.getElementById('previewEmpty');
    const previewHeader = document.getElementById('previewHeader');
    const enchantSummary = document.getElementById('enchantSummary');
    const enchantEmpty = document.getElementById('enchantEmpty');
    const enchantSets = document.querySelectorAll('.enchant-set[data-enchant-key]');
    const iframeWrap = document.getElementById('iframeWrap');
    const previewTitle = document.getElementById('previewTitle');
    const previewUrl = document.getElementById('previewUrl');
    const officialFrame = document.getElementById('officialFrame');
    const openOfficial = document.getElementById('openOfficial');
    const paneWidthStorageKey = 'jro-search.items.searchPaneWidth';
    let hasSearched = false;

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

    const kanaDigraphs = {
      きゃ: 'kya',
      きゅ: 'kyu',
      きょ: 'kyo',
      しゃ: 'sha',
      しゅ: 'shu',
      しょ: 'sho',
      ちゃ: 'cha',
      ちゅ: 'chu',
      ちょ: 'cho',
      にゃ: 'nya',
      にゅ: 'nyu',
      にょ: 'nyo',
      ひゃ: 'hya',
      ひゅ: 'hyu',
      ひょ: 'hyo',
      みゃ: 'mya',
      みゅ: 'myu',
      みょ: 'myo',
      りゃ: 'rya',
      りゅ: 'ryu',
      りょ: 'ryo',
      ぎゃ: 'gya',
      ぎゅ: 'gyu',
      ぎょ: 'gyo',
      じゃ: 'ja',
      じゅ: 'ju',
      じょ: 'jo',
      びゃ: 'bya',
      びゅ: 'byu',
      びょ: 'byo',
      ぴゃ: 'pya',
      ぴゅ: 'pyu',
      ぴょ: 'pyo',
      ふぁ: 'fa',
      ふぃ: 'fi',
      ふぇ: 'fe',
      ふぉ: 'fo',
      てぃ: 'ti',
      でぃ: 'di',
      うぃ: 'wi',
      うぇ: 'we',
      うぉ: 'wo',
    };

    const kanaRomanMap = {
      あ: 'a',
      い: 'i',
      う: 'u',
      え: 'e',
      お: 'o',
      か: 'ka',
      き: 'ki',
      く: 'ku',
      け: 'ke',
      こ: 'ko',
      さ: 'sa',
      し: 'shi',
      す: 'su',
      せ: 'se',
      そ: 'so',
      た: 'ta',
      ち: 'chi',
      つ: 'tsu',
      て: 'te',
      と: 'to',
      な: 'na',
      に: 'ni',
      ぬ: 'nu',
      ね: 'ne',
      の: 'no',
      は: 'ha',
      ひ: 'hi',
      ふ: 'fu',
      へ: 'he',
      ほ: 'ho',
      ま: 'ma',
      み: 'mi',
      む: 'mu',
      め: 'me',
      も: 'mo',
      や: 'ya',
      ゆ: 'yu',
      よ: 'yo',
      ら: 'ra',
      り: 'ri',
      る: 'ru',
      れ: 're',
      ろ: 'ro',
      わ: 'wa',
      を: 'wo',
      ん: 'n',
      が: 'ga',
      ぎ: 'gi',
      ぐ: 'gu',
      げ: 'ge',
      ご: 'go',
      ざ: 'za',
      じ: 'ji',
      ず: 'zu',
      ぜ: 'ze',
      ぞ: 'zo',
      だ: 'da',
      ぢ: 'ji',
      づ: 'zu',
      で: 'de',
      ど: 'do',
      ば: 'ba',
      び: 'bi',
      ぶ: 'bu',
      べ: 'be',
      ぼ: 'bo',
      ぱ: 'pa',
      ぴ: 'pi',
      ぷ: 'pu',
      ぺ: 'pe',
      ぽ: 'po',
      ぁ: 'a',
      ぃ: 'i',
      ぅ: 'u',
      ぇ: 'e',
      ぉ: 'o',
      ゃ: 'ya',
      ゅ: 'yu',
      ょ: 'yo',
    };

    const toHiragana = (value) => value.replace(/[\u30a1-\u30f6]/g, (char) => (
      String.fromCharCode(char.charCodeAt(0) - 0x60)
    ));

    const compactSearchText = (value) => value.replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~、。，．・：；？！「」『』【】（）［］｛｝〈〉《》〔〕〜～ー]/g, '');

    const normalizeSearchText = (value) => compactSearchText(
      toHiragana(value.normalize('NFKC').toLowerCase()).replace(/[っッ]/g, '')
    );

    const romanizeKana = (value) => {
      const hiragana = toHiragana(value.normalize('NFKC').toLowerCase());
      let result = '';

      for (let index = 0; index < hiragana.length; index += 1) {
        const current = hiragana[index];

        if (current === 'っ') {
          const pair = hiragana.slice(index + 1, index + 3);
          const nextRoman = kanaDigraphs[pair] || kanaRomanMap[hiragana[index + 1]] || '';
          result += nextRoman.charAt(0);
          continue;
        }

        const pair = hiragana.slice(index, index + 2);

        if (kanaDigraphs[pair]) {
          result += kanaDigraphs[pair];
          index += 1;
          continue;
        }

        result += kanaRomanMap[current] || current;
      }

      return compactSearchText(result);
    };

    const getSearchVariants = (value) => {
      const base = value.normalize('NFKC').toLowerCase();
      const kana = normalizeSearchText(base);
      const roman = romanizeKana(base);

      return Array.from(new Set([
        compactSearchText(base),
        kana,
        roman,
        roman.replace(/shi/g, 'si').replace(/chi/g, 'ti').replace(/tsu/g, 'tu').replace(/fu/g, 'hu'),
      ].filter(Boolean)));
    };

    const isSubsequence = (text, query) => {
      let queryIndex = 0;

      for (let textIndex = 0; textIndex < text.length && queryIndex < query.length; textIndex += 1) {
        if (text[textIndex] === query[queryIndex]) {
          queryIndex += 1;
        }
      }

      return queryIndex === query.length;
    };

    const matchesFuzzyText = (text, query) => {
      const textVariants = getSearchVariants(text);
      const queryVariants = getSearchVariants(query);

      return queryVariants.some((queryVariant) => textVariants.some((textVariant) => (
        textVariant.includes(queryVariant) || (queryVariant.length >= 3 && isSubsequence(textVariant, queryVariant))
      )));
    };

    const splitSearchTerms = (query) => query
      .normalize('NFKC')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const matchesSearchQuery = (text, query) => {
      const terms = splitSearchTerms(query);

      if (terms.length === 0) {
        return true;
      }

      return terms.every((term) => matchesFuzzyText(text, term));
    };

    const setPreviewEmptyState = (isEmpty) => {
      previewEmpty.classList.toggle('is-visible', isEmpty);
      previewHeader.hidden = isEmpty;
      enchantSummary.hidden = isEmpty;
      iframeWrap.hidden = isEmpty;

      if (isEmpty) {
        effectButtons.forEach((item) => item.classList.remove('is-active'));
        previewTitle.textContent = '';
        previewUrl.textContent = '';
        officialFrame.src = 'about:blank';
        openOfficial.href = 'about:blank';
      }
    };

    const resetEnchantSetExpansion = (enchantSet, shouldExpand) => {
      const toggle = enchantSet.querySelector('.enchant-set-toggle');

      enchantSet.classList.toggle('is-collapsed', !shouldExpand);
      toggle?.setAttribute('aria-expanded', String(shouldExpand));
    };

    const updateEnchantSummary = (button) => {
      const itemEnchants = splitDataValues(button.dataset.enchants);
      let visibleCount = 0;

      enchantSets.forEach((enchantSet) => {
        const isVisible = itemEnchants.includes(enchantSet.dataset.enchantKey || '');

        enchantSet.hidden = !isVisible;

        if (isVisible) {
          resetEnchantSetExpansion(enchantSet, visibleCount === 0);
          visibleCount += 1;
        }
      });

      enchantEmpty.hidden = visibleCount > 0;
    };

    const truncateDescription = (description) => {
      const maxLength = 30;

      if (description.length <= maxLength) {
        return description;
      }

      return `${description.slice(0, maxLength)}...`;
    };

    const updateResultDescription = (button) => {
      const summary = button.querySelector('.result-summary');
      const description = button.dataset.description || '';

      if (!summary) {
        return;
      }

      summary.textContent = truncateDescription(description);
      summary.title = description;
    };

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
      const aliases = button.dataset.searchAliases || '';

      if (target === '説明') {
        return description;
      }

      if (target === 'エンチャント情報') {
        return enchantText;
      }

      if (target === 'すべて') {
        return `${name} ${aliases} ${description} ${enchantText}`;
      }

      return `${name} ${aliases}`;
    };

    const activateResult = (button, shouldSwitchPreviewTab = false) => {
      resultButtons.forEach((item) => item.classList.remove('is-active'));
      effectButtons.forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      setPreviewEmptyState(false);
      updateEnchantSummary(button);

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
      const keyword = keywordInput.value.trim();
      const target = searchTargetSelect.value;
      const selectedPositions = getSelectedFilters('position');
      const selectedEnchants = getSelectedFilters('enchant');
      let visibleCount = 0;

      resultItems.forEach((item) => {
        const button = item.querySelector('.result-button');
        const searchableText = getSearchableText(button, target);
        const positions = splitDataValues(button.dataset.positions);
        const enchants = splitDataValues(button.dataset.enchants);
        const matchesKeyword = matchesSearchQuery(searchableText, keyword);
        const matchesPositions = includesAny(positions, selectedPositions);
        const matchesEnchants = includesAny(enchants, selectedEnchants);
        const isVisible = hasSearched && matchesKeyword && matchesPositions && matchesEnchants;

        item.hidden = !isVisible;
        updateResultDescription(button);

        if (isVisible) {
          visibleCount += 1;
        }
      });

      resultCount.textContent = `${visibleCount}件`;
      emptyResult.textContent = hasSearched ? '条件に一致するアイテムはありません。' : '検索条件を入力して検索してください。';
      emptyResult.classList.toggle('is-visible', visibleCount === 0);

      const activeButton = document.querySelector('.result-button.is-active');
      const activeItem = activeButton?.closest('.result-item');

      if (visibleCount === 0) {
        resultButtons.forEach((button) => button.classList.remove('is-active'));
        setPreviewEmptyState(true);
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
      hasSearched = false;
      applyFilters();
    };

    const searchItems = () => {
      hasSearched = true;
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
    searchButton.addEventListener('click', searchItems);
    resetButton.addEventListener('click', resetFilters);
    keywordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchItems();
      }
    });

    searchTargetSelect.addEventListener('change', () => {
      if (hasSearched) {
        applyFilters();
      }
    });

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
        hasSearched = true;
        applyFilters();
      });
    });

    restoreSearchPaneWidth();
    resultButtons.forEach(updateResultDescription);
    applyFilters();
