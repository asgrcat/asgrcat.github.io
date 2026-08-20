((global) => {
  const targetLabels = {
    all: 'すべて',
    drop: 'ドロップ品',
    map: '出現マップ',
    monster: 'モンスター名',
    skill: 'スキル',
  };
  const defaultLimit = 20;
  const maximumLimit = 50;
  const defaultSearchTermsUrl = '../data/search/monster-search-terms.json';

  const create = ({
    core = null,
    searchTermsLoader = null,
  } = {}) => {
    let monsters = [];
    let loadError = null;
    let isReady = false;
    let waiting = [];
    let searchTerms = {};
    let searchTermsReady = false;
    let searchTermsPromise = null;

    const normalizedTarget = (target) => {
      const key = String(target || 'monster').trim().toLowerCase();

      if (!Object.hasOwn(targetLabels, key)) {
        throw new TypeError(`Unsupported search target: ${key}`);
      }

      return key;
    };

    const normalizedLimit = (limit) => {
      const value = Number.isFinite(Number(limit)) ? Math.trunc(Number(limit)) : defaultLimit;

      return Math.min(maximumLimit, Math.max(1, value));
    };

    const settleWaiting = (method, value) => {
      const pending = waiting;

      waiting = [];
      pending.forEach((entry) => entry[method](value));
    };

    const setMonsters = (values) => {
      monsters = Array.isArray(values) ? values : [];
      loadError = null;
      isReady = true;
      settleWaiting('resolve');
    };

    const setError = (error) => {
      const normalizedError = error instanceof Error
        ? error
        : new Error(String(error || 'Monster search data is unavailable.'));

      monsters = [];
      loadError = normalizedError;
      isReady = false;
      settleWaiting('reject', normalizedError);
    };

    const whenReady = () => {
      if (isReady) {
        return Promise.resolve();
      }

      if (loadError) {
        return Promise.reject(loadError);
      }

      return new Promise((resolve, reject) => waiting.push({ reject, resolve }));
    };

    const setSearchTerms = (value) => {
      searchTerms = value && typeof value === 'object' ? value : {};
      searchTermsReady = true;

      return searchTerms;
    };

    const defaultSearchTermsLoader = async () => {
      if (typeof global.fetch !== 'function') {
        throw new Error('Monster search term loader is unavailable.');
      }

      const response = await global.fetch(defaultSearchTermsUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();

      return payload?.monsters;
    };

    const loadSearchTerms = async () => {
      if (searchTermsReady) {
        return searchTerms;
      }

      if (searchTermsPromise === null) {
        const loader = searchTermsLoader || defaultSearchTermsLoader;

        searchTermsPromise = Promise.resolve()
          .then(() => loader())
          .then(setSearchTerms)
          .catch((error) => {
            searchTermsPromise = null;
            throw error;
          });
      }

      return searchTermsPromise;
    };

    const needsSearchTerms = (target) => ['all', 'map', 'skill'].includes(normalizedTarget(target));

    const ensureSearchTerms = async (target) => {
      if (!needsSearchTerms(target)) {
        return searchTerms;
      }

      return loadSearchTerms();
    };

    const searchTermsForMonster = (monsterId) => searchTerms[String(monsterId || '')] || {};

    const search = ({ query, target = 'monster', limit = defaultLimit } = {}) => {
      if (!isReady) {
        throw loadError || new Error('Monster search data is not ready.');
      }

      const normalizedQuery = String(query || '').normalize('NFKC').trim();

      if (normalizedQuery === '') {
        throw new TypeError('query is required.');
      }

      const targetKey = normalizedTarget(target);

      if (needsSearchTerms(targetKey) && !searchTermsReady) {
        throw new Error('Monster search term data is not ready.');
      }

      const searchCore = core || global.JroSearchMonsterSearchCore;

      if (!searchCore) {
        throw new Error('JroSearchMonsterSearchCore is required.');
      }

      const resultLimit = normalizedLimit(limit);
      const matched = monsters.filter((monster) => searchCore.matchesMonster(
        monster,
        normalizedQuery,
        targetKey,
        searchTermsForMonster(monster.monster_id),
      ));

      return {
        items: matched.slice(0, resultLimit),
        limit: resultLimit,
        query: normalizedQuery,
        target: targetKey,
        total: matched.length,
        truncated: matched.length > resultLimit,
      };
    };

    return {
      ensureSearchTerms,
      loadSearchTerms,
      search,
      searchTermsForMonster,
      setError,
      setMonsters,
      setSearchTerms,
      whenReady,
    };
  };

  global.JroSearchMonsterSearchService = {
    create,
    defaultService: create(),
    targetLabels: { ...targetLabels },
  };
})(globalThis);
