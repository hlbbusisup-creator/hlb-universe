(() => {
  const { spaces } = globalThis.HLBCatalogData;
  const spaceNames = new Map(spaces.map(space => [space.id, space.title]));
  let syncState={status:"bundled",updatedAt:null,count:0};
  const isNotionResource=resource=>/^https:\/\/mysterious-bait-6ee\.notion\.site\//.test(resource.url);
  function mergeSnapshot(snapshot) {
    if (snapshot?.schemaVersion!==1 || !Array.isArray(snapshot.resources) ||
      !snapshot.resources.length || snapshot.resources.length>5000 ||
      !Number.isFinite(Date.parse(snapshot.checkedAt))) throw new Error("Invalid catalog snapshot");
    const ids=new Set();
    for (const resource of snapshot.resources) {
      if (!resource || typeof resource.id!=="string" || !/^[\w-]+$/.test(resource.id) || ids.has(resource.id) ||
        typeof resource.title!=="string" || !resource.title.trim() || !spaceNames.has(resource.space) ||
        typeof resource.url!=="string" || !Array.isArray(resource.keywords) ||
        !resource.keywords.every(word=>typeof word==="string") || !Array.isArray(resource.reading?.sections)) {
        throw new Error("Incomplete catalog snapshot");
      }
      ids.add(resource.id);
    }
    // The two locally supplied AI de cologne brochures are independent of Notion.
    const local=globalThis.HLBCatalogData.resources.filter(resource=>!isNotionResource(resource));
    if (local.some(resource=>ids.has(resource.id))) throw new Error("Conflicting catalog IDs");
    return [...local,...snapshot.resources];
  }

  function getInitialResources() {
    syncState={status:"bundled",updatedAt:null,count:0};
    try {
      const cached=JSON.parse(globalThis.localStorage?.getItem("hlb-catalog-v1") || "null");
      const resources=mergeSnapshot(cached);
      syncState={status:"cached",updatedAt:cached.checkedAt,count:cached.resources.length};
      return resources;
    } catch { return globalThis.HLBCatalogData.resources; }
  }

  async function loadResources(options={}) {
    let resources=globalThis.HLBCatalogData.resources;
    const base=options.baseURI || globalThis.document?.baseURI;
    const fetcher=options.fetcher || globalThis.fetch;
    if (base && fetcher) {
      let storage;
      try { storage=globalThis.localStorage; } catch {}
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),8000);
      try {
        const response=await fetcher(new URL("assets/reading/notion/catalog.json",base),{
          cache:"no-cache",signal:controller.signal
        });
        if (!response.ok) throw new Error("Catalog is unavailable");
        const snapshot=await response.json();
        resources=mergeSnapshot(snapshot);
        syncState={status:"synced",updatedAt:snapshot.checkedAt,count:snapshot.resources.length};
        try { storage?.setItem("hlb-catalog-v1",JSON.stringify(snapshot)); } catch {}
      } catch {
        resources=getInitialResources();
      } finally { clearTimeout(timeout); }
    }
    return resources.map(resource => ({
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

  globalThis.HLBCatalog = { spaces, getInitialResources, loadResources, searchResources, getSyncState:()=>({...syncState}) };
})();
