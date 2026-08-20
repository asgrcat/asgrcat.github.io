((global) => {
  const modelContext = global.document?.modelContext;
  const serviceModule = global.JroSearchMonsterSearchService;

  if (!modelContext?.registerTool || !serviceModule?.defaultService) {
    return;
  }

  const service = serviceModule.defaultService;
  const targetParameterValues = ['monster', 'drop', 'skill', 'map', 'all'];
  const listLimit = 20;

  const compactList = (values, limit = listLimit) => Array.from(new Set(
    (Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean),
  )).slice(0, limit);

  const monsterPageUrl = (monsterId) => {
    const url = new URL(global.location.href);

    url.search = '';
    url.hash = '';
    url.searchParams.set('id', String(monsterId));

    return url.href;
  };

  const searchPageUrl = ({ query, target }) => {
    const url = new URL(global.location.href);

    url.search = '';
    url.hash = '';
    url.searchParams.set('q', query);
    url.searchParams.set('target', target);

    return url.href;
  };

  const compactMonster = (monster) => {
    const filters = monster.filters || {};
    const searchTerms = service.searchTermsForMonster(monster.monster_id);

    return {
      monster_id: String(monster.monster_id || ''),
      name: String(monster.name || ''),
      aliases: compactList(monster.aliases),
      sub_names: compactList(monster.sub_names),
      size: String(filters.size || ''),
      race: String(filters.race || ''),
      type: filters.is_mvp === true ? 'MVP' : String(filters.type || ''),
      attribute: String(filters.attribute || ''),
      is_mvp: filters.is_mvp === true,
      is_md: filters.is_md === true,
      is_dungeon: filters.is_dungeon === true,
      drop_items: (monster.drop_items || []).slice(0, listLimit).map((item) => ({
        item_id: String(item.item_id || ''),
        name: String(item.name || ''),
      })),
      skills: compactList(searchTerms.skills),
      maps: compactList(searchTerms.maps),
      official_url: String(monster.official_url || ''),
      page_url: monsterPageUrl(monster.monster_id),
    };
  };

  const executeSearch = async ({ query, target = 'monster', limit = 20 }) => {
    await service.whenReady();
    await service.ensureSearchTerms(target);

    const result = service.search({ limit, query, target });

    return {
      query: result.query,
      target: result.target,
      total: result.total,
      returned: result.items.length,
      truncated: result.truncated,
      search_url: searchPageUrl(result),
      monsters: result.items.map(compactMonster),
    };
  };

  const register = async () => {
    try {
      await modelContext.registerTool({
        name: 'search-monsters',
        title: 'JROモンスター検索',
        description: 'JROの公開モンスターデータを、モンスター名、ドロップ品、スキル、出現マップから検索します。',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              minLength: 1,
              description: '検索語。モンスター名、ドロップ品、スキル、出現マップを検索できます。',
            },
            target: {
              type: 'string',
              enum: targetParameterValues,
              default: 'monster',
              description: '検索対象。monsterはモンスター名、dropはドロップ品、skillはスキル、mapは出現マップ、allはすべてです。',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 20,
              description: '返すモンスター数の上限です。',
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
        annotations: {
          readOnlyHint: true,
          untrustedContentHint: true,
        },
        execute: executeSearch,
      });
    } catch (error) {
      console.warn('WebMCP monster search registration failed.', error);
    }
  };

  register();
})(globalThis);
