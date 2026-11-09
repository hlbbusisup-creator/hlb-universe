(() => {
  "use strict";

  const labels = {
    ko: {
      title: "제품 도감", list: "제품 목록", previous: "이전 제품", next: "다음 제품",
      photo: "제품 사진", info: "제품 정보", noPhoto: "등록된 제품 사진이 없습니다.", photoError: "사진을 불러오지 못했습니다.",
      company: "회사", brand: "브랜드", price: "카탈로그 가격", buy: "구매처 보기",
      sourcePage: page => "원본 " + page + "쪽"
    },
    en: {
      title: "Product catalogue", list: "Product list", previous: "Previous product", next: "Next product",
      photo: "Product photo", info: "Product information", noPhoto: "No product photo is available.", photoError: "The photo could not be loaded.",
      company: "Company", brand: "Brand", price: "Catalogue price", buy: "Visit store",
      sourcePage: page => "Source p. " + page
    }
  };
  const localAssets = new URL("assets/", document.baseURI);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const dialog = document.createElement("dialog");
  dialog.className = "product-book";
  const stage = element("div", "pb-stage");
  const board = element("div", "pb-board");
  const spread = element("div", "pb-spread");
  const counter = element("span", "pb-count");
  const announce = element("span", "sr");
  announce.setAttribute("role", "status");
  const toolbar = element("header", "pb-toolbar");
  const back = action("pb-back", "‹");
  const previous = action("pb-previous", "‹");
  const next = action("pb-next", "›");
  let products = [];
  let index = 0;
  let trigger = null;
  let words = labels.ko;
  let leaf = null;

  function element(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value != null) el.textContent = value;
    return el;
  }

  function action(className, arrow) {
    const btn = element("button", className);
    btn.type = "button";
    const icon = element("span", "pb-arrow", arrow);
    icon.setAttribute("aria-hidden", "true");
    btn.append(icon, element("span", "pb-control-label"));
    return btn;
  }

  function imageURL(value) {
    if (!value) return null;
    try {
      const url = new URL(value, document.baseURI);
      return url.origin === localAssets.origin && url.protocol === localAssets.protocol &&
        !url.username && !url.password && url.pathname.startsWith(localAssets.pathname) &&
        /\.(?:avif|jpe?g|png|webp|gif)$/i.test(url.pathname) ? url : null;
    } catch { return null; }
  }

  function purchaseLink(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : null;
    } catch { return null; }
  }

  function photoPage(product) {
    const page = element("section", "pb-page pb-photo");
    page.setAttribute("aria-label", words.photo);
    const picture = element("div", "pb-picture");
    const photos = (product.images || []).filter(photo => imageURL(photo.url));
    const gallery = element("div", "pb-photo-choices");
    function selectPhoto(number) {
      const photo = photos[number];
      const image = element("img");
      image.alt = photo.alt || product.name;
      image.addEventListener("error", () => image.replaceWith(element("p", "pb-photo-note", words.photoError)), {once: true});
      image.src = imageURL(photo.url).href;
      picture.replaceChildren(image);
      for (const [i, button] of Array.from(gallery.children).entries()) {
        button.setAttribute("aria-pressed", String(i === number));
      }
    }
    if (photos.length > 1) {
      gallery.setAttribute("role", "group");
      gallery.setAttribute("aria-label", words.photo);
      photos.forEach((photo, i) => {
        const button = element("button", "", String(i + 1));
        button.type = "button";
        button.setAttribute("aria-label", words.photo + " " + (i + 1));
        button.addEventListener("click", () => selectPhoto(i));
        gallery.append(button);
      });
    }
    if (photos.length) selectPhoto(0);
    else picture.append(element("p", "pb-photo-note", words.noPhoto));
    page.append(picture);
    if (photos.length > 1) page.append(gallery);
    if (product.page) page.append(element("span", "pb-folio", words.sourcePage(product.page)));
    return page;
  }

  function informationPage(product) {
    const page = element("section", "pb-page pb-information");
    const content = element("div", "pb-text");
    content.tabIndex = 0;
    content.setAttribute("role", "region");
    content.setAttribute("aria-label", words.info);
    if (product.category) content.append(element("p", "pb-category", product.category));
    content.append(element("h2", "pb-title", product.name));
    if (product.description) content.append(element("p", "pb-description", product.description));
    const facts = element("dl", "pb-facts");
    const entries = [[words.company, product.company], [words.brand, product.brand], [words.price, product.price], ...(product.details || [])];
    for (const [label, value] of entries) {
      if (!value) continue;
      const row = element("div");
      row.append(element("dt", "", label), element("dd", "", value));
      facts.append(row);
    }
    if (facts.childElementCount) content.append(facts);
    const url = purchaseLink(product.purchaseUrl);
    if (url) {
      const link = element("a", "pb-store", words.buy + " ↗");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      content.append(link);
    }
    page.append(content);
    return page;
  }

  function removeLeaf() {
    leaf?.remove();
    leaf = null;
  }

  function flip(front, reverse, direction) {
    removeLeaf();
    if (reduceMotion.matches) return;
    const sheet = element("div", "pb-leaf " + direction);
    sheet.setAttribute("aria-hidden", "true");
    sheet.inert = true;
    front.classList.add("pb-face");
    reverse.classList.add("pb-face", "pb-reverse");
    sheet.append(front, reverse);
    board.append(sheet);
    leaf = sheet;
    sheet.addEventListener("animationend", event => {
      if (event.target === sheet && leaf === sheet) removeLeaf();
    });
  }

  function render(position, opening) {
    const forward = position > index;
    const outgoing = forward ? spread.lastElementChild : spread.firstElementChild;
    index = position;
    const product = products[index];
    const photo = photoPage(product);
    const information = informationPage(product);
    spread.replaceChildren(photo, information);
    counter.textContent = (index + 1) + " / " + products.length;
    announce.textContent = product.name + ", " + counter.textContent;
    previous.disabled = index === 0;
    next.disabled = index === products.length - 1;
    if (opening) {
      const cover = element("div", "pb-cover");
      cover.append(element("strong", "", "HLB"), element("span", "", words.title));
      flip(cover, photo.cloneNode(true), "pb-opening");
    } else {
      flip(outgoing, (forward ? photo : information).cloneNode(true), forward ? "pb-forward" : "pb-backward");
    }
  }

  function turn(direction) {
    const target = index + direction;
    if (!dialog.open || target < 0 || target >= products.length) return;
    const focused = document.activeElement;
    render(target, false);
    if (focused === previous && previous.disabled) next.focus({preventScroll: true});
    if (focused === next && next.disabled) previous.focus({preventScroll: true});
  }

  function open(items, selectedIndex, opener, language = "ko") {
    if (!Array.isArray(items) || !Number.isInteger(selectedIndex) || !items[selectedIndex]) return;
    products = items;
    trigger = opener || document.activeElement;
    words = labels[language] || labels.ko;
    dialog.lang = words === labels.en ? "en" : "ko";
    dialog.setAttribute("aria-label", words.title);
    for (const [button, label] of [[back, words.list], [previous, words.previous], [next, words.next]]) {
      button.lastElementChild.textContent = label;
      button.setAttribute("aria-label", label);
      button.title = label;
    }
    if (!dialog.isConnected) document.body.append(dialog);
    if (!dialog.open) dialog.showModal();
    render(selectedIndex, true);
    back.focus({preventScroll: true});
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  back.addEventListener("click", close);
  previous.addEventListener("click", () => turn(-1));
  next.addEventListener("click", () => turn(1));
  dialog.addEventListener("load", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    // Keep small print photographs legible both on the spread and on the turning sheet.
    image.style.maxWidth = image.naturalWidth * 2.5 + "px";
    image.style.maxHeight = image.naturalHeight * 2.5 + "px";
  }, true);
  dialog.addEventListener("keydown", event => {
    if (event.isComposing || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      turn(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    removeLeaf();
    spread.replaceChildren();
    products = [];
    if (trigger?.isConnected) trigger.focus({preventScroll: true});
    trigger = null;
  });
  toolbar.append(back, counter);
  board.append(spread);
  stage.append(previous, board, next);
  dialog.append(toolbar, stage, announce);
  globalThis.HLBProductBook = {open, close};
})();
