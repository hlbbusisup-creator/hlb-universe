(() => {
  const { spaces } = globalThis.HLBCatalogData;
  const spaceNames = new Map(spaces.map(space => [space.id, space.title]));

  async function loadResources() {
    return globalThis.HLBCatalogData.resources.map(resource => ({
      language: "",
      year: null,
      ...resource,
      keywords: [...resource.keywords]
    }));
  }

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/에이치엘비/g, "hlb")
      .replace(/한국어|한글|국문|\b(?:korean|kor)\b/g, " 국문 ")
      .replace(/영어|영문|\b(?:english|eng)\b/g, " 영문 ")
      .replace(/일본어|일문|\b(?:japanese|jpn)\b/g, " 일문 ")
      .replace(/브로셔|브로슈어|brochure/g, " 브로슈어 ")
      .replace(/카다로그|카달로그|카탈로그|카탈록|catalog(?:ue)?/g, " 카탈로그 ")
      .replace(/(\d{4})년/g, "$1")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function searchResources(resources, filters = {}) {
    const { query, space, type, language, year } = filters;
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return resources.filter(resource => {
      if (space && resource.space !== space) return false;
      if (type && resource.type !== type) return false;
      if (language && resource.language !== language) return false;
      if (year && String(resource.year) !== String(year)) return false;
      if (!terms.length) return true;

      const fields = [
        resource.title, resource.company, resource.type, resource.language,
        resource.year, resource.description, spaceNames.get(resource.space),
        ...resource.keywords
      ];
      const searchable = fields.map(field => normalize(field).replace(/\s/g, ""));
      return terms.every(term => searchable.some(field => field.includes(term)));
    });
  }

  globalThis.HLBCatalog = { spaces, loadResources, searchResources };
})();
