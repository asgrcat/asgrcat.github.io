((global) => {
  const accessoryPositionKeys = ['accessory_1', 'accessory_2'];

  const toHiragana = (value) => value.replace(/[\u30a1-\u30f6]/g, (char) => (
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  ));

  const compactSearchText = (value) => value.replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~、。，．・：；？！「」『』【】（）［］｛｝〈〉《》〔〕〜～ー]/g, '');

  const normalizeSearchText = (value) => compactSearchText(
    toHiragana(String(value).normalize('NFKC').toLowerCase()).replace(/[っッ]/g, '')
  );

  const splitSearchTerms = (query) => String(query)
    .normalize('NFKC')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const supportScopeFromSearchQuery = (query) => {
    const normalizedQuery = String(query).normalize('NFKC');

    if (/[［\[]\s*シャドウ\s*[］\]]/.test(normalizedQuery)) {
      return 'shadow';
    }

    if (/[［\[]\s*衣装\s*[］\]]/.test(normalizedQuery)) {
      return 'costume';
    }

    return 'all';
  };

  const stripSupportScopeTerms = (query) => String(query)
    .normalize('NFKC')
    .replace(/[［\[]\s*(?:衣装|シャドウ)\s*[］\]]/g, ' ');

  const matchesSearchQuery = (text, query) => {
    const terms = splitSearchTerms(stripSupportScopeTerms(query));

    if (terms.length === 0) {
      return true;
    }

    const normalizedTerms = terms
      .map((term) => normalizeSearchText(term))
      .filter(Boolean);

    if (normalizedTerms.length === 0) {
      return false;
    }

    const normalizedText = normalizeSearchText(text);

    return normalizedTerms.every((term) => normalizedText.includes(term));
  };

  const includesAny = (values, selectedValues) => (
    selectedValues.length === 0 || selectedValues.some((selectedValue) => values.includes(selectedValue))
  );

  const matchesWeaponFilters = (weaponCategories, selectedWeapons) => {
    if (selectedWeapons.length === 0) {
      return true;
    }

    return selectedWeapons.some((weapon) => weaponCategories[weapon] === true);
  };

  const isCostumeItem = (item) => item.classification?.support_equipment_type === 'costume';
  const isShadowItem = (item) => item.classification?.support_equipment_type === 'shadow';

  const matchesSupportScope = (item, scope) => {
    if (scope === 'costume') {
      return isCostumeItem(item);
    }

    if (scope === 'shadow') {
      return isShadowItem(item);
    }

    return true;
  };

  const matchesCostumeScope = (item, scope) => {
    if (scope === 'costume') {
      return isCostumeItem(item);
    }

    if (scope === 'shadow') {
      return isShadowItem(item);
    }

    if (scope === 'non-costume') {
      return !isCostumeItem(item);
    }

    return true;
  };

  const matchesPositionFilters = (positions, selectedPositions) => {
    if (selectedPositions.length === 0) {
      return true;
    }

    return selectedPositions.some((position) => {
      if (position === 'accessory') {
        return accessoryPositionKeys.some((key) => positions[key]);
      }

      if (position === 'accessory_1') {
        return positions.accessory_1 === true && positions.accessory_2 !== true;
      }

      if (position === 'accessory_2') {
        return positions.accessory_2 === true && positions.accessory_1 !== true;
      }

      return positions[position] === true && positions.accessory !== true;
    });
  };

  const displayPositionLabels = (item) => {
    const positions = item.classification?.positions || {};
    const labels = item.classification?.position_labels || [];

    if (!accessoryPositionKeys.every((key) => positions[key])) {
      return Array.from(new Set(labels));
    }

    return Array.from(new Set([
      ...labels.filter((label) => label !== 'アクセサリー(1)' && label !== 'アクセサリー(2)'),
      'アクセサリー',
    ]));
  };

  global.JroSearchItemSearchCore = {
    displayPositionLabels,
    includesAny,
    matchesCostumeScope,
    matchesPositionFilters,
    matchesSearchQuery,
    matchesSupportScope,
    matchesWeaponFilters,
    normalizeSearchText,
    stripSupportScopeTerms,
    supportScopeFromSearchQuery,
  };
})(globalThis);
