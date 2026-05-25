((global) => {
  const activeKeys = (values) => Object.keys(values || {}).filter((key) => values[key]);

  const jobCodesForGroups = (jobMaster, groupCodes) => groupCodes.flatMap((groupCode) => (
    jobMaster.groups?.[groupCode]?.jobs || []
  ));

  const jobCodesForTiers = (jobMaster, tierCodes) => tierCodes.flatMap((tierCode) => (
    jobMaster.tiers?.[tierCode]?.jobs || []
  ));

  const intersectJobCodeSets = (sets) => {
    if (sets.length === 0) {
      return [];
    }

    return sets[0].filter((jobCode) => sets.every((set) => set.includes(jobCode)));
  };

  const excludedJobCodes = (jobMaster, equipJobs) => new Set([
    ...activeKeys(equipJobs.exclude_jobs),
    ...jobCodesForGroups(jobMaster, activeKeys(equipJobs.exclude_groups)),
  ]);

  const hasJobConditions = (equipJobs) => (
    equipJobs.all
      || activeKeys(equipJobs.include_jobs).length > 0
      || activeKeys(equipJobs.include_groups).length > 0
      || activeKeys(equipJobs.exclude_jobs).length > 0
      || activeKeys(equipJobs.exclude_groups).length > 0
  );

  const allowedJobCodes = (jobMaster, equipJobs) => {
    const conditions = equipJobs || {};
    const excluded = excludedJobCodes(jobMaster, conditions);
    const hasConditions = hasJobConditions(conditions);
    const included = conditions.all ? Object.keys(jobMaster.jobs || {}) : [
      ...activeKeys(conditions.include_jobs),
      ...jobCodesForGroups(jobMaster, activeKeys(conditions.include_groups)),
    ];

    return Array.from(new Set(hasConditions ? included : Object.keys(jobMaster.jobs || {})))
      .filter((jobCode) => !excluded.has(jobCode));
  };

  const isWeaponEquipment = (item) => {
    const weaponCategories = item.classification?.weapon_categories || {};

    return item.classification?.positions?.weapon === true
      || weaponCategories.weapon === true
      || activeKeys(weaponCategories).length > 0;
  };

  const matchesExplicitEquipJobRule = (equipJobs, rule) => {
    const explicitGroups = rule.explicit_equip_groups || [];
    const explicitJobs = rule.explicit_equip_jobs || [];

    return explicitGroups.some((group) => equipJobs.include_groups?.[group] === true)
      || explicitJobs.some((job) => equipJobs.include_jobs?.[job] === true);
  };

  const createMatcher = (jobMaster = {}) => {
    const normalizedJobMaster = {
      groups: jobMaster.groups || {},
      jobs: jobMaster.jobs || {},
      tiers: jobMaster.tiers || {},
      weapon_categories_by_job: jobMaster.weapon_categories_by_job || {},
    };
    const jobWeaponRule = (jobCode) => (
      normalizedJobMaster.weapon_categories_by_job?.[jobCode] || { weapon_categories: [] }
    );
    const selectedJobCodes = (selectedJobs, selectedGroups = [], selectedTiers = []) => {
      const selectedSets = [];

      if (selectedJobs.length > 0) {
        selectedSets.push(selectedJobs);
      }

      if (selectedGroups.length > 0) {
        selectedSets.push(jobCodesForGroups(normalizedJobMaster, selectedGroups));
      }

      if (selectedTiers.length > 0) {
        selectedSets.push(jobCodesForTiers(normalizedJobMaster, selectedTiers));
      }

      return Array.from(new Set(intersectJobCodeSets(selectedSets)));
    };
    const matchesJobWeaponRule = (item, jobCode) => {
      if (!isWeaponEquipment(item)) {
        return true;
      }

      const rule = jobWeaponRule(jobCode);
      const weaponCategories = item.classification?.weapon_categories || {};
      const allowedWeapons = rule.weapon_categories || [];
      const matchesWeapon = allowedWeapons.some((weapon) => weaponCategories[weapon] === true);

      if (!matchesWeapon) {
        return false;
      }

      if (rule.requires_explicit_equip_job !== true) {
        return true;
      }

      return matchesExplicitEquipJobRule(item.classification?.equip_jobs || {}, rule);
    };
    const matchesExplicitJobWeaponOverride = (item, jobCode) => {
      if (!isWeaponEquipment(item)) {
        return false;
      }

      const rule = jobWeaponRule(jobCode);

      if (rule.requires_explicit_equip_job !== true) {
        return false;
      }

      return matchesJobWeaponRule(item, jobCode);
    };
    const matchesJobFilters = (item, selectedJobs) => {
      if (selectedJobs.length === 0) {
        return true;
      }

      const equipJobs = item.classification?.equip_jobs || {};

      if (!hasJobConditions(equipJobs)) {
        return item.classification?.equipment === true
          && selectedJobs.some((jobCode) => matchesJobWeaponRule(item, jobCode));
      }

      const allowedJobs = allowedJobCodes(normalizedJobMaster, equipJobs);

      return selectedJobs.some((jobCode) => (
        (allowedJobs.includes(jobCode) || matchesExplicitJobWeaponOverride(item, jobCode))
          && matchesJobWeaponRule(item, jobCode)
      ));
    };

    return {
      allowedJobCodes: (equipJobs) => allowedJobCodes(normalizedJobMaster, equipJobs),
      matchesJobFilters,
      matchesJobWeaponRule,
      selectedJobCodes,
    };
  };

  global.JroSearchJobFilter = { createMatcher };
})(globalThis);
