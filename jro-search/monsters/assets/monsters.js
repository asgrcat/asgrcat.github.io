(() => {
  const normalizeSearchText = (value) => String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/\s+/g, ' ')
    .trim();

  const searchTargets = new Set(['monster', 'drop', 'skill', 'map', 'all']);

  const matchesMonster = (monster, query, target = 'monster', searchTerms = {}) => {
    const normalizedQuery = normalizeSearchText(query);

    if (normalizedQuery === '') {
      return true;
    }

    const matchesMonsterName = () => normalizeSearchText([
      monster.name,
      monster.monster_id,
      ...(monster.aliases || []),
      ...(monster.sub_names || []),
    ].join(' ')).includes(normalizedQuery);
    const matchesDrop = () => (monster.drop_items || [])
      .some((item) => normalizeSearchText(item.name).includes(normalizedQuery));
    const matchesTerm = (key) => (searchTerms[key] || [])
      .some((value) => normalizeSearchText(value).includes(normalizedQuery));

    if (target === 'drop') return matchesDrop();
    if (target === 'skill') return matchesTerm('skills');
    if (target === 'map') return matchesTerm('maps');
    if (target === 'all') return matchesMonsterName() || matchesDrop() || matchesTerm('skills') || matchesTerm('maps');

    return matchesMonsterName();
  };

  const monsterFilterValues = {
    size: new Set(['小', '中', '大']),
    race: new Set(['無形', '不死', '動物', '植物', '昆虫', '魚貝', '悪魔', '人間', '天使', '竜族']),
    type: new Set(['一般', 'BOSS', '特殊1', '特殊2', '特殊3', 'MVP']),
    attribute: new Set(['無', '水', '地', '火', '風', '毒', '聖', '闇', '念', '死']),
    attribute_level: new Set(['1', '2', '3', '4']),
    md: new Set(['1']),
    dungeon: new Set(['1']),
    trait: new Set([
      'damage_1_10',
      'damage_1_1000',
      'melee_1',
      'magic_1',
      'ranged_1',
      'damage_1_100',
      'ignore_forced_drop',
      'knockback_immune',
      'specific_1',
      'reflect_shield_immune',
      'damage_1_10000',
    ]),
    behavior: new Set([
      'active',
      'passive',
      'cast',
      'link',
      'loot',
      'follow',
    ]),
  };

  const behaviorBits = {
    active: 1,
    passive: 2,
    cast: 4,
    link: 8,
    loot: 16,
    follow: 32,
  };

  const traitBits = {
    damage_1_10: 1,
    damage_1_1000: 2,
    melee_1: 4,
    magic_1: 8,
    ranged_1: 16,
    damage_1_100: 32,
    ignore_forced_drop: 64,
    knockback_immune: 128,
    specific_1: 256,
    reflect_shield_immune: 512,
    damage_1_10000: 1024,
  };

  const parameterFilterValues = (parameters, key) => parameters.getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value, index, values) => monsterFilterValues[key].has(value) && values.indexOf(value) === index);

  const hasActiveMonsterFilters = (filters) => ['size', 'race', 'type', 'attribute', 'attribute_level', 'trait', 'md', 'dungeon', 'behavior']
    .some((key) => (filters[key] || []).length > 0);

  const matchesMonsterFilters = (monster, filters) => {
    if (!hasActiveMonsterFilters(filters)) {
      return true;
    }

    const values = monster.filters || {};
    const selectedAttributes = filters.attribute || [];
    const selectedAttributeLevels = filters.attribute_level || [];
    const selectedTypes = filters.type || [];
    const selectedTraits = filters.trait || [];
    const selectedMd = filters.md || [];
    const selectedDungeon = filters.dungeon || [];
    const selectedBehaviors = filters.behavior || [];
    const matchesGroup = (key) => (filters[key] || []).length === 0 || filters[key].includes(values[key]);
    const matchesAttribute = selectedAttributes.length === 0
      || selectedAttributes.some((attribute) => String(values.attribute || '').startsWith(attribute === '死' ? '不死' : attribute));
    const attributeLevel = String(values.attribute || '').match(/[1-4]$/)?.[0] || '';
    const matchesAttributeLevel = selectedAttributeLevels.length === 0
      || selectedAttributeLevels.includes(attributeLevel);
    const matchesType = selectedTypes.length === 0 || selectedTypes.some((type) => (
      type === 'MVP'
        ? values.is_mvp === true
        : values.type === type
    ));
    const behaviorMask = Number.isInteger(values.behavior) ? values.behavior : 0;
    const matchesBehavior = selectedBehaviors.length === 0 || selectedBehaviors.every((behavior) => (
      (behaviorMask & behaviorBits[behavior]) !== 0
    ));
    const traitMask = Number.isInteger(values.traits) ? values.traits : 0;
    const matchesTraits = selectedTraits.length === 0 || selectedTraits.some((trait) => (
      (traitMask & traitBits[trait]) !== 0
    ));
    const hasSelectedMapCategory = selectedMd.length > 0 || selectedDungeon.length > 0;
    const matchesMapCategory = !hasSelectedMapCategory
      || (selectedMd.includes('1') && values.is_md === true)
      || (selectedDungeon.includes('1') && values.is_dungeon === true);

    return matchesGroup('size')
      && matchesGroup('race')
      && matchesType
      && matchesAttribute
      && matchesAttributeLevel
      && matchesTraits
      && matchesMapCategory
      && matchesBehavior;
  };

  const monsterImageFrameVariant = (monster) => {
    const filters = monster?.filters || {};

    if (filters.is_mvp === true) return 'mvp';
    if (filters.type === 'BOSS') return 'boss';

    return 'normal';
  };

  const parseMonsterSearchParameters = (value) => {
    const parameters = value instanceof URLSearchParams ? value : new URLSearchParams(value);
    const requestedTarget = String(parameters.get('target') || '');
    const target = searchTargets.has(requestedTarget) ? requestedTarget : 'monster';

    return {
      id: String(parameters.get('id') || '').trim(),
      q: String(parameters.get('q') || '').trim(),
      target,
      updates: String(parameters.get('updates') || '').trim(),
      filters: {
        size: parameterFilterValues(parameters, 'size'),
        race: parameterFilterValues(parameters, 'race'),
        type: parameterFilterValues(parameters, 'type'),
        attribute: parameterFilterValues(parameters, 'attribute'),
        attribute_level: parameterFilterValues(parameters, 'attribute_level'),
        trait: parameterFilterValues(parameters, 'trait'),
        md: parameterFilterValues(parameters, 'md'),
        dungeon: parameterFilterValues(parameters, 'dungeon'),
        behavior: parameterFilterValues(parameters, 'behavior'),
      },
    };
  };

  globalThis.JroSearchMonsterSearchCore = {
    matchesMonster,
    matchesMonsterFilters,
    hasActiveMonsterFilters,
    monsterImageFrameVariant,
    normalizeSearchText,
    parseMonsterSearchParameters,
  };

  if (typeof document === 'undefined') {
    return;
  }

  const monsterSearchService = globalThis.JroSearchMonsterSearchService.defaultService;
  const indexUrl = '../data/search/monster-index.json';
  const updatesUrl = '../data/search/monster-updates.json';
  const versionHistoryUrl = './data/version-history.json';
  const themeStorageKey = 'jro-search.items.theme';
  const paneWidthStorageKey = 'jro-search.monsters.searchPaneWidth';
  const legacyFavoriteStorageKey = 'jro-search.monsters.favorites';
  const favoriteSetsStorageKey = 'jro-search.monsters.favoriteSets';
  const defaultFavoriteSetId = 'default';
  const historyStorageKey = 'jro-search.monsters.history';
  const presetStorageKey = 'jro-search.monsters.searchPresets';
  const historyLimit = 50;
  const resultRenderBatchSize = 160;
  const themeChoices = new Set(['dark', 'light', 'ocean', 'sky', 'forest', 'mint', 'violet', 'sakura', 'amber', 'sunlight']);
  const analyticsClickableSelector = [
    'a[href]',
    'button',
    'select',
    'summary',
    '[role="button"]',
    '[role="radio"]',
    '[role="separator"]',
  ].join(',');
  const searchInput = document.getElementById('monsterSearchInput');
  const workspace = document.querySelector('.monster-workspace');
  const searchTab = document.getElementById('monsterSearchTab');
  const filterTab = document.getElementById('monsterFilterTab');
  const detailTab = document.getElementById('monsterDetailTab');
  const mobileSearchButton = document.getElementById('monsterMobileSearchButton');
  const mobileFilterButton = document.getElementById('monsterMobileFilterButton');
  const mobileDetailButton = document.getElementById('monsterMobileDetailButton');
  const paneResizer = document.getElementById('monsterPaneResizer');
  const searchTarget = document.getElementById('monsterSearchTarget');
  const clearButton = document.getElementById('monsterClearButton');
  const filterButtons = Array.from(document.querySelectorAll('[data-monster-filter]'));
  const resultsScroll = document.getElementById('monsterResultsScroll');
  const resultList = document.getElementById('monsterResultList');
  const resultNotice = document.getElementById('monsterResultNotice');
  const resultEmpty = document.getElementById('monsterResultEmpty');
  const status = document.getElementById('monsterStatus');
  const welcome = document.getElementById('monsterWelcome');
  const detail = document.getElementById('monsterDetail');
  const detailName = document.getElementById('monsterDetailName');
  const detailAliases = document.getElementById('monsterDetailAliases');
  const officialLink = document.getElementById('monsterOfficialLink');
  const officialUrl = document.getElementById('monsterOfficialUrl');
  const detailLoading = document.getElementById('monsterDetailLoading');
  const statsSection = document.getElementById('monsterStatsSection');
  const primaryStatGrid = document.getElementById('monsterPrimaryStatGrid');
  const secondaryStatGrid = document.getElementById('monsterSecondaryStatGrid');
  const monsterImageFrame = document.getElementById('monsterImageFrame');
  const monsterImage = document.getElementById('monsterImage');
  const behaviorSection = document.getElementById('monsterBehaviorSection');
  const traitGroup = document.getElementById('monsterTraitGroup');
  const traitList = document.getElementById('monsterTraits');
  const actionPatternGroup = document.getElementById('monsterActionPatternGroup');
  const actionPatternList = document.getElementById('monsterActionPatterns');
  const skillGroup = document.getElementById('monsterSkillGroup');
  const skillList = document.getElementById('monsterSkills');
  const officialDropsSection = document.getElementById('monsterOfficialDropsSection');
  const normalDropsGroup = document.getElementById('monsterNormalDropsGroup');
  const normalDrops = document.getElementById('monsterNormalDrops');
  const mvpDropsGroup = document.getElementById('monsterMvpDropsGroup');
  const mvpDrops = document.getElementById('monsterMvpDrops');
  const mapDropsGroup = document.getElementById('monsterMapDropsGroup');
  const mapDrops = document.getElementById('monsterMapDrops');
  const mapsSection = document.getElementById('monsterMapsSection');
  const mapList = document.getElementById('monsterMapList');
  const helpButton = document.getElementById('monsterHelpButton');
  const helpPanel = document.getElementById('monsterHelpPanel');
  const helpClose = document.getElementById('monsterHelpClose');
  const updateStatus = document.getElementById('monsterUpdateStatus');
  const updateInfoButton = document.getElementById('monsterUpdateInfoButton');
  const updateInfoPanel = document.getElementById('monsterUpdateInfoPanel');
  const updateInfoClose = document.getElementById('monsterUpdateInfoClose');
  const updateInfoSummary = document.getElementById('monsterUpdateInfoSummary');
  const updateInfoList = document.getElementById('monsterUpdateInfoList');
  const updateInfoEmpty = document.getElementById('monsterUpdateInfoEmpty');
  const versionHistoryPanel = document.getElementById('monsterVersionHistoryPanel');
  const versionHistoryClose = document.getElementById('monsterVersionHistoryClose');
  const versionHistoryList = document.getElementById('monsterVersionHistoryList');
  const versionHistoryEmpty = document.getElementById('monsterVersionHistoryEmpty');
  const favoriteScopeButton = document.getElementById('monsterFavoriteScope');
  const historyScopeButton = document.getElementById('monsterHistoryScope');
  const favoriteToggle = document.getElementById('monsterFavoriteToggle');
  const favoriteSetButton = document.getElementById('monsterFavoriteSetButton');
  const favoriteSetButtonLabel = document.getElementById('monsterFavoriteSetButtonLabel');
  const favoriteSetMenu = document.getElementById('monsterFavoriteSetMenu');
  const favoriteSetManager = document.getElementById('monsterFavoriteSetManager');
  const favoriteSetClose = document.getElementById('monsterFavoriteSetClose');
  const favoriteSetSummary = document.getElementById('monsterFavoriteSetSummary');
  const favoriteSetName = document.getElementById('monsterFavoriteSetName');
  const favoriteSetCreate = document.getElementById('monsterFavoriteSetCreate');
  const favoriteSetList = document.getElementById('monsterFavoriteSetList');
  const presetButton = document.getElementById('monsterPresetButton');
  const presetManager = document.getElementById('monsterPresetManager');
  const presetClose = document.getElementById('monsterPresetClose');
  const presetName = document.getElementById('monsterPresetName');
  const presetSave = document.getElementById('monsterPresetSave');
  const presetCurrentSummary = document.getElementById('monsterPresetCurrentSummary');
  const presetList = document.getElementById('monsterPresetList');
  const presetEmpty = document.getElementById('monsterPresetEmpty');
  const themeToggle = document.getElementById('themeToggle');
  const colorModePopover = document.getElementById('colorModePopover');
  const themeButtons = Array.from(document.querySelectorAll('[data-theme-choice]'));
  const parameters = parseMonsterSearchParameters(window.location.search);
  let monsters = [];
  let selectedMonsterId = parameters.id;
  let customPaneWidth = null;
  let favoriteSets = [];
  let activeFavoriteSetId = defaultFavoriteSetId;
  let historyMonsterIds = [];
  let searchPresets = [];
  let personalScope = '';
  let searchTermsByMonsterId = {};
  let searchGeneration = 0;
  let currentResults = [];
  let renderedResultCount = 0;
  let currentResultQuery = '';
  let currentResultTarget = 'monster';
  let currentUpdateMonsterIds = [];
  let currentUpdateKey = '';
  let activeUpdateMonsterIds = null;
  let activeUpdateKey = '';
  let updateMonsterIdsByKey = new Map();
  let analyticsImpressionObserver = null;
  let searchAnalyticsTimer = null;
  const observedAnalyticsClickables = new WeakSet();
  const detailCache = new Map();
  const detailShardPromises = new Map();

  const setActiveMobilePane = (pane) => {
    const showsFilters = pane === 'filters';
    const showsDetail = pane === 'detail';
    workspace.classList.toggle('show-filters', showsFilters);
    workspace.classList.toggle('show-detail', showsDetail);
    searchTab.setAttribute('aria-selected', String(!showsFilters && !showsDetail));
    filterTab.setAttribute('aria-selected', String(showsFilters));
    detailTab.setAttribute('aria-selected', String(showsDetail));
    mobileSearchButton.setAttribute('aria-pressed', String(!showsFilters && !showsDetail));
    mobileFilterButton.setAttribute('aria-pressed', String(showsFilters));
    mobileDetailButton.setAttribute('aria-pressed', String(showsDetail));
  };

  const syncSearchTarget = () => {
    const settings = {
      monster: ['モンスター名で検索', 'モンスター名'],
      drop: ['ドロップ品名で検索', 'ドロップ品名'],
      skill: ['スキル名で検索', 'スキル名'],
      map: ['出現マップ名で検索', '出現マップ名'],
      all: ['キーワードですべて検索', '検索キーワード'],
    }[searchTarget.value] || ['モンスター名で検索', 'モンスター名'];
    searchInput.placeholder = settings[0];
    searchInput.setAttribute('aria-label', settings[1]);
  };

  const defaultPaneRatio = () => window.matchMedia('(max-width: 1180px)').matches ? 0.66 : 0.64;

  const paneWidthBounds = () => {
    const workspaceWidth = workspace.getBoundingClientRect().width;
    const compact = window.matchMedia('(max-width: 1180px)').matches;
    const preferredMinimum = compact ? 860 : 920;
    const availableWidth = workspaceWidth - 38 - 280;
    const minimum = Math.max(700, Math.min(preferredMinimum, availableWidth));

    return {
      minimum,
      maximum: Math.max(minimum, availableWidth),
      workspaceWidth,
    };
  };

  const applyPaneWidth = (requestedWidth, save = false) => {
    if (window.matchMedia('(max-width: 960px)').matches) {
      return;
    }

    const bounds = paneWidthBounds();
    const width = Math.min(bounds.maximum, Math.max(bounds.minimum, requestedWidth));
    customPaneWidth = width;
    workspace.style.setProperty('--monster-search-pane-width', `${width}px`);
    paneResizer.setAttribute('aria-valuenow', String(Math.round(width / bounds.workspaceWidth * 100)));

    if (save) {
      try {
        window.localStorage.setItem(paneWidthStorageKey, String(Math.round(width)));
      } catch {}
    }
  };

  const resetPaneWidth = () => {
    customPaneWidth = null;
    workspace.style.removeProperty('--monster-search-pane-width');
    paneResizer.setAttribute('aria-valuenow', String(Math.round(defaultPaneRatio() * 100)));
    try {
      window.localStorage.removeItem(paneWidthStorageKey);
    } catch {}
  };

  const restorePaneWidth = () => {
    try {
      const saved = Number.parseInt(window.localStorage.getItem(paneWidthStorageKey) || '', 10);
      if (Number.isInteger(saved)) applyPaneWidth(saved);
    } catch {}
  };

  const applyTheme = (theme, save = false) => {
    const nextTheme = themeChoices.has(theme) ? theme : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    themeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === nextTheme)));

    if (save) {
      try {
        window.localStorage.setItem(themeStorageKey, nextTheme);
      } catch {}
    }
  };

  const clearLegacyAccent = () => {
    delete document.documentElement.dataset.accent;
    try {
      window.localStorage.removeItem('jro-search.items.accent');
    } catch {}
  };

  const normalizeAnalyticsText = (value, maxLength = 100) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();

    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  };

  const sendAnalyticsEvent = (eventName, eventParameters = {}) => {
    if (typeof window.gtag !== 'function') return;

    window.gtag('event', eventName, {
      content_group: 'monsters',
      jro_search_section: 'monsters',
      ...eventParameters,
    });
  };

  const analyticsClickArea = (element) => {
    if (element.closest('.app-header')) return 'header';
    if (element.closest('.monster-filter-pane')) return 'filters';
    if (element.closest('.monster-query')) return 'search_controls';
    if (element.closest('.monster-results-scroll')) return 'results';
    if (element.closest('.monster-detail-pane')) return 'detail';
    if (element.closest('.monster-pane-resizer')) return 'pane_resizer';

    return 'workspace';
  };

  const analyticsClickTarget = (element) => {
    if (element.id) return element.id;
    if (element.dataset.monsterFilter) return `filter:${element.dataset.monsterFilter}`;
    if (element.dataset.favoriteSetAction) return `favorite_set:${element.dataset.favoriteSetAction}`;
    if (element.dataset.presetAction) return `preset:${element.dataset.presetAction}`;
    if (element.dataset.themeChoice) return 'theme';

    return [
      'monster-result-button',
      'monster-result-favorite-button',
      'drop-chip',
      'map-chip',
      'chip',
      'button',
    ].find((className) => element.classList.contains(className)) || element.tagName.toLowerCase();
  };

  const analyticsClickLabel = (element) => {
    if (element.classList.contains('monster-result-button')) {
      return normalizeAnalyticsText(element.querySelector('.monster-result-name')?.textContent);
    }

    if (element instanceof HTMLSelectElement) {
      return normalizeAnalyticsText(element.getAttribute('aria-label') || element.id);
    }

    return normalizeAnalyticsText(
      element.getAttribute('aria-label')
      || element.textContent
      || element.getAttribute('title')
      || element.id,
    );
  };

  const analyticsClickParameters = (element) => {
    const eventParameters = {
      click_area: analyticsClickArea(element),
      click_target: analyticsClickTarget(element),
      click_label: analyticsClickLabel(element),
    };

    if (element.dataset.monsterId) eventParameters.monster_id = element.dataset.monsterId;
    if (element.dataset.monsterFilter) eventParameters.filter_group = element.dataset.monsterFilter;
    if (element.dataset.filterValue) eventParameters.filter_value = element.dataset.filterValue;
    if (element.dataset.monsterFilter && element.hasAttribute('aria-pressed')) {
      eventParameters.filter_state = element.getAttribute('aria-pressed') === 'true' ? 'selected' : 'unselected';
    }
    if (element.dataset.favoriteSetAction) eventParameters.favorite_set_action = element.dataset.favoriteSetAction;
    if (element.dataset.presetAction) eventParameters.preset_action = element.dataset.presetAction;
    if (element.dataset.updateInfoAction) eventParameters.update_info_action = element.dataset.updateInfoAction;
    if (element.dataset.updateKey) eventParameters.update_key = element.dataset.updateKey;
    if (element.dataset.themeChoice) eventParameters.theme = element.dataset.themeChoice;
    if (element instanceof HTMLAnchorElement) eventParameters.link_url = element.href;

    return eventParameters;
  };

  const trackAnalyticsClick = (event) => {
    if (!(event.target instanceof Element)) return;
    const clickable = event.target.closest(analyticsClickableSelector);
    if (!clickable || clickable.disabled || clickable.getAttribute('aria-disabled') === 'true') return;
    sendAnalyticsEvent('ui_click', analyticsClickParameters(clickable));
  };

  const observeAnalyticsClickable = (element) => {
    if (!(element instanceof Element) || observedAnalyticsClickables.has(element)) return;
    if (!element.matches(analyticsClickableSelector) || element.disabled || element.getAttribute('aria-disabled') === 'true') return;
    observedAnalyticsClickables.add(element);

    if (analyticsImpressionObserver) {
      analyticsImpressionObserver.observe(element);
      return;
    }

    sendAnalyticsEvent('ui_clickable_impression', analyticsClickParameters(element));
  };

  const observeAnalyticsClickables = (root) => {
    if (root instanceof Element) observeAnalyticsClickable(root);
    root.querySelectorAll?.(analyticsClickableSelector).forEach(observeAnalyticsClickable);
  };

  const setupAnalyticsImpressionTracking = () => {
    if ('IntersectionObserver' in window) {
      analyticsImpressionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          analyticsImpressionObserver?.unobserve(entry.target);
          sendAnalyticsEvent('ui_clickable_impression', analyticsClickParameters(entry.target));
        });
      }, { threshold: 0.25 });
    }

    observeAnalyticsClickables(document);
    if (!('MutationObserver' in window)) return;

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => observeAnalyticsClickables(node));
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  };

  const setThemePopoverOpen = (open) => {
    themeToggle.setAttribute('aria-expanded', String(open));
    colorModePopover.hidden = !open;
  };

  const createElement = (tagName, className = '', text = '') => {
    const element = document.createElement(tagName);
    if (className !== '') element.className = className;
    if (text !== '') element.textContent = text;

    return element;
  };

  const normalizeStoredIds = (value, limit = Number.POSITIVE_INFINITY) => Array.from(new Set(
    (Array.isArray(value) ? value : []).map((id) => String(id || '').trim()).filter(Boolean),
  )).slice(0, limit);

  const readStoredArray = (key) => {
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const writeStoredArray = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  const syncPersonalScopeButtons = () => {
    favoriteScopeButton.setAttribute('aria-pressed', String(personalScope === 'favorite'));
    historyScopeButton.setAttribute('aria-pressed', String(personalScope === 'history'));
  };

  const favoriteSetById = (setId) => favoriteSets.find((set) => set.id === setId) || null;

  const activeFavoriteSet = () => favoriteSetById(activeFavoriteSetId) || favoriteSets[0] || null;

  const activeFavoriteMonsterIds = () => activeFavoriteSet()?.monsterIds || [];

  const loadFavoriteSets = () => {
    const legacyMonsterIds = normalizeStoredIds(readStoredArray(legacyFavoriteStorageKey));

    try {
      const parsed = JSON.parse(window.localStorage.getItem(favoriteSetsStorageKey) || 'null');
      const parsedSets = Array.isArray(parsed?.sets) ? parsed.sets : [];
      const usedIds = new Set();

      favoriteSets = parsedSets.map((set, index) => {
        const fallbackId = index === 0 ? defaultFavoriteSetId : `set-${Date.now()}-${index}`;
        const proposedId = String(set?.id || fallbackId).trim() || fallbackId;
        const id = usedIds.has(proposedId) ? `${proposedId}-${index}` : proposedId;
        usedIds.add(id);

        return {
          id,
          monsterIds: normalizeStoredIds(set?.monsterIds),
          name: id === defaultFavoriteSetId
            ? 'お気に入り'
            : String(set?.name || '').trim() || `お気に入り ${index + 1}`,
        };
      });

      if (!favoriteSetById(defaultFavoriteSetId)) {
        favoriteSets.unshift({
          id: defaultFavoriteSetId,
          monsterIds: favoriteSets.length === 0 ? legacyMonsterIds : [],
          name: 'お気に入り',
        });
      }

      favoriteSets = [
        favoriteSetById(defaultFavoriteSetId),
        ...favoriteSets.filter((set) => set.id !== defaultFavoriteSetId),
      ].filter(Boolean);

      activeFavoriteSetId = favoriteSetById(String(parsed?.activeSetId || ''))?.id
        || defaultFavoriteSetId;
    } catch {
      favoriteSets = [{
        id: defaultFavoriteSetId,
        monsterIds: legacyMonsterIds,
        name: 'お気に入り',
      }];
      activeFavoriteSetId = defaultFavoriteSetId;
    }

    saveFavoriteSets();
  };

  const saveFavoriteSets = () => {
    try {
      window.localStorage.setItem(favoriteSetsStorageKey, JSON.stringify({
        activeSetId: activeFavoriteSetId,
        sets: favoriteSets,
        version: 1,
      }));
      window.localStorage.setItem(legacyFavoriteStorageKey, JSON.stringify(activeFavoriteMonsterIds()));
    } catch {}
  };

  const setFavoriteSetMenuVisible = (visible) => {
    favoriteSetButton.setAttribute('aria-expanded', String(visible));
    favoriteSetMenu.hidden = !visible;
  };

  const renderFavoriteSetMenu = () => {
    const fragment = document.createDocumentFragment();
    favoriteSets.forEach((set) => {
      const option = createElement('button', 'favorite-set-selector-option');
      option.type = 'button';
      option.dataset.favoriteSetAction = 'select';
      option.dataset.favoriteSetId = set.id;
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', String(set.id === activeFavoriteSetId));
      option.setAttribute('aria-label', `追加先を${set.name}に変更`);
      option.append(
        createElement('i', 'fa-solid fa-check favorite-set-selector-check'),
        createElement('span', 'favorite-set-selector-name', set.name),
        createElement('span', 'favorite-set-selector-count', `${set.monsterIds.length}件`),
      );
      fragment.append(option);
    });
    const manage = createElement('button', 'favorite-set-selector-manage');
    manage.type = 'button';
    manage.dataset.favoriteSetAction = 'manage';
    manage.setAttribute('role', 'menuitem');
    manage.append(createElement('i', 'fa-solid fa-gear'), createElement('span', '', 'セットを管理'));
    fragment.append(manage);
    favoriteSetMenu.replaceChildren(fragment);
  };

  const syncFavoriteSetControls = () => {
    const set = activeFavoriteSet();
    const name = set?.name || 'お気に入り';
    favoriteSetButtonLabel.textContent = name;
    favoriteSetButton.setAttribute('aria-label', `お気に入りの追加先を変更（現在: ${name}）`);
    favoriteSetButton.title = `お気に入りの追加先を変更（現在: ${name}）`;
    favoriteScopeButton.setAttribute('aria-label', `お気に入り: ${name}`);
    favoriteSetSummary.textContent = set ? `選択中: ${name}（${set.monsterIds.length}件）` : '';
    renderFavoriteSetMenu();
  };

  const isFavoriteMonster = (monsterId) => activeFavoriteMonsterIds().includes(String(monsterId || ''));

  const isFavoriteButtonRemoveIntent = (button) => (
    button.dataset.favoriteHover === 'true'
    || button.dataset.favoriteFocus === 'true'
  );

  const favoriteIconClass = (favorite, removeIntent = false) => {
    if (!favorite) {
      return removeIntent ? 'fa-solid fa-heart-circle-plus' : 'fa-regular fa-heart';
    }

    return removeIntent ? 'fa-solid fa-heart-circle-minus' : 'fa-solid fa-heart-circle-check';
  };

  const syncResultFavoriteAction = (button, monsterId) => {
    const favorite = isFavoriteMonster(monsterId);
    const setName = activeFavoriteSet()?.name || 'お気に入り';
    button.setAttribute('aria-pressed', String(favorite));
    button.setAttribute('aria-label', favorite ? `${setName}から解除` : `${setName}に追加`);
    button.title = favorite ? `${setName}から解除` : `${setName}に追加`;
    button.querySelector('i').className = favoriteIconClass(favorite, isFavoriteButtonRemoveIntent(button));
  };

  const syncVisibleResultFavoriteActions = () => {
    resultList.querySelectorAll('.monster-result-favorite-button[data-monster-id]').forEach((button) => {
      const monster = monsters.find((candidate) => candidate.monster_id === button.dataset.monsterId);
      if (monster) syncResultFavoriteAction(button, monster.monster_id);
    });
  };

  const syncFavoriteToggle = () => {
    const favorite = selectedMonsterId !== '' && isFavoriteMonster(selectedMonsterId);
    const setName = activeFavoriteSet()?.name || 'お気に入り';
    favoriteToggle.setAttribute('aria-pressed', String(favorite));
    favoriteToggle.setAttribute('aria-label', favorite ? `${setName}から解除` : `${setName}に追加`);
    favoriteToggle.title = favorite ? `${setName}から解除` : `${setName}に追加`;
    favoriteToggle.querySelector('i').className = favoriteIconClass(
      favorite,
      isFavoriteButtonRemoveIntent(favoriteToggle),
    );
  };

  const resetFavoriteButtonInteractionState = (button) => {
    button.dataset.favoriteHover = 'false';
    button.dataset.favoriteFocus = 'false';
    button.blur?.();

    if (button === favoriteToggle) {
      syncFavoriteToggle();
      return;
    }

    const monster = monsters.find((candidate) => candidate.monster_id === button.dataset.monsterId);
    if (monster) syncResultFavoriteAction(button, monster.monster_id);
  };

  const recordHistory = (monsterId) => {
    const id = String(monsterId || '').trim();
    if (id === '') return;
    historyMonsterIds = [id, ...historyMonsterIds.filter((candidate) => candidate !== id)].slice(0, historyLimit);
    writeStoredArray(historyStorageKey, historyMonsterIds);
  };

  const toggleFavoriteMonster = (monsterId) => {
    const id = String(monsterId || '').trim();
    if (id === '') return;
    const set = activeFavoriteSet();
    if (!set) return;
    const wasFavorite = isFavoriteMonster(id);
    set.monsterIds = wasFavorite
      ? set.monsterIds.filter((candidate) => candidate !== id)
      : [id, ...set.monsterIds.filter((candidate) => candidate !== id)];
    refreshFavoriteSetState();
    const monster = monsters.find((candidate) => candidate.monster_id === id);
    sendAnalyticsEvent('favorite_change', {
      favorite_action: wasFavorite ? 'remove' : 'add',
      favorite_set_kind: set.id === defaultFavoriteSetId ? 'default' : 'custom',
      favorite_set_size: set.monsterIds.length,
      monster_id: id,
      monster_name: normalizeAnalyticsText(monster?.name),
    });
  };

  const toggleFavorite = () => toggleFavoriteMonster(selectedMonsterId);

  const refreshFavoriteSetState = () => {
    saveFavoriteSets();
    syncFavoriteToggle();
    syncVisibleResultFavoriteActions();
    renderFavoriteSetManager();
    if (personalScope === 'favorite') renderResults();
  };

  const selectFavoriteSet = (setId) => {
    if (!favoriteSetById(setId)) return;
    activeFavoriteSetId = setId;
    refreshFavoriteSetState();
  };

  const createFavoriteSet = () => {
    const name = favoriteSetName.value.trim();
    if (name === '') {
      favoriteSetName.focus();
      return;
    }
    const id = `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    favoriteSets.push({
      id,
      monsterIds: selectedMonsterId === '' ? [] : [selectedMonsterId],
      name,
    });
    activeFavoriteSetId = id;
    favoriteSetName.value = '';
    refreshFavoriteSetState();
  };

  const renameFavoriteSet = (setId, name) => {
    const set = favoriteSetById(setId);
    const normalizedName = name.trim();
    if (!set || set.id === defaultFavoriteSetId || normalizedName === '') {
      renderFavoriteSetManager();
      return;
    }
    set.name = normalizedName;
    refreshFavoriteSetState();
  };

  const deleteFavoriteSet = (setId) => {
    const set = favoriteSetById(setId);
    if (!set || set.id === defaultFavoriteSetId || favoriteSets.length <= 1) return;
    favoriteSets = favoriteSets.filter((candidate) => candidate.id !== setId);
    if (activeFavoriteSetId === setId) activeFavoriteSetId = defaultFavoriteSetId;
    refreshFavoriteSetState();
  };

  const renderFavoriteSetManager = () => {
    const fragment = document.createDocumentFragment();
    syncFavoriteSetControls();
    favoriteSets.forEach((set) => {
      const item = createElement('article', 'favorite-set-item');
      const select = createElement('button', 'favorite-set-select');
      const main = createElement('div', 'favorite-set-item-main');
      const actions = createElement('div', 'favorite-set-item-actions');
      const isDefault = set.id === defaultFavoriteSetId;
      item.dataset.favoriteSetId = set.id;
      item.classList.toggle('is-active', set.id === activeFavoriteSetId);
      select.type = 'button';
      select.dataset.favoriteSetAction = 'select';
      select.dataset.favoriteSetId = set.id;
      select.setAttribute('role', 'radio');
      select.setAttribute('aria-checked', String(set.id === activeFavoriteSetId));
      select.setAttribute('aria-label', `${set.name}を選択`);
      select.append(createElement('i', 'fa-solid fa-check'));
      const name = isDefault
        ? createElement('span', 'favorite-set-item-name favorite-set-item-name-fixed', set.name)
        : createElement('input', 'favorite-set-item-name');
      if (!isDefault) {
        name.type = 'text';
        name.value = set.name;
        name.maxLength = 40;
        name.dataset.favoriteSetAction = 'rename';
        name.dataset.favoriteSetId = set.id;
        name.setAttribute('aria-label', `${set.name}のセット名`);
      }
      main.append(name, createElement('span', 'favorite-set-count', `${set.monsterIds.length}件`));
      if (!isDefault) {
        const remove = createElement('button', 'favorite-set-delete', '削除');
        remove.type = 'button';
        remove.dataset.favoriteSetAction = 'delete';
        remove.dataset.favoriteSetId = set.id;
        actions.append(remove);
      }
      item.append(select, main, actions);
      fragment.append(item);
    });
    favoriteSetList.setAttribute('role', 'radiogroup');
    favoriteSetList.setAttribute('aria-label', 'お気に入りセット');
    favoriteSetList.replaceChildren(fragment);
  };

  const currentPresetParams = () => ({
    q: searchInput.value.trim(),
    target: searchTarget.value,
    filters: currentMonsterFilters(),
  });

  const normalizePresetParams = (value) => {
    const source = value && typeof value === 'object' ? value : {};
    const parsed = parseMonsterSearchParameters(new URLSearchParams({
      q: String(source.q || ''),
      target: searchTargets.has(source.target) ? source.target : 'monster',
      ...Object.fromEntries(Object.entries(source.filters || {}).map(([key, values]) => [
        key,
        Array.isArray(values) ? values.join(',') : '',
      ])),
    }));

    return { q: parsed.q, target: parsed.target, filters: parsed.filters };
  };

  const filterLabels = {
    size: 'サイズ',
    race: '種族',
    type: '種類',
    attribute: '属性',
    attribute_level: '属性Lv',
    trait: '特性',
    md: '出現マップ',
    dungeon: '出現マップ',
    behavior: '行動',
  };

  const behaviorLabels = {
    active: 'アクティブ',
    passive: 'ノンアクティブ',
    cast: '詠唱反応',
    link: 'リンク',
    loot: 'ルート',
    follow: '召喚者追従',
  };

  const traitLabels = {
    damage_1_10: '受けるダメージを1/10に減少する',
    damage_1_1000: '受けるダメージを1/1,000に減少する',
    melee_1: '近接物理攻撃で受けるダメージを「1」にする',
    magic_1: '魔法物理攻撃で受けるダメージを「1」にする',
    ranged_1: '遠距離物理攻撃で受けるダメージを「1」にする',
    damage_1_100: '受けるダメージを1/100に減少する',
    ignore_forced_drop: 'アイテムオプションによるアイテム強制ドロップを無視',
    knockback_immune: 'ノックバック効果を受けない',
    specific_1: '特定の攻撃で受けるダメージを1にする',
    reflect_shield_immune: 'リフレクトシールド無効',
    damage_1_10000: '受けるダメージを1/10,000に減少する',
  };

  const presetSummary = (params) => {
    const normalized = normalizePresetParams(params);
    const parts = [];
    if (normalized.q !== '') parts.push(`検索: ${normalized.q}`);
    const targetLabels = {
      drop: 'ドロップ品',
      skill: 'スキル',
      map: '出現マップ',
      all: 'すべて',
    };
    if (targetLabels[normalized.target]) parts.push(`対象: ${targetLabels[normalized.target]}`);
    Object.entries(normalized.filters).forEach(([key, values]) => {
      if (values.length === 0) return;
      const labels = values.map((value) => key === 'md'
        ? 'MD'
        : key === 'dungeon'
          ? 'ダンジョン'
          : behaviorLabels[value] || traitLabels[value] || value);
      parts.push(`${filterLabels[key]}: ${labels.join(', ')}`);
    });

    return parts.length > 0 ? parts.join(' / ') : '条件なし';
  };

  const savePresets = () => writeStoredArray(presetStorageKey, searchPresets);

  const renderPresets = () => {
    presetCurrentSummary.textContent = `現在の条件: ${presetSummary(currentPresetParams())}`;
    const fragment = document.createDocumentFragment();
    searchPresets.forEach((preset) => {
      const item = createElement('div', 'preset-item');
      const main = createElement('div', 'preset-item-main');
      const name = createElement('input', 'preset-item-name-input');
      const summary = createElement('div', 'preset-item-summary', presetSummary(preset.params));
      const actions = createElement('div', 'preset-item-actions');
      name.type = 'text';
      name.value = preset.name;
      name.maxLength = 40;
      name.dataset.presetId = preset.id;
      name.setAttribute('aria-label', `${preset.name} の条件名`);
      [['apply', '再検索'], ['overwrite', '上書き'], ['delete', '削除']].forEach(([action, label]) => {
        const button = createElement('button', 'preset-action-button', label);
        button.type = 'button';
        button.dataset.presetAction = action;
        button.dataset.presetId = preset.id;
        actions.append(button);
      });
      main.append(name, summary);
      item.append(main, actions);
      fragment.append(item);
    });
    presetList.replaceChildren(fragment);
    presetEmpty.hidden = searchPresets.length > 0;
  };

  const loadPersonalData = () => {
    loadFavoriteSets();
    historyMonsterIds = normalizeStoredIds(readStoredArray(historyStorageKey), historyLimit);
    searchPresets = readStoredArray(presetStorageKey).map((preset, index) => ({
      id: String(preset?.id || `preset-${Date.now()}-${index}`),
      name: String(preset?.name || '').trim(),
      params: normalizePresetParams(preset?.params),
    })).filter((preset) => preset.name !== '');
    syncPersonalScopeButtons();
    syncFavoriteSetControls();
    syncFavoriteToggle();
    renderFavoriteSetManager();
  };

  const syncPanelParameter = (panel) => {
    const next = new URL(window.location.href);
    if (panel === 'version-history') next.searchParams.set('panel', panel);
    else if (next.searchParams.get('panel') === 'version-history') next.searchParams.delete('panel');
    window.history.replaceState(null, '', next);
  };

  const utilityPanels = [helpPanel, versionHistoryPanel, updateInfoPanel, presetManager, favoriteSetManager];

  const closeUtilityPanels = () => {
    utilityPanels.forEach((panel) => { panel.hidden = true; });
    helpButton.setAttribute('aria-expanded', 'false');
    updateStatus.setAttribute('aria-expanded', 'false');
    updateInfoButton.setAttribute('aria-expanded', 'false');
    presetButton.setAttribute('aria-pressed', 'false');
    setFavoriteSetMenuVisible(false);
    syncPanelParameter('');
    welcome.hidden = selectedMonsterId !== '';
    detail.hidden = selectedMonsterId === '';
  };

  const toggleUtilityPanel = (panel, trigger, panelParameter = '') => {
    const shouldOpen = panel.hidden;
    closeUtilityPanels();
    if (!shouldOpen) return;
    welcome.hidden = true;
    detail.hidden = true;
    panel.hidden = false;
    trigger.setAttribute([updateStatus, helpButton, updateInfoButton].includes(trigger) ? 'aria-expanded' : 'aria-pressed', 'true');
    syncPanelParameter(panelParameter);
    if (panel === presetManager) renderPresets();
    if (window.matchMedia('(max-width: 960px)').matches) {
      setActiveMobilePane('detail');
      panel.scrollIntoView({ block: 'start' });
    }
  };

  const generatedAtUpdateKey = (generatedAt) => {
    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
    });
    const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

    return `${parts.year}${parts.month}${parts.day}`;
  };

  const monsterUpdateGroupEntries = (updates) => {
    const entries = [];
    (Array.isArray(updates?.groups) ? updates.groups : []).forEach((group) => {
      const key = String(group?.key || '').trim();
      const monsterIds = Array.isArray(group?.added_monster_ids)
        ? group.added_monster_ids.map(String).filter(Boolean)
        : [];
      if (key !== '' && monsterIds.length > 0) entries.push([key, monsterIds]);
    });
    const currentIds = Array.isArray(updates?.added_monster_ids)
      ? updates.added_monster_ids.map(String).filter(Boolean)
      : [];
    const currentKey = String(updates?.update_key || '').trim() || generatedAtUpdateKey(updates?.generated_at);
    if (currentKey !== '' && currentIds.length > 0 && !entries.some(([key]) => key === currentKey)) {
      entries.push([currentKey, currentIds]);
    }

    return entries;
  };

  const renderUpdateInfo = (updates) => {
    const addedMonsterIds = Array.isArray(updates?.added_monster_ids)
      ? updates.added_monster_ids.map(String).filter(Boolean)
      : [];
    currentUpdateMonsterIds = addedMonsterIds;
    currentUpdateKey = String(updates?.update_key || '').trim() || generatedAtUpdateKey(updates?.generated_at);
    updateMonsterIdsByKey = new Map(monsterUpdateGroupEntries(updates));

    if (addedMonsterIds.length === 0) {
      updateInfoButton.hidden = true;
      updateInfoPanel.hidden = true;
      updateInfoButton.setAttribute('aria-expanded', 'false');
      updateInfoSummary.textContent = '';
      updateInfoList.replaceChildren();
      updateInfoEmpty.hidden = false;
      return;
    }

    const monsterById = new Map(monsters.map((monster) => [String(monster.monster_id), monster]));
    const fragment = document.createDocumentFragment();
    addedMonsterIds.forEach((monsterId) => {
      const monster = monsterById.get(monsterId);
      const item = createElement('li', 'update-info-item');
      const button = createElement('button', 'update-info-link', monster?.name || `monster:${monsterId}`);
      button.type = 'button';
      button.dataset.monsterId = monsterId;
      button.dataset.updateInfoAction = 'monster';
      button.dataset.updateKey = currentUpdateKey;
      button.title = button.textContent;
      item.append(button);
      fragment.append(item);
    });
    updateInfoSummary.textContent = `今週追加されたモンスター: ${addedMonsterIds.length}件`;
    updateInfoSummary.dataset.updateInfoAction = 'weekly';
    updateInfoSummary.dataset.updateKey = currentUpdateKey;
    updateInfoList.replaceChildren(fragment);
    updateInfoEmpty.hidden = true;
    updateInfoButton.hidden = false;
  };

  const openFavoriteSetManager = () => {
    closeUtilityPanels();
    welcome.hidden = true;
    detail.hidden = true;
    favoriteSetManager.hidden = false;
    renderFavoriteSetManager();
    if (window.matchMedia('(max-width: 960px)').matches) {
      setActiveMobilePane('detail');
      favoriteSetManager.scrollIntoView({ block: 'start' });
    }
  };

  const renderVersionHistory = (payload) => {
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    const fragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const changes = Array.isArray(entry?.changes) ? entry.changes.map(String).filter(Boolean) : [];
      const version = String(entry?.version || '').trim();
      if (version === '' || changes.length === 0) return;
      const article = createElement('article', 'version-history-entry');
      article.classList.toggle('is-current', version === updateStatus.textContent.trim());
      const header = createElement('div', 'version-history-entry-header');
      const title = createElement('h3', 'version-history-version', version);
      const date = createElement('time', 'version-history-date', String(entry?.date || ''));
      date.dateTime = String(entry?.date || '');
      const list = createElement('ul', 'version-history-changes');
      changes.forEach((change) => list.append(createElement('li', '', change)));
      header.append(title, date);
      article.append(header, list);
      fragment.append(article);
    });
    versionHistoryList.replaceChildren(fragment);
    versionHistoryEmpty.hidden = versionHistoryList.childElementCount > 0;
  };

  const saveCurrentPreset = () => {
    const name = presetName.value.trim() || `検索条件 ${searchPresets.length + 1}`;
    searchPresets = [{
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      params: currentPresetParams(),
    }, ...searchPresets];
    presetName.value = '';
    savePresets();
    renderPresets();
  };

  const applyPreset = async (preset) => {
    const params = normalizePresetParams(preset.params);
    searchInput.value = params.q;
    searchTarget.value = params.target;
    syncSearchTarget();
    restoreMonsterFilters(params.filters);
    personalScope = '';
    activeUpdateMonsterIds = null;
    activeUpdateKey = '';
    syncPersonalScopeButtons();
    selectedMonsterId = '';
    closeUtilityPanels();
    syncFavoriteToggle();
    if (window.matchMedia('(max-width: 960px)').matches) setActiveMobilePane('search');
    const resultCount = await renderResults();
    if (Number.isInteger(resultCount)) {
      trackSearchAnalytics(resultCount, 'preset_apply');
    }
  };

  const updatePreset = (presetId, update) => {
    searchPresets = searchPresets.map((preset) => preset.id === presetId ? update(preset) : preset);
    savePresets();
    renderPresets();
  };

  const appendHighlightedText = (element, value, query) => {
    const text = String(value || '');
    const normalizedQuery = normalizeSearchText(query);
    const normalizedText = normalizeSearchText(text);
    const index = normalizedQuery === '' ? -1 : normalizedText.indexOf(normalizedQuery);

    if (index < 0 || normalizedText.length !== text.length) {
      element.textContent = text;
      return;
    }

    element.append(document.createTextNode(text.slice(0, index)));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(index, index + normalizedQuery.length);
    element.append(mark, document.createTextNode(text.slice(index + normalizedQuery.length)));
  };

  const currentMonsterFilters = () => ({
    size: filterButtons.filter((button) => button.dataset.monsterFilter === 'size' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
    race: filterButtons.filter((button) => button.dataset.monsterFilter === 'race' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
    type: filterButtons.filter((button) => button.dataset.monsterFilter === 'type' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
    attribute: filterButtons.filter((button) => button.dataset.monsterFilter === 'attribute' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
    attribute_level: filterButtons.filter((button) => button.dataset.monsterFilter === 'attribute_level' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
    trait: filterButtons.filter((button) => button.dataset.monsterFilter === 'trait' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
    md: filterButtons.filter((button) => button.dataset.monsterFilter === 'md' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
    dungeon: filterButtons.filter((button) => button.dataset.monsterFilter === 'dungeon' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
    behavior: filterButtons.filter((button) => button.dataset.monsterFilter === 'behavior' && button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.filterValue),
  });

  const analyticsFilterState = () => {
    const filters = currentMonsterFilters();

    return {
      active_filter_count: Object.values(filters).reduce((total, values) => total + values.length, 0),
      personal_scope: personalScope || 'all',
      size_filters: filters.size.join('|'),
      race_filters: filters.race.join('|'),
      type_filters: filters.type.join('|'),
      attribute_filters: filters.attribute.join('|'),
      attribute_level_filters: filters.attribute_level.join('|'),
      behavior_filters: filters.behavior.join('|'),
      trait_filters: filters.trait.join('|'),
      appearance_filters: [
        ...(filters.md.length > 0 ? ['md'] : []),
        ...(filters.dungeon.length > 0 ? ['dungeon'] : []),
      ].join('|'),
    };
  };

  const trackSearchAnalytics = (resultCount, searchTrigger) => {
    const query = searchInput.value.trim();

    sendAnalyticsEvent('search', {
      has_search_term: String(query !== ''),
      search_term_length: query.length,
      search_target: searchTarget.value,
      search_trigger: searchTrigger,
      result_count: resultCount,
      visible_result_count: Math.min(resultCount, resultRenderBatchSize),
      ...analyticsFilterState(),
    });
  };

  const scheduleSearchAnalytics = (resultCount, searchTrigger) => {
    window.clearTimeout(searchAnalyticsTimer);
    searchAnalyticsTimer = window.setTimeout(() => {
      searchAnalyticsTimer = null;
      trackSearchAnalytics(resultCount, searchTrigger);
    }, 600);
  };

  const cancelScheduledSearchAnalytics = () => {
    window.clearTimeout(searchAnalyticsTimer);
    searchAnalyticsTimer = null;
  };

  const trackFilterChangeAnalytics = (eventParameters, resultCount) => {
    sendAnalyticsEvent('filter_change', {
      ...eventParameters,
      result_count: resultCount,
      ...analyticsFilterState(),
    });
  };

  const trackSearchResultClickAnalytics = (monster) => {
    const resultIndex = currentResults.findIndex((candidate) => candidate.monster_id === monster.monster_id);
    const eventParameters = {
      monster_id: monster.monster_id,
      monster_name: normalizeAnalyticsText(monster.name),
      monster_url: monster.official_url || '',
      result_position: resultIndex >= 0 ? resultIndex + 1 : null,
      result_count: currentResults.length,
      has_search_term: String(searchInput.value.trim() !== ''),
      search_target: searchTarget.value,
      ...analyticsFilterState(),
    };

    sendAnalyticsEvent('search_result_click', eventParameters);
    sendAnalyticsEvent('monster_click', {
      monster_click_source: 'search_results',
      ...eventParameters,
    });
  };

  const trackUpdateInfoMonsterClickAnalytics = (monster) => {
    sendAnalyticsEvent('monster_click', {
      monster_click_source: 'update_info',
      monster_id: monster.monster_id,
      monster_name: normalizeAnalyticsText(monster.name),
      monster_url: monster.official_url || '',
      update_key: currentUpdateKey,
      update_monster_count: currentUpdateMonsterIds.length,
    });
  };

  const trackUpdateInfoWeeklyClickAnalytics = () => {
    sendAnalyticsEvent('monster_updates_click', {
      monster_updates_click_source: 'update_info',
      update_key: currentUpdateKey,
      update_monster_count: currentUpdateMonsterIds.length,
      update_scope: 'weekly',
    });
  };

  const syncFilterGroupState = () => {
    document.querySelectorAll('.monster-filter-pane .filter-group').forEach((group) => {
      const active = Boolean(group.querySelector('[data-monster-filter][aria-pressed="true"]'));
      group.dataset.active = String(active);
    });
  };

  const restoreMonsterFilters = (filters) => {
    filterButtons.forEach((button) => {
      const values = filters[button.dataset.monsterFilter] || [];
      button.setAttribute('aria-pressed', String(values.includes(button.dataset.filterValue)));
    });
    syncFilterGroupState();
  };

  const writeUrl = () => {
    const next = new URL(window.location.href);
    const query = searchInput.value.trim();
    const target = searchTarget.value;
    const filters = currentMonsterFilters();

    if (query === '') next.searchParams.delete('q');
    else next.searchParams.set('q', query);
    if (target === 'monster') next.searchParams.delete('target');
    else next.searchParams.set('target', target);
    Object.entries({ size: filters.size, race: filters.race, type: filters.type, attribute: filters.attribute, attribute_level: filters.attribute_level, trait: filters.trait, md: filters.md, dungeon: filters.dungeon, behavior: filters.behavior }).forEach(([key, values]) => {
      next.searchParams.delete(key);
      if (values.length > 0) next.searchParams.set(key, values.join(','));
    });
    if (selectedMonsterId === '') next.searchParams.delete('id');
    else next.searchParams.set('id', selectedMonsterId);
    if (activeUpdateKey === '') next.searchParams.delete('updates');
    else next.searchParams.set('updates', activeUpdateKey);

    window.history.replaceState(null, '', next);
  };

  const primaryStatLabels = [
    ['level', 'Lv'], ['attribute', '属性'],
    ['hp', 'HP'], ['race', '種族'],
    ['base_exp', 'BaseExp'], ['size', 'サイズ'],
    ['job_exp', 'JobExp'], ['type', '種類'],
  ];

  const secondaryStatLabels = [
    ['atk', 'Atk'], ['matk', 'Matk'], ['def', 'Def'], ['mdef', 'Mdef'],
    ['res', 'Res'], ['mres', 'Mres'], ['str', 'Str'], ['agi', 'Agi'],
    ['vit', 'Vit'], ['int', 'Int'], ['dex', 'Dex'], ['luk', 'Luk'],
    ['flee_95', '95%FLEE'], ['hit_100', '100%HIT'], ['range', '射程'],
    ['move_speed', '移動速度'], ['sensing_range', '感知範囲'], ['tracking_range', '追跡範囲'],
  ];

  const dropRateLabels = {
    rate0: '0.3%以下',
    rate1: '約0.5%',
    rate2: '約1%',
    rate3: '約5%',
    rate4: '約10%',
    rate5: '約15%',
    rate6: '約20%',
    rate7: '約25%',
    rate8: '約50%',
    rate9: '約75%',
    rate10: '100%',
  };

  const formatStatValue = (value) => typeof value === 'number' ? value.toLocaleString('ja-JP') : String(value);

  const renderStatEntries = (stats, labels) => labels.flatMap(([key, label]) => {
    const value = stats[key];
    if (value === null || value === undefined || value === '') return [];
    const wrapper = createElement('div', 'monster-stat-entry');
    wrapper.dataset.statKey = key;
    wrapper.append(createElement('dt', '', label), createElement('dd', '', formatStatValue(value)));

    return [wrapper];
  });

  const renderMonsterImage = (monster) => {
    const frameVariant = monsterImageFrameVariant(monster);
    monsterImageFrame.classList.remove('is-error', 'is-boss', 'is-mvp');
    if (frameVariant !== 'normal') monsterImageFrame.classList.add(`is-${frameVariant}`);
    monsterImage.alt = `${monster.name}の公式モンスター画像`;
    monsterImage.src = `https://rotool.gungho.jp/images/monster/${encodeURIComponent(monster.monster_id)}.png`;
  };

  const renderTagItems = (list, values) => {
    const items = (Array.isArray(values) ? values : []).map((value) => createElement('li', '', String(value)));
    list.replaceChildren(...items);
    return items.length;
  };

  const renderActionPatternItems = (list, values) => {
    const patterns = Array.from(new Set((Array.isArray(values) ? values : [])
      .flatMap((value) => String(value).split('・'))
      .map((value) => value.trim())
      .filter(Boolean)));

    return renderTagItems(list, patterns);
  };

  const renderOfficialDrop = (item) => {
    const listItem = document.createElement('li');
    const link = createElement('a', 'monster-official-drop-link');
    const name = createElement('span', '', String(item?.name || ''));
    const rateClass = String(item?.rate_class || '');
    const rateLabel = dropRateLabels[rateClass] || 'ドロップ率不明';
    const rate = createElement('span', 'monster-drop-rate', rateLabel);
    link.href = `../items/?id=${encodeURIComponent(String(item?.item_id || ''))}`;
    if (Object.hasOwn(dropRateLabels, rateClass)) link.classList.add(rateClass);
    link.dataset.tooltip = rateLabel;
    link.setAttribute('aria-label', `${name.textContent} ドロップ率 ${rateLabel}`);
    link.append(name, rate);
    listItem.append(link);

    return listItem;
  };

  const renderOfficialDropGroup = (group, list, items) => {
    const values = Array.isArray(items) ? items : [];
    group.hidden = values.length === 0;
    list.replaceChildren(...values.map(renderOfficialDrop));
    return values.length;
  };

  const resetDetailData = () => {
    detailLoading.hidden = false;
    detailLoading.textContent = 'モンスター詳細を読み込み中';
    [statsSection, behaviorSection, officialDropsSection, mapsSection].forEach((section) => { section.hidden = true; });
    primaryStatGrid.replaceChildren();
    secondaryStatGrid.replaceChildren();
    [traitList, actionPatternList, skillList, normalDrops, mvpDrops, mapDrops, mapList].forEach((list) => list.replaceChildren());
  };

  const renderDetailData = (payload) => {
    detailLoading.hidden = true;
    const stats = payload?.stats && typeof payload.stats === 'object' ? payload.stats : {};
    const primaryStatEntries = renderStatEntries(stats, primaryStatLabels);
    const secondaryStatEntries = renderStatEntries(stats, secondaryStatLabels);
    primaryStatGrid.replaceChildren(...primaryStatEntries);
    secondaryStatGrid.replaceChildren(...secondaryStatEntries);
    statsSection.hidden = primaryStatEntries.length + secondaryStatEntries.length === 0;

    const traitCount = renderTagItems(traitList, payload?.traits);
    const actionCount = renderActionPatternItems(actionPatternList, payload?.action_patterns);
    const skillCount = renderTagItems(skillList, payload?.skills);
    traitGroup.hidden = traitCount === 0;
    actionPatternGroup.hidden = actionCount === 0;
    skillGroup.hidden = skillCount === 0;
    behaviorSection.hidden = traitCount + actionCount + skillCount === 0;

    const dropCount = renderOfficialDropGroup(normalDropsGroup, normalDrops, payload?.drop_items)
      + renderOfficialDropGroup(mvpDropsGroup, mvpDrops, payload?.mvp_items)
      + renderOfficialDropGroup(mapDropsGroup, mapDrops, payload?.map_specific_drop_items);
    officialDropsSection.hidden = dropCount === 0;

    const maps = Array.isArray(payload?.maps) ? payload.maps : [];
    mapList.replaceChildren(...maps.map((map) => createElement('li', '', String(map?.name || ''))));
    mapsSection.hidden = maps.length === 0;
  };

  const loadDetailData = async (monster) => {
    const monsterId = String(monster?.monster_id || '');
    if (detailCache.has(monsterId)) return detailCache.get(monsterId);
    const shard = Number(monster?.detail_shard);
    if (!Number.isInteger(shard) || shard < 0 || shard > 63) return null;
    if (!detailShardPromises.has(shard)) {
      const path = `../data/search/monster-details/${String(shard).padStart(2, '0')}.json`;
      detailShardPromises.set(shard, fetch(path).then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        Object.entries(payload?.monsters || {}).forEach(([id, value]) => detailCache.set(id, value));
      }).catch((error) => {
        detailShardPromises.delete(shard);
        throw error;
      }));
    }
    await detailShardPromises.get(shard);

    return detailCache.get(monsterId) || null;
  };

  const renderDetail = (monster) => {
    closeUtilityPanels();
    selectedMonsterId = monster?.monster_id || '';
    resultList.querySelectorAll('.monster-result-button[data-monster-id]').forEach((button) => {
      const isSelected = button.dataset.monsterId === selectedMonsterId;
      button.setAttribute('aria-current', String(isSelected));
      button.classList.toggle('is-active', isSelected);
    });
    welcome.hidden = Boolean(monster);
    detail.hidden = !monster;

    if (!monster) {
      syncFavoriteToggle();
      writeUrl();
      return;
    }

    detailName.textContent = monster.name;
    const aliases = [...(monster.aliases || []), ...(monster.sub_names || [])];
    detailAliases.hidden = aliases.length === 0;
    detailAliases.textContent = aliases.length === 0 ? '' : `補足名: ${aliases.join(' / ')}`;
    officialLink.href = monster.official_url;
    officialUrl.textContent = monster.official_url;
    recordHistory(monster.monster_id);
    syncFavoriteToggle();
    resetDetailData();
    renderMonsterImage(monster);
    void loadDetailData(monster).then((payload) => {
      if (selectedMonsterId !== monster.monster_id) return;
      if (payload === null) {
        detailLoading.textContent = 'モンスター詳細を読み込めませんでした';
        return;
      }
      renderDetailData(payload);
    }).catch((error) => {
      if (selectedMonsterId === monster.monster_id) detailLoading.textContent = 'モンスター詳細を読み込めませんでした';
      console.error(error);
    });
    if (window.matchMedia('(max-width: 960px)').matches) setActiveMobilePane('detail');
    writeUrl();
  };

  const searchTermsForMonster = (monster) => searchTermsByMonsterId[monster.monster_id] || {};

  const matchingSearchValue = (values, query) => {
    const normalizedQuery = normalizeSearchText(query);

    return (values || []).find((value) => normalizeSearchText(value).includes(normalizedQuery)) || '';
  };

  const resultSearchContext = (monster, query, target) => {
    if (query.trim() === '' || target === 'monster') return '';
    const terms = searchTermsForMonster(monster);
    const drop = matchingSearchValue((monster.drop_items || []).map((item) => item.name), query);
    const skill = matchingSearchValue(terms.skills, query);
    const map = matchingSearchValue(terms.maps, query);

    if (target === 'drop') return drop === '' ? '' : `ドロップ: ${drop}`;
    if (target === 'skill') return skill === '' ? '' : `スキル: ${skill}`;
    if (target === 'map') return map === '' ? '' : `出現マップ: ${map}`;
    if (target !== 'all') return '';
    if (matchesMonster(monster, query, 'monster')) return '';
    if (drop !== '') return `ドロップ: ${drop}`;
    if (skill !== '') return `スキル: ${skill}`;

    return map === '' ? '' : `出現マップ: ${map}`;
  };

  const renderResultButton = (monster, query, target) => {
    const listItem = createElement('li', 'result-item monster-result-item');
    const button = createElement('button', 'result-button monster-result-button');
    const main = createElement('span', 'result-main');
    const titleRow = createElement('span', 'result-title-row');
    const name = createElement('span', 'result-title monster-result-name');
    const meta = createElement('span', 'result-summary monster-result-meta');
    const tagRow = createElement('span', 'tag-row monster-result-tags');
    const favoriteAction = createElement('button', 'result-action-button result-favorite-button monster-result-favorite-button');
    button.type = 'button';
    button.dataset.monsterId = monster.monster_id;
    button.setAttribute('aria-current', String(monster.monster_id === selectedMonsterId));
    button.classList.toggle('is-active', monster.monster_id === selectedMonsterId);
    name.textContent = monster.name;
    const aliases = [...(monster.aliases || []), ...(monster.sub_names || [])];
    const classifications = [
      monster.filters?.size,
      monster.filters?.race,
      monster.filters?.type,
      monster.filters?.attribute,
    ].filter(Boolean);
    const searchContext = resultSearchContext(monster, query, target);
    const summary = [searchContext, aliases[0] || ''].filter(Boolean).join(' · ');
    titleRow.append(name);
    main.append(titleRow);
    if (summary !== '') {
      meta.title = summary;
      appendHighlightedText(meta, summary, query);
      main.append(meta);
    }
    classifications.forEach((classification) => tagRow.append(createElement('span', 'tag', classification)));
    if (tagRow.children.length > 0) main.append(tagRow);
    button.append(main);
    button.addEventListener('click', () => {
      trackSearchResultClickAnalytics(monster);
      renderDetail(monster);
      if (window.matchMedia('(max-width: 960px)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    favoriteAction.type = 'button';
    favoriteAction.dataset.monsterId = monster.monster_id;
    favoriteAction.append(createElement('i'));
    syncResultFavoriteAction(favoriteAction, monster.monster_id);
    favoriteAction.addEventListener('click', () => {
      toggleFavoriteMonster(monster.monster_id);
      if (document.contains(favoriteAction)) resetFavoriteButtonInteractionState(favoriteAction);
    });
    listItem.append(button, favoriteAction);

    return listItem;
  };

  const needsSearchTerms = (target) => ['skill', 'map', 'all'].includes(target);

  const loadSearchTerms = async () => {
    searchTermsByMonsterId = await monsterSearchService.loadSearchTerms();

    return searchTermsByMonsterId;
  };

  const resetRenderedResults = () => {
    renderedResultCount = 0;
    resultList.replaceChildren();
    resultsScroll.scrollTop = 0;
  };

  const updateResultStatus = () => {
    status.textContent = currentResults.length > renderedResultCount
      ? `${currentResults.length}件中 ${renderedResultCount}件`
      : `${currentResults.length}件`;
  };

  const appendResultBatch = () => {
    if (renderedResultCount >= currentResults.length) return;
    const nextCount = Math.min(renderedResultCount + resultRenderBatchSize, currentResults.length);
    const fragment = document.createDocumentFragment();
    currentResults.slice(renderedResultCount, nextCount).forEach((monster) => {
      fragment.append(renderResultButton(monster, currentResultQuery, currentResultTarget));
    });
    resultList.append(fragment);
    renderedResultCount = nextCount;
    updateResultStatus();
  };

  const appendResultsNearScrollEnd = () => {
    const usesInternalScroll = resultsScroll.scrollHeight > resultsScroll.clientHeight + 1;
    const remaining = usesInternalScroll
      ? resultsScroll.scrollHeight - resultsScroll.scrollTop - resultsScroll.clientHeight
      : resultsScroll.getBoundingClientRect().bottom - window.innerHeight;
    if (remaining < 480) appendResultBatch();
  };

  const renderResults = async () => {
    const generation = ++searchGeneration;
    const query = searchInput.value;
    const target = searchTarget.value;
    const filters = currentMonsterFilters();
    const hasFilters = hasActiveMonsterFilters(filters);
    const isInitial = query.trim() === '' && !hasFilters && personalScope === '' && activeUpdateMonsterIds === null;

    resultNotice.textContent = '検索条件を入力または選択してください。';
    resultNotice.hidden = !isInitial;

    if (query.trim() !== '' && needsSearchTerms(target)) {
      status.textContent = '追加の検索語を読み込み中';
      try {
        await loadSearchTerms();
      } catch (error) {
        if (generation !== searchGeneration) return;
        currentResults = [];
        resetRenderedResults();
        resultEmpty.hidden = false;
        resultEmpty.querySelector('h2').textContent = '検索語データを読み込めませんでした';
        resultEmpty.querySelector('p').textContent = '時間をおいてもう一度お試しください。';
        status.textContent = '追加の検索語の読み込み失敗';
        writeUrl();
        console.error(error);
        return null;
      }
    }

    if (generation !== searchGeneration) return;

    resultEmpty.querySelector('h2').textContent = '該当するモンスターがありません';
    resultEmpty.querySelector('p').textContent = '別の表記を試すか、公式モンスター検索で全件を確認してください。';

    if (isInitial) {
      currentResults = [];
      resetRenderedResults();
      resultEmpty.hidden = true;
      status.textContent = `${monsters.length.toLocaleString()}体収録`;
      syncFilterGroupState();
      writeUrl();
      return 0;
    }

    const scopeIds = personalScope === 'favorite' ? activeFavoriteMonsterIds() : historyMonsterIds;
    const source = activeUpdateMonsterIds !== null
      ? monsters.filter((monster) => activeUpdateMonsterIds.has(String(monster.monster_id)))
      : personalScope === ''
        ? monsters
        : scopeIds.map((id) => monsters.find((monster) => monster.monster_id === id)).filter(Boolean);

    if (personalScope !== '' && source.length === 0) {
      currentResults = [];
      resetRenderedResults();
      resultNotice.textContent = personalScope === 'favorite'
        ? `${activeFavoriteSet()?.name || 'お気に入り'}はありません。`
        : '閲覧したモンスターはありません。';
      resultNotice.hidden = false;
      resultEmpty.hidden = true;
      status.textContent = '0件';
      syncFilterGroupState();
      writeUrl();
      return 0;
    }

    const matched = source.filter((monster) => (
      matchesMonster(monster, query, target, searchTermsForMonster(monster)) && matchesMonsterFilters(monster, filters)
    ));
    currentResults = matched;
    currentResultQuery = query;
    currentResultTarget = target;
    resetRenderedResults();
    appendResultBatch();
    resultEmpty.hidden = matched.length !== 0;
    updateResultStatus();
    syncFilterGroupState();
    writeUrl();

    return matched.length;
  };

  const resetSearchSelection = () => {
    searchInput.value = '';
    searchTarget.value = 'monster';
    syncSearchTarget();
    personalScope = '';
    syncPersonalScopeButtons();
    filterButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    selectedMonsterId = '';
    syncFavoriteToggle();
  };

  const selectUpdateGroupSearch = async (updateKey, monsterIds) => {
    const normalizedIds = monsterIds.map(String).filter(Boolean);
    if (normalizedIds.length === 0) return false;
    resetSearchSelection();
    activeUpdateMonsterIds = new Set(normalizedIds);
    activeUpdateKey = updateKey;
    closeUtilityPanels();
    welcome.hidden = false;
    detail.hidden = true;
    if (window.matchMedia('(max-width: 960px)').matches) setActiveMobilePane('search');
    await renderResults();

    return true;
  };

  const selectSingleUpdateMonster = async (monster) => {
    resetSearchSelection();
    activeUpdateMonsterIds = new Set([String(monster.monster_id)]);
    activeUpdateKey = '';
    closeUtilityPanels();
    await renderResults();
    renderDetail(monster);
    if (window.matchMedia('(max-width: 960px)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const restoreUpdateSearch = async () => {
    const updateKey = parameters.updates;
    if (updateKey === '') return false;
    const monsterIds = updateKey === 'weekly'
      ? currentUpdateMonsterIds
      : updateMonsterIdsByKey.get(updateKey) || [];

    return selectUpdateGroupSearch(updateKey, monsterIds);
  };

  const loadIndex = async () => {
    const openVersionHistory = new URL(window.location.href).searchParams.get('panel') === 'version-history';
    try {
      const [response, versionHistory, updates] = await Promise.all([
        fetch(indexUrl),
        fetch(versionHistoryUrl).then((historyResponse) => (
          historyResponse.ok ? historyResponse.json() : null
        )).catch(() => null),
        fetch(updatesUrl).then((updatesResponse) => (
          updatesResponse.ok ? updatesResponse.json() : null
        )).catch(() => null),
      ]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      monsters = Array.isArray(payload.monsters) ? payload.monsters : [];
      monsterSearchService.setMonsters(monsters);
      updateStatus.textContent = String(payload.update_version || '-');
      renderVersionHistory(versionHistory);
      loadPersonalData();
      renderUpdateInfo(updates);
      const restoredUpdates = await restoreUpdateSearch();
      if (!restoredUpdates) await renderResults();
      renderDetail(monsters.find((monster) => monster.monster_id === selectedMonsterId) || null);
      if (openVersionHistory) {
        toggleUtilityPanel(versionHistoryPanel, updateStatus, 'version-history');
      }
    } catch (error) {
      currentResults = [];
      resetRenderedResults();
      monsterSearchService.setError(error);
      status.textContent = '公式一覧の読み込み失敗';
      resultEmpty.hidden = false;
      resultEmpty.querySelector('h2').textContent = '検索データを読み込めませんでした';
      resultEmpty.querySelector('p').textContent = '時間をおいて再読み込みするか、公式モンスター検索をご利用ください。';
      console.error(error);
    }
  };

  searchInput.value = parameters.q;
  searchTarget.value = parameters.target;
  syncSearchTarget();
  restoreMonsterFilters(parameters.filters);
  searchInput.addEventListener('input', async () => {
    activeUpdateMonsterIds = null;
    activeUpdateKey = '';
    const resultCount = await renderResults();
    if (Number.isInteger(resultCount)) {
      scheduleSearchAnalytics(resultCount, 'query_input');
    }
  });
  searchTarget.addEventListener('change', async () => {
    cancelScheduledSearchAnalytics();
    activeUpdateMonsterIds = null;
    activeUpdateKey = '';
    syncSearchTarget();
    const resultCount = await renderResults();
    if (Number.isInteger(resultCount)) {
      trackSearchAnalytics(resultCount, 'target_change');
    }
  });
  clearButton.addEventListener('click', async () => {
    cancelScheduledSearchAnalytics();
    const previousState = analyticsFilterState();
    const hadSearchTerm = searchInput.value.trim() !== '';
    const previousTarget = searchTarget.value;
    const keepsUtilityPanel = [helpPanel, presetManager, favoriteSetManager]
      .some((panel) => !panel.hidden);
    searchInput.value = '';
    searchTarget.value = 'monster';
    syncSearchTarget();
    personalScope = '';
    activeUpdateMonsterIds = null;
    activeUpdateKey = '';
    syncPersonalScopeButtons();
    filterButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    selectedMonsterId = '';
    versionHistoryPanel.hidden = true;
    updateStatus.setAttribute('aria-expanded', 'false');
    updateInfoPanel.hidden = true;
    updateInfoButton.setAttribute('aria-expanded', 'false');
    syncPanelParameter('');
    if (!keepsUtilityPanel) {
      welcome.hidden = false;
      detail.hidden = true;
    }
    if (window.matchMedia('(max-width: 960px)').matches) setActiveMobilePane('search');
    syncFavoriteToggle();
    await renderResults();
    sendAnalyticsEvent('search_reset', {
      had_search_term: String(hadSearchTerm),
      previous_search_target: previousTarget,
      ...Object.fromEntries(Object.entries(previousState).map(([key, value]) => [`previous_${key}`, value])),
    });
  });
  filterButtons.forEach((button) => button.addEventListener('click', async () => {
    cancelScheduledSearchAnalytics();
    activeUpdateMonsterIds = null;
    activeUpdateKey = '';
    const wasSelected = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!wasSelected));
    const resultCount = await renderResults();
    if (Number.isInteger(resultCount)) {
      trackFilterChangeAnalytics({
        filter_action: wasSelected ? 'remove' : 'add',
        filter_group: button.dataset.monsterFilter,
        filter_label: normalizeAnalyticsText(button.getAttribute('aria-label') || button.textContent),
        filter_value: button.dataset.filterValue,
      }, resultCount);
    }
  }));
  favoriteScopeButton.addEventListener('click', async () => {
    cancelScheduledSearchAnalytics();
    activeUpdateMonsterIds = null;
    activeUpdateKey = '';
    personalScope = personalScope === 'favorite' ? '' : 'favorite';
    syncPersonalScopeButtons();
    const resultCount = await renderResults();
    if (Number.isInteger(resultCount)) {
      trackFilterChangeAnalytics({
        filter_action: personalScope === 'favorite' ? 'set' : 'clear',
        filter_group: 'personal_scope',
        filter_label: 'お気に入り',
        filter_value: personalScope || 'all',
      }, resultCount);
    }
  });
  historyScopeButton.addEventListener('click', async () => {
    cancelScheduledSearchAnalytics();
    activeUpdateMonsterIds = null;
    activeUpdateKey = '';
    personalScope = personalScope === 'history' ? '' : 'history';
    syncPersonalScopeButtons();
    const resultCount = await renderResults();
    if (Number.isInteger(resultCount)) {
      trackFilterChangeAnalytics({
        filter_action: personalScope === 'history' ? 'set' : 'clear',
        filter_group: 'personal_scope',
        filter_label: '検索履歴',
        filter_value: personalScope || 'all',
      }, resultCount);
    }
  });
  const favoriteButtonFromEvent = (event) => {
    const button = event.target.closest('.favorite-toggle, .monster-result-favorite-button[data-monster-id]');

    if (!button || (button !== favoriteToggle && !resultList.contains(button))) return null;

    return button;
  };

  const syncFavoriteButtonFromEvent = (event) => {
    const button = favoriteButtonFromEvent(event);
    if (!button) return;

    if (button === favoriteToggle) {
      syncFavoriteToggle();
      return;
    }

    const monster = monsters.find((candidate) => candidate.monster_id === button.dataset.monsterId);
    if (monster) syncResultFavoriteAction(button, monster.monster_id);
  };

  const setFavoriteButtonInteractionState = (event) => {
    const button = favoriteButtonFromEvent(event);
    if (!button) return;

    if (event.type === 'mouseover') {
      button.dataset.favoriteHover = 'true';
    } else if (event.type === 'mouseout') {
      if (button.contains(event.relatedTarget)) return;
      button.dataset.favoriteHover = 'false';
    } else if (event.type === 'focusin') {
      button.dataset.favoriteFocus = 'true';
    } else if (event.type === 'focusout') {
      button.dataset.favoriteFocus = 'false';
    }

    syncFavoriteButtonFromEvent(event);
  };

  ['mouseover', 'mouseout', 'focusin', 'focusout'].forEach((eventName) => {
    favoriteToggle.addEventListener(eventName, setFavoriteButtonInteractionState);
    resultList.addEventListener(eventName, setFavoriteButtonInteractionState);
  });
  favoriteToggle.addEventListener('click', () => {
    toggleFavorite();
    resetFavoriteButtonInteractionState(favoriteToggle);
  });
  monsterImage.addEventListener('load', () => monsterImageFrame.classList.remove('is-error'));
  monsterImage.addEventListener('error', () => monsterImageFrame.classList.add('is-error'));
  favoriteSetButton.addEventListener('click', () => {
    setThemePopoverOpen(false);
    setFavoriteSetMenuVisible(favoriteSetMenu.hidden);
  });
  favoriteSetMenu.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-favorite-set-action]');
    if (!button || !favoriteSetMenu.contains(button)) return;
    if (button.dataset.favoriteSetAction === 'select') {
      selectFavoriteSet(button.dataset.favoriteSetId);
      setFavoriteSetMenuVisible(false);
      favoriteSetButton.focus();
    } else if (button.dataset.favoriteSetAction === 'manage') {
      setFavoriteSetMenuVisible(false);
      openFavoriteSetManager();
    }
  });
  favoriteSetClose.addEventListener('click', () => {
    closeUtilityPanels();
    favoriteSetButton.focus();
  });
  favoriteSetCreate.addEventListener('click', createFavoriteSet);
  favoriteSetName.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    createFavoriteSet();
  });
  favoriteSetList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-favorite-set-action][data-favorite-set-id]');
    if (!button || !favoriteSetList.contains(button)) return;
    const setId = button.dataset.favoriteSetId;
    if (button.dataset.favoriteSetAction === 'select') {
      selectFavoriteSet(setId);
    } else if (button.dataset.favoriteSetAction === 'delete') {
      deleteFavoriteSet(setId);
    }
  });
  favoriteSetList.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-favorite-set-action="rename"][data-favorite-set-id]');
    if (!input || !favoriteSetList.contains(input)) return;
    renameFavoriteSet(input.dataset.favoriteSetId, input.value);
  });
  favoriteSetList.addEventListener('keydown', (event) => {
    const input = event.target.closest('input[data-favorite-set-action="rename"][data-favorite-set-id]');
    if (!input || !favoriteSetList.contains(input)) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      input.blur();
    } else if (event.key === 'Escape') {
      const set = favoriteSetById(input.dataset.favoriteSetId);
      if (set) input.value = set.name;
      input.blur();
    }
  });
  presetButton.addEventListener('click', () => toggleUtilityPanel(presetManager, presetButton));
  presetClose.addEventListener('click', () => {
    closeUtilityPanels();
    presetButton.focus();
  });
  presetSave.addEventListener('click', saveCurrentPreset);
  presetName.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    saveCurrentPreset();
  });
  presetList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset-action][data-preset-id]');
    if (!button) return;
    const preset = searchPresets.find((item) => item.id === button.dataset.presetId);
    if (!preset) return;
    if (button.dataset.presetAction === 'apply') void applyPreset(preset);
    if (button.dataset.presetAction === 'overwrite') {
      updatePreset(preset.id, (item) => ({ ...item, params: currentPresetParams() }));
    }
    if (button.dataset.presetAction === 'delete') {
      searchPresets = searchPresets.filter((item) => item.id !== preset.id);
      savePresets();
      renderPresets();
    }
  });
  presetList.addEventListener('change', (event) => {
    const input = event.target.closest('.preset-item-name-input[data-preset-id]');
    if (!input) return;
    const name = input.value.trim();
    if (name === '') {
      renderPresets();
      return;
    }
    updatePreset(input.dataset.presetId, (preset) => ({ ...preset, name }));
  });
  document.getElementById('monsterSearchForm').addEventListener('submit', (event) => event.preventDefault());
  paneResizer.addEventListener('pointerdown', (event) => {
    if (window.matchMedia('(max-width: 960px)').matches) return;
    const startX = event.clientX;
    const startWidth = paneResizer.getBoundingClientRect().left - workspace.getBoundingClientRect().left;
    paneResizer.setPointerCapture(event.pointerId);
    paneResizer.setAttribute('aria-pressed', 'true');
    document.body.classList.add('is-monster-resizing');

    const resize = (moveEvent) => applyPaneWidth(startWidth + moveEvent.clientX - startX);
    const finish = () => {
      paneResizer.removeEventListener('pointermove', resize);
      paneResizer.removeEventListener('pointerup', finish);
      paneResizer.removeEventListener('pointercancel', finish);
      paneResizer.setAttribute('aria-pressed', 'false');
      document.body.classList.remove('is-monster-resizing');
      if (customPaneWidth !== null) applyPaneWidth(customPaneWidth, true);
    };

    paneResizer.addEventListener('pointermove', resize);
    paneResizer.addEventListener('pointerup', finish);
    paneResizer.addEventListener('pointercancel', finish);
  });
  paneResizer.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') {
      resetPaneWidth();
      return;
    }
    const currentWidth = paneResizer.getBoundingClientRect().left - workspace.getBoundingClientRect().left;
    applyPaneWidth(currentWidth + (event.key === 'ArrowRight' ? 16 : -16), true);
  });
  paneResizer.addEventListener('dblclick', resetPaneWidth);
  window.addEventListener('resize', () => {
    if (customPaneWidth !== null && !window.matchMedia('(max-width: 960px)').matches) {
      applyPaneWidth(customPaneWidth);
    }
  });
  resultList.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const buttons = Array.from(resultList.querySelectorAll('.monster-result-button'));
    const currentIndex = buttons.indexOf(document.activeElement);
    const nextIndex = event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
    if (buttons[nextIndex]) {
      event.preventDefault();
      buttons[nextIndex].focus();
    }
  });
  resultsScroll.addEventListener('scroll', appendResultsNearScrollEnd, { passive: true });
  window.addEventListener('scroll', appendResultsNearScrollEnd, { passive: true });
  helpButton.addEventListener('click', () => toggleUtilityPanel(helpPanel, helpButton));
  helpClose.addEventListener('click', () => {
    closeUtilityPanels();
    helpButton.focus();
  });
  updateInfoButton.addEventListener('click', () => toggleUtilityPanel(updateInfoPanel, updateInfoButton));
  updateInfoClose.addEventListener('click', () => {
    closeUtilityPanels();
    updateInfoButton.focus();
  });
  updateInfoSummary.addEventListener('click', async () => {
    trackUpdateInfoWeeklyClickAnalytics();
    await selectUpdateGroupSearch('weekly', currentUpdateMonsterIds);
  });
  updateInfoList.addEventListener('click', async (event) => {
    const button = event.target.closest('.update-info-link[data-monster-id]');
    if (!button || !updateInfoList.contains(button)) return;
    const monster = monsters.find((candidate) => String(candidate.monster_id) === button.dataset.monsterId);
    if (!monster) return;
    trackUpdateInfoMonsterClickAnalytics(monster);
    await selectSingleUpdateMonster(monster);
  });
  updateStatus.addEventListener('click', () => toggleUtilityPanel(versionHistoryPanel, updateStatus, 'version-history'));
  versionHistoryClose.addEventListener('click', () => {
    closeUtilityPanels();
    updateStatus.focus();
  });
  searchTab.addEventListener('click', () => setActiveMobilePane('search'));
  filterTab.addEventListener('click', () => setActiveMobilePane('filters'));
  detailTab.addEventListener('click', () => setActiveMobilePane('detail'));
  mobileSearchButton.addEventListener('click', () => setActiveMobilePane('search'));
  mobileFilterButton.addEventListener('click', () => setActiveMobilePane('filters'));
  mobileDetailButton.addEventListener('click', () => setActiveMobilePane('detail'));
  themeToggle.addEventListener('click', () => setThemePopoverOpen(themeToggle.getAttribute('aria-expanded') !== 'true'));
  themeButtons.forEach((button) => button.addEventListener('click', () => {
    applyTheme(button.dataset.themeChoice, true);
  }));
  document.addEventListener('click', (event) => {
    if (!favoriteSetMenu.hidden && !favoriteSetMenu.contains(event.target) && !favoriteSetButton.contains(event.target)) {
      setFavoriteSetMenuVisible(false);
    }
    if (!colorModePopover.hidden && !colorModePopover.contains(event.target) && !themeToggle.contains(event.target)) setThemePopoverOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!favoriteSetMenu.hidden) {
        setFavoriteSetMenuVisible(false);
        favoriteSetButton.focus();
        return;
      }
      setThemePopoverOpen(false);
      if (utilityPanels.some((panel) => !panel.hidden)) closeUtilityPanels();
    }
  });

  document.addEventListener('click', trackAnalyticsClick);
  setupAnalyticsImpressionTracking();
  applyTheme(document.documentElement.dataset.theme);
  clearLegacyAccent();
  setActiveMobilePane('search');
  restorePaneWidth();
  loadIndex();
})();
