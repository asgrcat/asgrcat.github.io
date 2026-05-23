    const mainGrid = document.getElementById('mainGrid');
    const paneResizer = document.getElementById('paneResizer');
    const searchTab = document.getElementById('searchTab');
    const previewTab = document.getElementById('previewTab');
    const keywordInput = document.getElementById('keywordInput');
    const searchTargetSelect = document.getElementById('searchTargetSelect');
    const searchButton = document.getElementById('searchButton');
    const resetButton = document.getElementById('resetButton');
    const resultCount = document.getElementById('resultCount');
    const resultList = document.getElementById('resultList');
    const emptyResult = document.getElementById('emptyResult');
    const searchControls = document.querySelector('.search-controls');
    const enchantFilterRow = document.getElementById('enchantFilterRow');
    const jobGroupFilterRow = document.getElementById('jobGroupFilterRow');
    const jobTierFilterRow = document.getElementById('jobTierFilterRow');
    const jobFilterRow = document.getElementById('jobFilterRow');
    const selectedFilterList = document.getElementById('selectedFilterList');
    const previewEmpty = document.getElementById('previewEmpty');
    const previewHeader = document.getElementById('previewHeader');
    const enchantSummary = document.getElementById('enchantSummary');
    const iframeWrap = document.getElementById('iframeWrap');
    const previewTitle = document.getElementById('previewTitle');
    const previewUrl = document.getElementById('previewUrl');
    const officialFrame = document.getElementById('officialFrame');
    const openOfficial = document.getElementById('openOfficial');
    const paneWidthStorageKey = 'jro-search.items.searchPaneWidth';
    const itemIndexUrl = '../data/search/item-index.json';
    const enchantCatalogUrl = '../data/enchantments/catalog.json';
    const jobMasterUrl = '../data/masters/jobs.json';
    const filterGroupLabels = {
      enchant: 'エンチャント種別',
      job: '職業',
      job_group: '職業系統',
      job_tier: '職業段階',
      position: '装備位置',
    };
    const accessoryPositionKeys = ['accessory_1', 'accessory_2'];
    let itemIndex = [];
    let jobMaster = { groups: {}, jobs: {}, tiers: {} };
    let activeItemId = null;
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

    const matchesPartialText = (text, query) => {
      const normalizedText = normalizeSearchText(text);
      const normalizedQuery = normalizeSearchText(query);

      return normalizedQuery === '' || normalizedText.includes(normalizedQuery);
    };

    const splitSearchTerms = (query) => query
      .normalize('NFKC')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const matchesSearchQuery = (text, query, fuzzy) => {
      const terms = splitSearchTerms(query);
      const matcher = fuzzy ? matchesFuzzyText : matchesPartialText;

      if (terms.length === 0) {
        return true;
      }

      return terms.every((term) => matcher(text, term));
    };

    const setPreviewEmptyState = (isEmpty) => {
      previewEmpty.classList.toggle('is-visible', isEmpty);
      previewHeader.hidden = isEmpty;
      enchantSummary.hidden = isEmpty;
      iframeWrap.hidden = isEmpty;

      if (isEmpty) {
        activeItemId = null;
        previewTitle.textContent = '';
        previewUrl.textContent = '';
        officialFrame.src = 'about:blank';
        openOfficial.href = 'about:blank';
        enchantSummary.replaceChildren();
      }
    };

    const createElement = (tagName, className, textContent = '') => {
      const element = document.createElement(tagName);

      if (className) {
        element.className = className;
      }

      if (textContent !== '') {
        element.textContent = textContent;
      }

      return element;
    };

    const getFilterChips = () => Array.from(document.querySelectorAll('.chip[data-filter-group]'));

    const orderedEntries = (values) => Object.entries(values || {})
      .sort(([, left], [, right]) => (left.order || 0) - (right.order || 0));

    const renderOptionChips = (container, group, entries) => {
      const fragment = document.createDocumentFragment();

      entries.forEach(([value, definition]) => {
        const chip = createElement('button', 'chip', definition.label || value);

        chip.type = 'button';
        chip.setAttribute('aria-pressed', 'false');
        chip.dataset.filterGroup = group;
        chip.dataset.filterValue = value;
        fragment.append(chip);
      });

      container.replaceChildren(fragment);
    };

    const enchantFilterKey = (set) => {
      const type = set.type || '';
      const key = set.key || '';

      if (type.endsWith('_enchant')) {
        return type.replace(/_enchant$/, '');
      }

      return type || key.replace(/-/g, '_');
    };

    const renderEnchantFilterOptions = (catalog) => {
      const options = new Map();

      (catalog?.sets || []).forEach((set, index) => {
        options.set(enchantFilterKey(set), {
          label: set.name || set.key || '',
          order: index + 1,
        });
      });

      renderOptionChips(enchantFilterRow, 'enchant', Array.from(options.entries()));
    };

    const renderJobFilterOptions = (master) => {
      jobMaster = {
        groups: master?.groups || {},
        jobs: master?.jobs || {},
        tiers: master?.tiers || {},
      };

      renderOptionChips(jobGroupFilterRow, 'job_group', orderedEntries(jobMaster.groups));
      renderOptionChips(jobTierFilterRow, 'job_tier', orderedEntries(jobMaster.tiers));
      renderOptionChips(jobFilterRow, 'job', orderedEntries(jobMaster.jobs));
    };

    const feeLabel = (fee) => {
      if (!Array.isArray(fee) || fee.length === 0) {
        return null;
      }

      return fee
        .map((item) => {
          const name = item.item_name || '';
          const amount = item.amount || item.quantity;

          return amount ? `${name} ${amount}個` : name;
        })
        .filter(Boolean)
        .join('、');
    };

    const slotLabel = (slot) => [
      slot.enchant_step_label,
      slot.slot_label,
      slot.required_refine,
      slot.required_transcendence ? `超越${slot.required_transcendence}` : null,
    ].filter(Boolean).join('\n');

    const selectionMethodLabel = (selectionMethod) => {
      const labels = {
        fixed: '固定エンチャント',
        random: 'ランダムエンチャント',
        select: '指定エンチャント',
        select_or_random: '指定/ランダムエンチャント',
        slot_and_effect_select: '指定エンチャント',
      };

      return labels[selectionMethod] || null;
    };

    const renderEnchantSummary = (item) => {
      const sets = item.enchantments?.sets || [];
      enchantSummary.replaceChildren();

      if (sets.length === 0) {
        enchantSummary.append(createElement('div', 'enchant-empty', 'このアイテムのエンチャント情報はありません。'));
        return;
      }

      sets.forEach((set, index) => {
        enchantSummary.append(renderEnchantSet(set, index === 0));
      });
    };

    const renderEnchantSet = (set, expanded) => {
      const wrapper = createElement('div', `enchant-set${expanded ? '' : ' is-collapsed'}`);
      const toggle = createElement('button', 'enchant-set-toggle');
      const meta = createElement('span', 'enchant-meta');
      const bodyId = `enchantSet-${set.key || Math.random().toString(36).slice(2)}`;
      const body = createElement('div', 'enchant-set-body');

      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-controls', bodyId);
      body.id = bodyId;

      meta.append(createElement('span', 'meta-chip', set.name || 'エンチャント'));

      const selectionMethod = selectionMethodLabel(set.selection_method);

      if (selectionMethod) {
        meta.append(createElement('span', 'meta-chip', selectionMethod));
      }

      if (set.npc_name) {
        meta.append(createElement('span', 'meta-chip', `NPC: ${set.npc_name}`));
      }

      const fee = feeLabel(set.fee);

      if (fee) {
        meta.append(createElement('span', 'meta-chip', `エンチャ素材: ${fee}`));
      }

      toggle.append(meta, createElement('span', 'enchant-toggle-icon', '›'));
      body.append(renderEnchantTable(set.slots || []));
      wrapper.append(toggle, body);

      return wrapper;
    };

    const renderEnchantTable = (slots) => {
      const wrap = createElement('div', 'enchant-table-wrap');
      const table = createElement('table', 'enchant-table');
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      const tbody = document.createElement('tbody');

      ['対象箇所', 'エンチャント効果'].forEach((label) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = label;
        headerRow.append(th);
      });

      thead.append(headerRow);

      slots.forEach((slot) => {
        const row = document.createElement('tr');
        const slotCell = createElement('td', 'slot-cell');
        const candidatesCell = document.createElement('td');
        const effects = createElement('div', 'effect-list');

        slotCell.textContent = slotLabel(slot);

        (slot.candidates || []).forEach((candidate) => {
          const button = createElement('button', 'effect-button', candidate.name || '');
          button.type = 'button';
          button.dataset.effectName = candidate.name || '';
          button.dataset.effectUrl = candidate.item_id ? `https://rotool.gungho.jp/item/${candidate.item_id}/` : '';
          effects.append(button);
        });

        candidatesCell.append(effects);
        row.append(slotCell, candidatesCell);
        tbody.append(row);
      });

      table.append(thead, tbody);
      wrap.append(table);

      return wrap;
    };

    const getSelectedFilters = (group) => getFilterChips()
      .filter((chip) => chip.dataset.filterGroup === group && chip.getAttribute('aria-pressed') === 'true')
      .map((chip) => chip.dataset.filterValue);

    const getSelectedFilterChips = () => getFilterChips()
      .filter((chip) => chip.getAttribute('aria-pressed') === 'true');

    const renderSelectedFilters = () => {
      const fragment = document.createDocumentFragment();

      getSelectedFilterChips().forEach((chip) => {
        const item = createElement('span', 'selected-filter-chip');
        const label = createElement('span', '', `${filterGroupLabels[chip.dataset.filterGroup] || ''}: ${chip.textContent}`);
        const remove = createElement('button', 'selected-filter-remove', '×');

        remove.type = 'button';
        remove.setAttribute('aria-label', `${chip.textContent} を解除`);
        remove.dataset.filterGroup = chip.dataset.filterGroup;
        remove.dataset.filterValue = chip.dataset.filterValue;

        item.append(label, remove);
        fragment.append(item);
      });

      selectedFilterList.replaceChildren(fragment);
    };

    const includesAny = (values, selectedValues) => (
      selectedValues.length === 0 || selectedValues.some((selectedValue) => values.includes(selectedValue))
    );

    const searchablePositions = (positions) => {
      const values = new Set(Object.keys(positions || {}));

      if (accessoryPositionKeys.some((key) => values.has(key))) {
        values.add('accessory');
      }

      return Array.from(values);
    };

    const displayPositionLabels = (item) => {
      const positions = item.classification?.positions || {};
      const labels = item.classification?.position_labels || [];

      if (! accessoryPositionKeys.every((key) => positions[key])) {
        return Array.from(new Set(labels));
      }

      return Array.from(new Set([
        ...labels.filter((label) => label !== 'アクセサリー(1)' && label !== 'アクセサリー(2)'),
        'アクセサリー',
      ]));
    };

    const activeKeys = (values) => Object.keys(values || {}).filter((key) => values[key]);

    const jobCodesForGroups = (groupCodes) => groupCodes.flatMap((groupCode) => (
      jobMaster.groups[groupCode]?.jobs || []
    ));

    const jobCodesForTiers = (tierCodes) => tierCodes.flatMap((tierCode) => (
      jobMaster.tiers[tierCode]?.jobs || []
    ));

    const selectedJobCodes = () => Array.from(new Set([
      ...getSelectedFilters('job'),
      ...jobCodesForGroups(getSelectedFilters('job_group')),
      ...jobCodesForTiers(getSelectedFilters('job_tier')),
    ]));

    const excludedJobCodes = (equipJobs) => new Set([
      ...activeKeys(equipJobs.exclude_jobs),
      ...jobCodesForGroups(activeKeys(equipJobs.exclude_groups)),
    ]);

    const allowedJobCodes = (equipJobs) => {
      const conditions = equipJobs || {};
      const excluded = excludedJobCodes(conditions);
      const included = conditions.all ? Object.keys(jobMaster.jobs || {}) : [
        ...activeKeys(conditions.include_jobs),
        ...jobCodesForGroups(activeKeys(conditions.include_groups)),
      ];

      return Array.from(new Set(included)).filter((jobCode) => !excluded.has(jobCode));
    };

    const matchesJobFilters = (item, selectedJobs) => {
      if (selectedJobs.length === 0) {
        return true;
      }

      const allowedJobs = allowedJobCodes(item.classification?.equip_jobs);

      return selectedJobs.some((jobCode) => allowedJobs.includes(jobCode));
    };

    const getSearchableText = (item, target) => {
      const name = item.name || '';
      const description = item.description || '';
      const aliases = (item.aliases || []).join(' ');
      const enchantText = [
        ...(item.enchantments?.candidate_names || []),
        ...(item.enchantments?.source_keys || []),
        ...(item.enchantments?.filter_keys || []),
      ].join(' ');

      if (target === '説明') {
        return description;
      }

      if (target === 'すべて') {
        return `${name} ${aliases} ${description} ${enchantText}`;
      }

      return `${name} ${aliases}`;
    };

    const activateResult = (item, shouldSwitchPreviewTab = false) => {
      activeItemId = item.item_id;
      resultList.querySelectorAll('.result-button').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.itemId === item.item_id);
      });
      setPreviewEmptyState(false);
      renderEnchantSummary(item);

      const name = item.name || '公式アイテムページ';
      const url = item.official_url || 'about:blank';

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
      const selectedJobs = selectedJobCodes();
      const hasConditions = keyword !== ''
        || selectedPositions.length > 0
        || selectedEnchants.length > 0
        || selectedJobs.length > 0;

      renderSelectedFilters();

      const results = hasSearched && hasConditions ? itemIndex.filter((item) => {
        const searchableText = getSearchableText(item, target);
        const positions = searchablePositions(item.classification?.positions);
        const enchants = item.enchantments?.filter_keys || [];
        const matchesKeyword = matchesSearchQuery(searchableText, keyword, target === 'アイテム名');
        const matchesPositions = includesAny(positions, selectedPositions);
        const matchesEnchants = includesAny(enchants, selectedEnchants);
        const matchesJobs = matchesJobFilters(item, selectedJobs);

        return matchesKeyword && matchesPositions && matchesEnchants && matchesJobs;
      }) : [];

      renderResults(results);
      resultCount.textContent = `${results.length}件`;
      emptyResult.textContent = hasSearched && hasConditions
        ? '条件に一致するアイテムはありません。'
        : '検索条件を入力または選択してください。';
      emptyResult.classList.toggle('is-visible', results.length === 0);

      if (results.length === 0) {
        setPreviewEmptyState(true);
        return;
      }

      const activeItem = results.find((item) => item.item_id === activeItemId);
      activateResult(activeItem || results[0]);
    };

    const renderResults = (items) => {
      const fragment = document.createDocumentFragment();

      items.forEach((item) => {
        fragment.append(renderResultItem(item));
      });

      resultList.replaceChildren(fragment);
    };

    const renderResultItem = (item) => {
      const listItem = createElement('li', 'result-item');
      const button = createElement('button', 'result-button');
      const main = createElement('span', 'result-main');
      const titleRow = createElement('span', 'result-title-row');
      const title = createElement('span', 'result-title', item.name || '');
      const summary = createElement('span', 'result-summary', item.description || '');
      const tagRow = createElement('span', 'tag-row');

      button.type = 'button';
      button.dataset.itemId = item.item_id;
      button.classList.toggle('is-active', item.item_id === activeItemId);
      summary.title = item.description || '';
      titleRow.append(title);

      displayPositionLabels(item).forEach((label) => {
        tagRow.append(createElement('span', 'tag', label));
      });

      main.append(titleRow, summary);

      if (tagRow.children.length > 0) {
        main.append(tagRow);
      }

      button.append(main);
      listItem.append(button);

      return listItem;
    };

    const resetFilters = () => {
      keywordInput.value = '';
      searchTargetSelect.value = 'アイテム名';
      getFilterChips().forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
      hasSearched = false;
      applyFilters();
    };

    const searchItems = () => {
      hasSearched = true;
      applyFilters();
    };

    const loadJson = async (url) => {
      const response = await fetch(url, { cache: 'no-cache' });

      if (!response.ok) {
        throw new Error(`Failed to load JSON: ${url} ${response.status}`);
      }

      return response.json();
    };

    const loadSearchData = async () => {
      try {
        const [itemPayload, enchantCatalog, jobs] = await Promise.all([
          loadJson(itemIndexUrl),
          loadJson(enchantCatalogUrl).catch(() => null),
          loadJson(jobMasterUrl).catch(() => null),
        ]);

        itemIndex = Array.isArray(itemPayload.items) ? itemPayload.items : [];
        renderEnchantFilterOptions(enchantCatalog);
        renderJobFilterOptions(jobs);
        emptyResult.textContent = '検索条件を入力して検索してください。';
        applyFilters();
      } catch (error) {
        itemIndex = [];
        resultCount.textContent = '0件';
        resultList.replaceChildren();
        emptyResult.textContent = '検索データを読み込めませんでした。';
        emptyResult.classList.add('is-visible');
        setPreviewEmptyState(true);
        console.error(error);
      }
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

    enchantSummary.addEventListener('click', (event) => {
      const toggle = event.target.closest('.enchant-set-toggle');
      const effectButton = event.target.closest('.effect-button');

      if (toggle) {
        const enchantSet = toggle.closest('.enchant-set');
        const expanded = toggle.getAttribute('aria-expanded') === 'true';

        toggle.setAttribute('aria-expanded', String(!expanded));
        enchantSet?.classList.toggle('is-collapsed', expanded);
        return;
      }

      if (effectButton) {
        enchantSummary.querySelectorAll('.effect-button').forEach((item) => item.classList.remove('is-active'));
        effectButton.classList.add('is-active');

        const name = effectButton.dataset.effectName || 'エンチャント効果';
        const url = effectButton.dataset.effectUrl || 'about:blank';

        previewTitle.textContent = `エンチャント効果: ${name}`;
        previewUrl.textContent = url;
        officialFrame.src = url || 'about:blank';
        openOfficial.href = url || 'about:blank';
      }
    });

    resultList.addEventListener('click', (event) => {
      const button = event.target.closest('.result-button');

      if (!button) {
        return;
      }

      const item = itemIndex.find((candidate) => candidate.item_id === button.dataset.itemId);

      if (item) {
        activateResult(item, true);
      }
    });

    searchControls.addEventListener('click', (event) => {
      const chip = event.target.closest('.chip[data-filter-group]');

      if (!chip || !searchControls.contains(chip)) {
        return;
      }

      const pressed = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!pressed));
      hasSearched = true;
      applyFilters();
    });

    selectedFilterList.addEventListener('click', (event) => {
      const remove = event.target.closest('.selected-filter-remove');

      if (!remove) {
        return;
      }

      const chip = getFilterChips().find((item) => (
        item.dataset.filterGroup === remove.dataset.filterGroup && item.dataset.filterValue === remove.dataset.filterValue
      ));

      chip?.setAttribute('aria-pressed', 'false');
      hasSearched = true;
      applyFilters();
    });

    restoreSearchPaneWidth();
    loadSearchData();
