(() => {
  "use strict";
  const productFields = new WeakMap();
  let loading = null;

  function load() {
    if (globalThis.HLBProducts) return Promise.resolve(globalThis.HLBProducts);
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const edition = globalThis.HLBProductSourceHashes;
        script.src = new URL("src/product-data.js?v=" + (edition ? [edition.ko, edition.en].join("-") : "1"), document.baseURI).href;
        const failed = () => { loading = null; reject(new Error("제품 목록을 불러오지 못했습니다.")); };
        script.onload = () => { script.remove(); globalThis.HLBProducts ? resolve(globalThis.HLBProducts) : failed(); };
        script.onerror = () => { script.remove(); failed(); };
        document.head.append(script);
      });
    }
    return loading;
  }

  const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase()
    .replace(/에이치엘비/g, "hlb").replace(/[^\p{L}\p{N}]/gu, "");

  function search(products, query) {
    const terms = query.trim().split(/\s+/).map(normalize).filter(Boolean);
    if (!terms.length) return products;
    return products.filter(product => {
      if (!productFields.has(product)) {
        productFields.set(product, [product.name, product.brand, product.company, product.category,
          product.description, product.price, ...(product.details || []).map(pair => pair[1])].map(normalize));
      }
      return terms.every(term => productFields.get(product).some(field => field.includes(term)));
    });
  }

  // Source IDs contain page and row numbers. Keep a second identity check so a
  // link still finds a moved product and never silently opens a replacement row.
  function identity(product) {
    const fields = [product.name, product.brand, product.company, product.category, product.description].map(normalize);
    let hash = 2166136261;
    for (const char of fields.join("|")) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
    return (hash >>> 0).toString(36);
  }

  function productRoute(product, language) {
    return "#/product/" + language + "/" + encodeURIComponent(product.id) + "/" + identity(product);
  }
  function resolveProduct(products, route) {
    const matching = products.filter(product => identity(product) === route.key);
    return matching.find(product => product.id === route.id) || (matching.length === 1 ? matching[0] : null);
  }
  function resourceRoute(id, attachment) {
    return "#/resource/" + encodeURIComponent(id) + (attachment ? "?attachment=" + encodeURIComponent(attachment) : "");
  }
  function readRoute(hash) {
    const product = /^#\/product\/(ko|en)\/([\w-]+)\/([a-z0-9]+)$/.exec(hash);
    if (product) return {type:"product", language:product[1], id:product[2], key:product[3]};
    const resource = /^#\/resource\/([\w-]+)(?:\?([^#]*))?$/.exec(hash);
    return resource && {type:"resource", id:resource[1], attachment:new URLSearchParams(resource[2]).get("attachment")};
  }

  function shareControl(getRoute, english = false) {
    const wrap = document.createElement("span");
    wrap.className = "exhibit-share";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = english ? "Copy link" : "링크 복사";
    const message = document.createElement("span");
    message.setAttribute("role", "status");
    wrap.append(button, message);
    let request = 0;
    button.addEventListener("click", async () => {
      const route = getRoute();
      if (!route) return;
      const current = ++request;
      const url = new URL(location.href);
      url.search = "";
      url.hash = route;
      try {
        await navigator.clipboard.writeText(url.href);
        if (request === current && getRoute() === route) message.textContent = english ? "Copied" : "복사됨";
      } catch {
        if (request !== current || getRoute() !== route || !wrap.isConnected) return;
        const field = document.createElement("input");
        field.readOnly = true;
        field.setAttribute("aria-label", english ? "Link to copy" : "복사할 주소");
        field.value = url.href;
        message.replaceChildren(field);
        field.focus(); field.select();
      }
    });
    return wrap;
  }
  globalThis.HLBProductLibrary = {load, search, productRoute, resolveProduct, resourceRoute, readRoute, shareControl};
})();
