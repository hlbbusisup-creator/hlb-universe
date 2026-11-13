(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const canvas = el("world");
  // The 3D picker handles pointerup. A compatibility click from the same tap
  // can otherwise activate a menu button underneath a newly opened dialog.
  canvas.addEventListener("touchend", event => event.preventDefault(), {passive:false});
  const dialog = el("panel");
  const catalog = window.HLBCatalog;
  const spaces = new Map(catalog.spaces.map(space => [space.id, space]));
  const fields = {space:el("space-filter"), type:el("type-filter"), language:el("language-filter"), year:el("year-filter")};
  let records = [];
  let catalogReady, catalogSettled = false;
  let world, player, renderer, camera, scene, fireworks, timeOfDay, yacht, historyFilm;
  const historyBook=window.HLBHistoryBook.create(el("history-pane"));
  let station = null, destination = null, localCollection = "";
  let returnRow = null, listScroll = 0;
  const stillScenery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0, previousTime = 0, lastStatusTime = 0;
  let lastActionLabel = "", hasWalked = false;
  const bySpace = new Map();
  const readingStops = [];
  const cafeCounterRadius = 1.8;
  const archiveSpaces = new Set();
  const guide = window.HLBLupeGuide.create({
    space: id => bySpace.get(id),
    nearest: () => {
      if (!player) return null;
      const p = player.getPosition();
      let nearest = null;
      for (const hall of bySpace.values()) {
        if (hall.interior && world.containsPoint(hall.interior,p)) return hall;
        if (!nearest || distance(p,hall.station) < distance(p,nearest.station)) nearest = hall;
      }
      return nearest;
    },
    walk: hall => walkToStop(hall, false, true),
    stop: () => { interruptWalk(); player?.setActive(false); player?.setActive(true); },
    riding: () => Boolean(yacht?.getState().busy),
    onMenuAnchor: anchor => {
      lupeCard.dataset.anchor = anchor;
      menuSide = 0;
    },
    available: () => Boolean(player) && !document.hidden && !dialog.open && !portalDestination && !historyFilm?.isWatching()
  });
  function interruptWalk() {
    destination = null;
    guide.interrupt();
    player?.setGuideTarget(null);
  }
  const cafeMenu = [
    {item:"coffee", name:"커피", action:"커피 마시기", progress:"마시는 중", received:"커피를 받았어요.", button:el("drink-coffee")},
    {item:"bread", name:"빵", action:"빵 먹기", progress:"먹는 중", received:"빵을 받았어요.", button:el("eat-bread")}
  ];
  let lastCarryState = "";
  const visitId = new URLSearchParams(location.search).get("visit");
  const dayButton = el("set-day"), nightButton = el("set-night");
  const overview = el("overview");
  overview.addEventListener("click", () => {
    player?.toggleOverview();
    updateStatus();
  });
  function setTime(mode) {
    timeOfDay.setMode(mode);
    dayButton.setAttribute("aria-pressed", String(mode === "day"));
    nightButton.setAttribute("aria-pressed", String(mode === "night"));
  }
  for (const [button, mode] of [[dayButton, "day"], [nightButton, "night"]]) {
    button.addEventListener("click", () => {
      setTime(mode);
      try { localStorage.setItem("hlb-universe-time", mode); } catch {}
    });
  }

  const volume = el("music-volume"), mute = el("mute-music");
  const soundButton = el("sound-button"), soundPanel = el("sound-panel");
  function syncSound({volume: level, muted, available}) {
    const percent = Math.round(level * 100);
    volume.value = String(percent);
    el("volume-value").value = percent + "%";
    volume.setAttribute("aria-valuetext", percent + "%");
    mute.setAttribute("aria-pressed", String(muted));
    soundButton.querySelector("use").setAttribute("href", muted || !percent ? "#mute-icon" : "#volume-icon");
    soundButton.disabled = !available;
    if (!available) soundButton.title = "이 브라우저에서는 배경음악을 재생할 수 없습니다.";
  }
  const music = window.HLBChamberMusic.create({onChange:syncSound});
  syncSound(music.getState());
  let portalDestination=null;
  const warpTravel = window.HLBWarpTravel.create({
    onSelect:beginPortalJourney,
    onDepart:()=>{
      player.setActive(false);
      music.setSuspended(true);
      cancelAnimationFrame(frame); frame=0;
    },
    onReturn:()=>finishPortalJourney("HLB 온라인 체험관의 포탈로 돌아왔습니다.")
  });
  warpTravel.renderList(el("warp-destinations"));
  function finishPortalJourney(message) {
    if (!portalDestination) return;
    portalDestination=null;
    player.endPortalTouch();
    world.warpGate.setTouchPose(false);
    el("experience").classList.remove("portal-travelling");
    el("cancel-travel").setAttribute("aria-label","길 안내 해제");
    music.setSuspended(false);
    player.setActive(!document.hidden && !dialog.open);
    updateStatus();
    el("announcement").textContent=message;
    if (!document.hidden) { canvas.focus({preventScroll:true}); resumeRendering(); }
  }
  function beginPortalJourney(visit) {
    if (portalDestination || !dialog.open || el("warp-pane").hidden || document.hidden) return;
    portalDestination=visit;
    dialog.close();
    player.setActive(true);
    const gate=world.warpGate;
    gate.setTouchPose(true);
    el("experience").classList.add("portal-travelling");
    el("travel-text").textContent=visit.title+" 이동 중";
    el("travel").hidden=false;
    el("cancel-travel").setAttribute("aria-label","포탈 이동 취소");
    el("announcement").textContent=visit.title+" 방문을 위해 포탈로 다가갑니다.";
    const started=player.beginPortalTouch(gate,()=>{
      if (portalDestination!==visit) return;
      try {
        if (warpTravel.open(visit.id)) return;
      } catch (error) { console.error(error); }
      finishPortalJourney("방문 화면을 열지 못했습니다. 포탈에서 다시 시도해 주세요.");
    });
    if (!started) { finishPortalJourney("포탈로 가는 길을 찾지 못했습니다. 가까이에서 다시 시도해 주세요."); return; }
    resumeRendering();
  }
  function setSoundPanel(open) {
    soundPanel.hidden = !open;
    soundButton.setAttribute("aria-expanded", String(open));
  }
  soundButton.addEventListener("click", () => setSoundPanel(soundPanel.hidden));
  volume.addEventListener("input", () => music.setVolume(Number(volume.value) / 100));
  mute.addEventListener("click", () => music.setMuted(!music.getState().muted));
  document.addEventListener("pointerdown", event => {
    if (!soundPanel.hidden && !el("sound-tools").contains(event.target)) setSoundPanel(false);
  });
  document.addEventListener("focusin", event => {
    if (!soundPanel.hidden && !el("sound-tools").contains(event.target)) setSoundPanel(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !soundPanel.hidden) {
      setSoundPanel(false);
      soundButton.focus({preventScroll:true});
    }
  });

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(svg.namespaceURI, "use");
    use.setAttribute("href", "#" + name + "-icon");
    svg.append(use);
    return svg;
  }

  function openPane(name, title) {
    if (portalDestination || historyFilm?.isWatching()) return;
    if (yacht?.getState().busy && yacht.getState().phase !== "walking") return;
    yacht?.cancelApproach();
    guide.dismiss();
    setSoundPanel(false);
    player?.setActive(false);
    historyFilm?.setPresent(false);
    if(name!=="history") historyBook.close();
    resetStick();
    interruptWalk();
    el("travel").hidden = true;
    for (const pane of ["guide", "gallery", "cafe", "library", "help", "reader", "warp", "history", "yacht"]) el(pane + "-pane").hidden = pane !== name;
    const reading=name==="reader";
    dialog.classList.toggle("reading",reading);
    dialog.classList.toggle("cafe-order",name==="cafe");
    dialog.classList.toggle("history-reading",name==="history");
    dialog.classList.toggle("yacht-picker",name==="yacht");
    el("reader-back").hidden=!reading;
    el("panel-title").textContent = title;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    if (reading) el("panel-title").focus({preventScroll:true});
    else if (name === "library" && !localCollection) el("query").focus();
    else el("close-panel").focus();
  }

  function resetFilters() {
    el("query").value = "";
    for (const select of Object.values(fields)) select.value = "";
  }

  function openLibrary(spaceId = "") {
    if (!archiveSpaces.has(spaceId)) spaceId = "";
    localCollection = spaceId;
    resetFilters();
    const space = spaces.get(spaceId);
    fields.space.hidden = Boolean(space);
    el("library-desc").textContent = space ? space.description : "HLB그룹의 자료와 개별 제품을 검색하세요.";
    openPane("library", space ? space.title + " 열람대" : "자료·제품 통합 검색");
    renderRecords();
  }

  function openRecord(record, row = null, options = {}) {
    returnRow = row;
    listScroll = dialog.scrollTop;
    openPane("reader", record.title);
    el("reader-back").textContent = row ? "← 자료 목록" : "← 전시장";
    if (!catalogSettled && (record.id === "products-ko" || record.id === "products-en")) {
      const pending = window.HLBReader.waitForEdition();
      catalogReady.then(() => {
        if (!dialog.open || el("reader-pane").hidden || !pending.isConnected) return;
        const current = records.find(item => item.id === record.id);
        if (current) {
          el("panel-title").textContent = current.title;
          window.HLBReader.open(current, spaces.get(current.space).title, options);
        } else {
          openLibrary(); el("library-desc").textContent = "이 제품 카탈로그는 현재 자료 목록에서 내려갔습니다.";
        }
      });
      return;
    }
    window.HLBReader.open(record, spaces.get(record.space).title, options);
  }

  function walkToStop(stop, inspectOnArrival = false, withLupe = false) {
    if (yacht?.getState().busy) return false;
    if (!withLupe) interruptWalk();
    if (dialog.open) dialog.close();
    player.setActive(true);
    if (player.walkTo(stop.station)) {
      destination = {...stop, inspectOnArrival, withLupe};
      if (withLupe) player.setGuideTarget(stop.station);
      el("announcement").textContent = stop.title + "까지 이동합니다.";
    } else {
      el("announcement").textContent = "길을 찾지 못했습니다. 캐릭터를 직접 움직여 보세요.";
      return false;
    }
    updateStatus();
    return true;
  }

  function openGallery() {
    const hall = bySpace.get("cologne");
    if (!player || !hall) { openLibrary("cologne"); return; }
    const buttons = hall.exhibits.map(exhibit => {
      const button = make("button", "gallery-stop");
      button.type = "button";
      const photo = window.HLBCologneReadingData[exhibit.id]?.photo;
      if (photo) {
        const img = make("img");
        img.src = photo.url;
        img.alt = "";
        button.append(img);
      }
      const copy = make("span","gallery-stop-copy");
      copy.append(make("strong", "", exhibit.title), make("small", "", "전시대로 걷기"), icon("arrow"));
      button.append(copy);
      button.addEventListener("click", () => walkToStop(exhibit));
      return button;
    });
    el("gallery-stops").replaceChildren(...buttons);
    openPane("gallery", spaces.get(hall.id).title);
  }

  function interact() {
    if (yacht?.getState().busy || historyFilm?.isWatching()) return;
    if (!station) return;
    if (station.id === "history-book") openHistoryBook();
    else if (station.id === "history-film") beginHistoryWatch();
    else if (station.id === "warp") openPane("warp", "포탈 · 목적지 선택");
    else if (station.spaceId === "cafe") openCafe();
    else if (station.record) openRecord(station.record);
    else if (station.spaceId === "cologne") openGallery();
    else openLibrary(station.spaceId);
  }

  function inHistoryHall() {
    const hall=bySpace.get("history");
    return Boolean(hall && player && world.containsPoint(hall.interior,player.getPosition()));
  }
  function openHistoryBook() {
    if(!inHistoryHall())return;
    openPane("history","History of HLB");historyBook.open();
  }
  function beginHistoryWatch() {
    if(!historyFilm || dialog.open || !inHistoryHall() || yacht?.getState().busy)return;
    interruptWalk();guide.dismiss();resetStick();player.setActive(false);
    historyFilm.setPresent(true);
    if(!historyFilm.beginWatch()){player.setActive(true);return;}
    player.setLupeVisible(false);
    music.setSuspended(true);
    el("experience").classList.add("history-watching");
    el("history-watch").hidden=false;
    el("end-history-watch").focus({preventScroll:true});resumeRendering();
  }
  function endHistoryWatch() {
    if(!historyFilm?.endWatch())return;
    player.setLupeVisible(true);
    music.setSuspended(false);
    el("experience").classList.remove("history-watching");el("history-watch").hidden=true;
    player.setActive(!document.hidden && !dialog.open);updateStatus();resumeRendering();canvas.focus({preventScroll:true});
  }
  el("end-history-watch").addEventListener("click",endHistoryWatch);
  el("retry-history-video").addEventListener("click",()=>historyFilm?.retry());
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape" && !event.isComposing && historyFilm?.isWatching()) {event.preventDefault();endHistoryWatch();}
    if(event.key==="Escape" && !event.isComposing && portalDestination && !warpTravel.isOpen()) {
      event.preventDefault();finishPortalJourney("포탈 이동을 취소했습니다.");
    }
  });

  function atCafeCounter() {
    const cafe = bySpace.get("cafe");
    if (!cafe || !player) return false;
    const p = player.getPosition(), room = cafe.interior;
    return world.containsPoint(room,p) &&
      distance(p, cafe.station) <= cafeCounterRadius;
  }

  function syncCafeActions() {
    const held = player.getCafeState();
    const key = [held.coffee, held.bread, held.consuming].join("/");
    if (key === lastCarryState) return;
    lastCarryState = key;
    const carrying = held.coffee || held.bread;
    el("carry-actions").hidden = !carrying;
    el("experience").classList.toggle("carrying",carrying);
    for (const {item, name, action, progress, button} of cafeMenu) {
      button.hidden = !held[item];
      button.disabled = Boolean(held.consuming);
      button.querySelector("span").textContent = held.consuming === item ? progress : action;
      const order = el("order-" + item);
      order.disabled = held[item];
      order.querySelector("span").textContent = name + (held[item] ? " 주문 완료" : " 주문하기");
    }
  }

  function openCafe() {
    if (!atCafeCounter()) return;
    syncCafeActions();
    el("order-status").textContent = "";
    openPane("cafe","Café Lento 1975");
  }

  function consumeCafeItem(item) {
    if (!player || yacht?.getState().busy || dialog.open || document.hidden || historyFilm?.isWatching()) return;
    const state=player.getCafeState();
    if (state.consuming) return;
    if (!state[item]) {
      el("announcement").textContent="카페 렌토에서 "+(item==="bread"?"빵을":"커피를")+" 주문해 주세요.";
      return;
    }
    if (!player.consumeCafeItem(item)) return;
    syncCafeActions();
    canvas.focus({preventScroll:true});
  }

  for (const {item, received, button} of cafeMenu) {
    el("order-" + item).addEventListener("click", () => {
      if (!dialog.open || el("cafe-pane").hidden || !atCafeCounter() || !player.orderCafeItem(item)) return;
      syncCafeActions();
      el("order-status").textContent = received;
      (el("cafe-pane").querySelector(".cafe-menu button:enabled") || el("leave-counter")).focus({preventScroll:true});
    });
    button.addEventListener("click", () => consumeCafeItem(item));
  }
  el("leave-counter").addEventListener("click", () => dialog.close());

  let libraryRequest = 0;
  function renderRecords() {
    const request = ++libraryRequest;
    const filters = {
      query: el("query").value, space: localCollection || fields.space.value,
      type:fields.type.value, language:fields.language.value, year:fields.year.value
    };
    const results = catalog.searchResources(records, filters);
    const rows = document.createDocumentFragment();
    for (const record of results) {
      const row = make("li");
      const link = make("button", "resource-link");
      link.type = "button";
      link.dataset.recordId = record.id;
      link.addEventListener("click", () => openRecord(record, link));
      const copy = make("span", "resource-copy");
      copy.append(make("strong", "", record.title), make("small", "", [record.company, record.type, record.language, record.year].filter(Boolean).join(" · ")));
      link.append(copy, icon("book"), make("span", "sr", "자료 열람"));
      row.append(link);
      rows.append(row);
    }
    el("resources").replaceChildren(rows);
    el("count").textContent = "자료 " + results.length + "건";
    el("empty").hidden = results.length !== 0;
    el("product-results").hidden = true;
    el("resource-results-title").hidden = true;
    el("found-products").replaceChildren();
    if (!filters.query.trim()) return;
    if (!catalogSettled) {
      el("count").textContent += " · 제품 판본 확인 중…";
      el("empty").hidden = true;
      return;
    }
    const editions = catalog.searchResources(records, {...filters, query:""})
      .filter(record => record.id === "products-ko" || record.id === "products-en")
      .map(record => window.HLBReader.productEdition(record)).filter(Boolean);
    if (!editions.length) return;
    function showProducts(data) {
      if (request !== libraryRequest || !dialog.open || el("library-pane").hidden) return;
      const rows = document.createDocumentFragment();
      let count = 0;
      for (const {language} of editions) {
        const matches = window.HLBProductLibrary.search(data[language], filters.query);
        for (const [index, product] of matches.entries()) {
          const row = make("li");
          const button = make("button", "resource-link"); button.type = "button";
          button.dataset.productId = product.id;
          button.setAttribute("aria-haspopup", "dialog");
          const copy = make("span", "resource-copy");
          copy.append(make("strong", "", product.name), make("small", "", [...new Set([
            product.brand, product.company, language === "ko" ? "국문" : "영문"
          ].filter(Boolean))].join(" · ")));
          button.append(copy, icon("book"));
          button.addEventListener("click", () => window.HLBProductBook.open(matches, index, button, language,
            {filtered:true, backLabel:language === "en" ? "Search results" : "검색 결과"}));
          row.append(button); rows.append(row);
        }
        count += matches.length;
      }
      el("found-products").replaceChildren(rows);
      el("product-results").hidden = !count;
      el("resource-results-title").hidden = !count || !results.length;
      el("empty").hidden = Boolean(count || results.length);
      el("count").textContent = "제품 " + count + "개 · 자료 " + results.length + "건";
    }
    if (window.HLBProducts) { showProducts(window.HLBProducts); return; }
    el("empty").hidden = true;
    el("count").textContent += " · 제품 검색 중…";
    window.HLBProductLibrary.load().then(showProducts).catch(() => {
      if (request !== libraryRequest || !dialog.open || el("library-pane").hidden) return;
      const retry = make("button", "product-reset", "제품 검색 다시 시도"); retry.type = "button";
      retry.addEventListener("click", renderRecords);
      el("count").replaceChildren("자료 " + results.length + "건 · ", retry);
    });
  }

  function refreshOpenLibrary() {
    if (!dialog.open) return;
    const currentId = window.HLBReader.currentId();
    const bookLanguage = window.HLBProductBook.currentLanguage();
    if (bookLanguage) {
      const record = records.find(item => item.id === "products-" + bookLanguage);
      if (window.HLBReader.productEdition(record)) return;
      window.HLBProductBook.close();
      if (record) { openRecord(record); return; }
    }
    if (!el("library-pane").hidden) { renderRecords(); return; }
    if (!el("reader-pane").hidden && currentId) {
      const record = records.find(item => item.id === currentId);
      if (!record) { window.HLBReader.clear(); openLibrary(); return; }
      if (currentId.startsWith("products-") && !window.HLBReader.productEdition(record)) openRecord(record,returnRow);
    }
  }

  async function openSharedLink() {
    const hash = location.hash;
    const route = window.HLBProductLibrary.readRoute(hash);
    if (!route) return false;
    if (!catalogSettled) {
      await catalogReady;
      if (location.hash !== hash) return false;
    }
    const id = route.type === "product" ? "products-" + route.language : route.id;
    const record = records.find(item => item.id === id);
    window.HLBProductBook.close();
    if (!record) {
      openLibrary(); el("library-desc").textContent = "공유된 자료가 목록에서 내려갔습니다. 다른 자료를 검색해 주세요.";
      return true;
    }
    if (route.type === "resource") { openRecord(record, null, {attachment:route.attachment}); return true; }
    const edition = window.HLBReader.productEdition(record);
    if (!edition) { openRecord(record); return true; }
    openRecord(record, null, {attachment:edition.attachment, productList:true});
    try {
      const data = await window.HLBProductLibrary.load();
      if (location.hash !== hash || !dialog.open || el("reader-pane").hidden || window.HLBReader.currentId() !== id) return true;
      const current = records.find(item => item.id === id);
      if (!window.HLBReader.productEdition(current)) { refreshOpenLibrary(); return true; }
      const products = data[route.language];
      const product = window.HLBProductLibrary.resolveProduct(products, route);
      if (product) {
        const opener = Array.from(el("reader-body").querySelectorAll(".product-row")).find(button => button.dataset.productId === product.id);
        opener?.scrollIntoView({block:"nearest"});
        window.HLBProductBook.open(products, products.indexOf(product), opener || el("reader-text-mode"), route.language);
      } else {
        el("reader-body").prepend(make("p","media-note","공유된 제품이 현재 도감에 없습니다. 아래 목록에서 다른 제품을 찾아보세요."));
      }
    } catch {
      // The directory displays its own retry control when the data file is unavailable.
    }
    return true;
  }
  window.addEventListener("hashchange", () => { if (window.HLBProductLibrary.readRoute(location.hash)) openSharedLink(); });

  function refreshLibraryFilters() {
    archiveSpaces.clear();
    for (const record of records) archiveSpaces.add(record.space);
    const sync=catalog.getSyncState();
    el("catalog-status").textContent=sync.updatedAt
      ? "노션 자료 반영 · "+new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Seoul"}).format(new Date(sync.updatedAt))+(sync.status==="cached"?" · 저장된 자료":"")
      : "저장된 전시 자료를 표시하고 있습니다.";
    const defaults = {space:"모든 공간",type:"모든 유형",language:"모든 언어",year:"모든 연도"};
    for (const [name, select] of Object.entries(fields)) {
      const selected = select.value;
      select.replaceChildren();
      select.add(new Option(defaults[name], ""));
      if (name === "space") {
        for (const space of spaces.values()) if (archiveSpaces.has(space.id)) select.add(new Option(space.title, space.id));
      } else {
        const values = [...new Set(records.map(record => record[name]).filter(Boolean))];
        if (name === "year") values.sort((a,b) => b-a);
        else values.sort((a,b) => a.localeCompare(b,"ko"));
        for (const value of values) select.add(new Option(value + (name === "year" ? "년" : ""), String(value)));
      }
      if (selected && [...select.options].some(option => option.value === selected)) select.value = selected;
    }
  }

  function prepareLibrary() {
    refreshLibraryFilters();
    for (const select of Object.values(fields)) select.addEventListener("change", renderRecords);
    el("query").addEventListener("input", renderRecords);
    el("clear-filters").addEventListener("click", () => { resetFilters(); renderRecords(); el("query").focus(); });
    for (const space of spaces.values()) {
      const button = make("button", "guide-row");
      button.type = "button";
      if (["cafe","history"].includes(space.id)) { button.id = "visit-"+space.id; button.disabled = true; }
      const copy = make("span", "guide-copy");
      copy.append(make("strong", "", space.title), make("small", "", space.subtitle));
      button.append(icon(space.id === "cafe" ? "coffee" : "pin"), copy, icon("arrow"));
      button.addEventListener("click", () => {
        const hall = bySpace.get(space.id);
        if (!hall || !player) { openLibrary(space.id); return; }
        walkToStop(hall);
      });
      el("guide-list").append(button);
    }
    const warpButton = make("button", "guide-row");
    warpButton.type = "button";
    warpButton.id = "visit-warp";
    warpButton.disabled = true;
    const warpCopy = make("span", "guide-copy");
    warpCopy.append(make("strong", "", "포탈"), make("small", "", "입구 왼쪽 · 다른 공간으로 떠나기"));
    warpButton.append(icon("warp"), warpCopy, icon("arrow"));
    warpButton.addEventListener("click", () => {
      const stop = readingStops.find(item => item.id === "warp");
      if (stop) walkToStop(stop);
    });
    el("guide-list").append(warpButton);
  }


  function distance(a,b) { return Math.hypot(a.x-b.x,a.z-b.z); }
  const bubble = el("lupe-bubble"), lupeCard = el("lupe-card");
  let lupeAnchor, viewWidth = 0, viewHeight = 0, menuSide = 0, cardPointer = null;
  lupeCard.addEventListener("pointerdown", event => { cardPointer = event.pointerId; });
  for (const type of ["pointerup", "pointercancel"]) window.addEventListener(type, event => {
    if (event.pointerId === cardPointer) cardPointer = null;
  });
  window.addEventListener("blur", () => { cardPointer = null; });

  function positionSceneMenu(x, y, gap) {
    // Keep a pressed button under the finger through the end of a tap or scroll.
    if (cardPointer !== null) return;
    const margin = 8;
    const right = viewWidth - margin - gap - x, left = x - gap - margin;
    const minSideWidth = 176;
    const previousRoom = menuSide === 1 ? right : left;
    if (!menuSide || previousRoom < minSideWidth) menuSide = right >= left ? 1 : -1;
    const room = menuSide === 1 ? right : left;
    const beside = room >= minSideWidth;
    const width = Math.min(294, beside ? room : viewWidth - 2 * margin);
    lupeCard.style.setProperty("--card-width", Math.floor(width) + "px");
    const height = lupeCard.offsetHeight;
    let px = beside ? (menuSide === 1 ? x + gap : x - gap - width) : x - width / 2;
    let py = beside ? y - height / 2 : (y > viewHeight / 2 ? y - gap - height : y + gap);
    px = Math.max(margin, Math.min(px, viewWidth - width - margin));
    py = Math.max(margin, Math.min(py, viewHeight - height - margin));
    lupeCard.style.setProperty("--card-x", Math.round(px) + "px");
    lupeCard.style.setProperty("--card-y", Math.round(py) + "px");
  }

  function positionLupeUI() {
    const sceneMenu = !lupeCard.hidden && lupeCard.dataset.anchor === "lupe";
    if ((!bubble.textContent && !sceneMenu) || dialog.open || portalDestination || historyFilm?.isWatching()) {
      bubble.hidden = true;
      return;
    }
    const anchor = player.getLupePosition(lupeAnchor, sceneMenu ? 0 : .5);
    let pixelsPerMetre = 0;
    if (anchor) {
      // The renderer has just updated both the camera and the passenger's world matrix.
      anchor.applyMatrix4(camera.matrixWorldInverse);
      pixelsPerMetre = .5 * viewHeight * camera.projectionMatrix.elements[5] / -anchor.z;
      anchor.applyMatrix4(camera.projectionMatrix);
    }
    if (!anchor || pixelsPerMetre <= 0 || Math.abs(anchor.x) > 1 || Math.abs(anchor.y) > 1 || Math.abs(anchor.z) > 1) {
      bubble.hidden = true;
      if (sceneMenu) guide.dismiss();
      return;
    }
    const x = (anchor.x + 1) * viewWidth / 2, y = (1 - anchor.y) * viewHeight / 2;
    if (sceneMenu) {
      bubble.hidden = true;
      const radius = player.isRiding() ? .27 : .54;
      positionSceneMenu(x, y, 8 + Math.min(72, pixelsPerMetre * radius));
      return;
    }
    bubble.hidden = false;
    const w = bubble.offsetWidth, h = bubble.offsetHeight, margin = 8;
    const left = Math.max(margin, Math.min(x - w / 2, viewWidth - margin - w));
    const below = y - h - 11 < margin;
    const top = below ? y + 11 : y - h - 11;
    bubble.classList.toggle("below",below);
    bubble.style.transform = "translate3d(" + Math.round(left) + "px," + Math.round(top) + "px,0)";
    bubble.style.setProperty("--tip-x", Math.round(Math.max(10, Math.min(w - 10, x - left))) + "px");
  }

  function updateStatus() {
    if (!world || !player) return;
    if(portalDestination || historyFilm?.isWatching())return;
    syncCafeActions();
    const p = player.getPosition();
    const inside = world.spaces.find(({interior}) => interior && world.containsPoint(interior,p));
    historyFilm?.setPresent(inside?.id==="history" && !dialog.open);
    const rideState=yacht.getState(), busy=rideState.busy;
    const locked=busy && rideState.phase!=="walking";
    const dock=busy?null:yacht.nearby();
    el("ride-yacht").hidden=dock===null || Boolean(inside);
    el("yacht-status").hidden=!locked;
    const rideMessage=locked?rideState.message:"";
    if (el("yacht-status").textContent!==rideMessage) el("yacht-status").textContent=rideMessage;
    el("experience").classList.toggle("riding-yacht",locked);
    for (const id of ["open-guide","open-search","open-help","overview","jump","firework","drink-coffee","eat-bread"]) {
      el(id).disabled=locked || (["drink-coffee","eat-bread"].includes(id) && Boolean(player.getCafeState().consuming));
    }
    overview.hidden = Boolean(inside);
    overview.setAttribute("aria-pressed", String(player.isOverview()));
    const eligible = readingStops.filter(stop => !stop.indoorOnly || inside?.id === stop.spaceId);
    const nearest = eligible.reduce((a,b) => distance(p,a.station) < distance(p,b.station) ? a : b);
    const nearDistance = distance(p, nearest.station);
    const previous = station;
    station = !busy && nearDistance <= nearest.radius ? nearest : null;
    if (station && station.id !== previous?.id) el("announcement").textContent = station.title + "에 도착했습니다.";
    if (destination && distance(p, destination.station) < .12) {
      if (destination.lookAt) player.facePoint(destination.lookAt);
      const arrived = destination.inspectOnArrival ? destination : null;
      const guided = destination.withLupe;
      destination = null;
      player.setGuideTarget(null);
      if (guided) guide.arrived();
      if (arrived?.spaceId === "cafe") openCafe();
      else if (arrived?.id === "history-book") openHistoryBook();
      else if (arrived?.id === "history-film") beginHistoryWatch();
      else if (arrived?.id === "warp") openPane("warp", "포탈 · 목적지 선택");
      else if (arrived?.record) openRecord(arrived.record);
    }
    const district = world.district;
    const inDistrict = district && p.x >= district.minX && p.x <= district.maxX && p.z >= district.minZ && p.z <= district.maxZ;
    const inPlaza=world.plaza && distance(p,world.plaza)<world.plaza.radius;
    const nearby = locked ? "블랙캣 항공 투어" : inside ? spaces.get(inside.id).title : inPlaza ? world.plaza.title : inDistrict ? district.title : nearDistance < 7 ? (spaces.get(nearest.spaceId)?.title || nearest.title) : "칼데라 광장";
    el("gallery-guide").hidden = busy || inside?.id !== "cologne" || station?.id === "cologne";
    if (el("location-name").textContent !== nearby) el("location-name").textContent = nearby;
    const label = station?.action || "";
    if (label !== lastActionLabel) {
      el("interact").querySelector("span").textContent = label;
      el("interact").querySelector("use").setAttribute("href", station?.id === "warp" ? "#warp-icon" : station?.spaceId === "cafe" ? "#coffee-icon" : "#book-icon");
      lastActionLabel = label;
    }
    el("interact").hidden = !station;
    if (destination) {
      const status = destination.title + "까지 " + Math.ceil(distance(p,destination.station)) + " m";
      if (el("travel-text").textContent !== status) el("travel-text").textContent = status;
    }
    if (rideState.phase==="walking") el("travel-text").textContent=rideState.message;
    el("travel").hidden = !destination && rideState.phase!=="walking";
    hasWalked ||= distance(p,world.spawn) > 2;
    el("hint").hidden = Boolean(station || destination || hasWalked || dock!==null || busy);
    guide.tick(inside?.id);
  }

  function renderFrame(now) {
    frame = 0;
    if (document.hidden || warpTravel.isOpen() || !renderer || renderer.getContext().isContextLost()) return;
    const dt = previousTime ? Math.min(.08,(now-previousTime)/1000) : 1/60;
    previousTime = now;
    if (!dialog.open) {
      world.update(dt, stillScenery.matches);
      yacht.update(dt, stillScenery.matches);
      if(!historyFilm?.isWatching())player.update(dt);
      historyFilm?.update();
      fireworks.update(dt);
      if (now-lastStatusTime > 90) { updateStatus(); lastStatusTime=now; }
    }
    renderer.render(scene,camera);
    positionLupeUI();
    if (!frame && !dialog.open && !warpTravel.isOpen()) frame=requestAnimationFrame(renderFrame);
  }

  function resumeRendering() {
    if (renderer && player && !frame && !document.hidden && !warpTravel.isOpen()) { previousTime=0; frame=requestAnimationFrame(renderFrame); }
  }

  function resize() {
    if (!renderer) return;
    const width=canvas.clientWidth, height=canvas.clientHeight;
    viewWidth=width; viewHeight=height;
    renderer.setSize(width,height,false);
    camera.aspect = width / Math.max(height,1);
    camera.updateProjectionMatrix();
    resumeRendering();
  }

  const stick = el("stick"), thumb = stick.querySelector(".stick-thumb");
  let stickPointer = null;
  function resetStick() {
    if (stickPointer !== null && stick.hasPointerCapture(stickPointer)) stick.releasePointerCapture(stickPointer);
    stickPointer = null;
    thumb.style.transform="";
    player?.setStick(0,0);
  }
  function readStick(event) {
    const rect=stick.getBoundingClientRect(), radius=rect.width*.34;
    let x=(event.clientX-rect.left-rect.width/2)/radius, y=(event.clientY-rect.top-rect.height/2)/radius;
    const scale=Math.max(1,Math.hypot(x,y)); x/=scale; y/=scale;
    thumb.style.transform="translate("+x*radius+"px,"+y*radius+"px)";
    player.setStick(x,-y);
  }
  stick.addEventListener("pointerdown",event=>{
    if (!player || stickPointer !== null) return;
    if (yacht?.getState().busy && yacht.getState().phase!=="walking") return;
    yacht?.cancelApproach();
    event.preventDefault();
    interruptWalk();
    stickPointer=event.pointerId; stick.setPointerCapture(stickPointer); readStick(event);
  });
  stick.addEventListener("pointermove",event=>{ if(event.pointerId===stickPointer) readStick(event); });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]) stick.addEventListener(type,event=>{if(event.pointerId===stickPointer) resetStick();});

  el("open-guide").addEventListener("click",()=>openPane("guide","공간 안내"));
  el("gallery-guide").addEventListener("click",openGallery);
  el("open-search").addEventListener("click",()=>openLibrary());
  el("open-help").addEventListener("click",()=>openPane("help","조작 방법"));
  el("release-version").textContent = "v" + window.HLBRelease.version;
  for (const change of window.HLBRelease.changes) el("release-changes").append(make("li","",change));
  el("close-panel").addEventListener("click",()=>dialog.close());
  function backToList() {
    if (!returnRow) { dialog.close(); return; }
    window.HLBReader.clear();
    openPane("library",localCollection ? spaces.get(localCollection).title+" 열람대" : "자료·제품 통합 검색");
    dialog.scrollTop=listScroll;
    returnRow?.focus({preventScroll:true});
    returnRow=null;
  }
  el("reader-back").addEventListener("click",backToList);
  dialog.addEventListener("keydown",e=>{
    if (e.key==="Escape" && !e.isComposing && !el("reader-pane").hidden) {
      e.preventDefault(); backToList();
    }
  });
  dialog.addEventListener("cancel",e=>{
    if (!el("reader-pane").hidden) { e.preventDefault(); backToList(); }
  });
  dialog.addEventListener("click",e=>{ if(e.target===dialog) {
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) dialog.close();
  } });
  dialog.addEventListener("close",()=>{
    window.HLBReader.clear();
    historyBook.close();
    returnRow=null;
    if (portalDestination) return;
    player?.setActive(!document.hidden && !historyFilm?.isWatching());
    historyFilm?.setPresent(inHistoryHall() && !document.hidden);
    resumeRendering();
    if(player) canvas.focus({preventScroll:true});
  });
  el("interact").addEventListener("click",interact);
  function rideYacht() {
    if (!player || yacht?.getState().busy || dialog.open || document.hidden || historyFilm?.isWatching()) return;
    const source=yacht.nearby();
    if (source===null) {
      el("announcement").textContent="블랙캣 정박소 가까이에서 이용해 주세요.";
      return;
    }
    el("yacht-departure").textContent="출발 · "+world.yachtDocks[source].title+" 정박소";
    const choices=el("yacht-destinations");
    choices.replaceChildren();
    world.yachtDocks.forEach((dock,index)=>{
      if (index===source) return;
      const button=make("button","guide-row");
      button.type="button";
      const label=make("span","guide-copy");
      label.append(make("strong","",dock.title));
      button.append(icon("pin"),label,icon("arrow"));
      button.addEventListener("click",()=>{
        if (!dialog.open || document.hidden) return;
        dialog.close();
        player.setActive(true);
        if (yacht.nearby()!==source || !yacht.request(source,index)) {
          el("announcement").textContent="정박소에 가까이 와서 다시 선택해 주세요.";
        }
        updateStatus();
      });
      choices.append(button);
    });
    openPane("yacht","블랙캣 목적지 선택");
    choices.querySelector("button")?.focus({preventScroll:true});
  }
  el("ride-yacht").addEventListener("click",rideYacht);
  function playAction(action) {
    if (!player || yacht?.getState().busy || dialog.open || document.hidden || el("play-actions").hidden || historyFilm?.isWatching()) return;
    if (action === "jump") player.jump();
    else if (action === "firework") fireworks.launch(player.getPosition(), stillScenery.matches);
  }
  for (const action of ["jump", "firework"]) {
    el(action).addEventListener("click", event => {
      playAction(action);
      if (event.detail > 0) canvas.focus({preventScroll:true});
    });
  }
  el("cancel-travel").addEventListener("click",()=>{
    if (portalDestination) { finishPortalJourney("포탈 이동을 취소했습니다."); return; }
    interruptWalk();
    yacht?.cancelApproach();
    player?.setActive(false); player?.setActive(true);
    updateStatus(); canvas.focus({preventScroll:true});
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden && portalDestination && !warpTravel.isOpen()) finishPortalJourney("포탈 이동을 취소했습니다.");
    if(document.hidden) { cancelAnimationFrame(frame); frame=0; interruptWalk(); guide.dismiss(); yacht?.cancelApproach(); resetStick(); player?.setActive(false); }
    else { player?.setActive(!dialog.open && !warpTravel.isOpen() && !historyFilm?.isWatching()); resumeRendering(); }
    historyFilm?.setPresent(inHistoryHall() && !document.hidden && !dialog.open);
  });
  el("retry").addEventListener("click",()=>location.reload());
  el("fallback-search").addEventListener("click",()=>openLibrary());
  function showError(message) {
    guide.disable();
    if (portalDestination) {
      if (!warpTravel.close()) finishPortalJourney("포탈 이동이 중단되었습니다.");
    }
    el("loading").hidden=true;
    el("no-graphics").hidden=false;
    el("graphics-reason").textContent=message;
    el("hint").hidden=true;
    stick.hidden=true;
    el("play-actions").hidden=true;
    el("day-night").hidden=true;
    overview.hidden=true;
    el("ride-yacht").hidden=true;
    el("yacht-status").hidden=true;
    if (el("visit-cafe")) el("visit-cafe").disabled=true;
    if (el("visit-warp")) el("visit-warp").disabled=true;
    if (el("visit-history")) el("visit-history").disabled=true;
    if(historyFilm?.isWatching()) {
      historyFilm.endWatch();music.setSuspended(false);el("experience").classList.remove("history-watching");el("history-watch").hidden=true;
    }
    historyFilm?.setPresent(false);
    player?.setActive(false);
  }

  function openInitialLink() {
    if (/^#\/(product|resource)\//.test(location.hash)) { openSharedLink(); return; }
    if (location.hash === "#/products") {
      openLibrary("product");
      el("resources").querySelector('[data-record-id="products-ko"]')?.click();
    }
    if (location.hash.startsWith("#/library")) {
      const params=new URLSearchParams(location.hash.split("?")[1]);
      openLibrary(spaces.has(params.get("space")) ? params.get("space") : "");
      el("query").value=params.get("query") || "";
      for(const [name,select] of Object.entries(fields)) if(params.has(name)) select.value=params.get(name);
      renderRecords();
    }
  }

  async function start() {
    records=catalog.getInitialResources();
    prepareLibrary();
    const initialHash=location.hash;
    catalogReady=catalog.loadResources().then(latest=>{
      const previousRecords=records;
      records=latest;
      catalogSettled=true;
      refreshLibraryFilters();
      for (const stop of readingStops) if (stop.record) stop.record=records.find(record=>record.id===stop.id);
      refreshOpenLibrary(previousRecords);
      if (initialHash && location.hash===initialHash) openInitialLink();
    }).catch(error=>{
      catalogSettled=true;
      console.error("전시 자료를 갱신하지 못했습니다.",error);
    });
    const T=window.THREE;
    if (!T || !window.HLBWorld3D || !window.HLBPlayer3D) throw new Error("missing 3D resources");
    try {
      renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
    } catch (error) {
      showError("브라우저의 그래픽 가속을 켜고 다시 열어주세요. 자료 검색도 이용할 수 있습니다.");
      if (visitId === "cologne" && !initialHash) openLibrary(visitId);
      console.error(error); return;
    }
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.02;
    scene=new T.Scene();
    camera=new T.PerspectiveCamera(56,1,.06,300);
    lupeAnchor=new T.Vector3();
    world=window.HLBWorld3D.build(scene);
    timeOfDay=window.HLBTimeOfDay.create(scene, world.lavaLights);
    let time = "day";
    try { if (localStorage.getItem("hlb-universe-time") === "night") time = "night"; } catch {}
    setTime(time);
    el("day-night").hidden=false;
    for (const hall of world.spaces) {
      const space = spaces.get(hall.id);
      bySpace.set(hall.id, {...hall, title:space.title});
      if (hall.id === "cafe") {
        const counter = hall.exhibits.find(exhibit => exhibit.id === "cafe-counter");
        readingStops.push({...counter, spaceId:hall.id, action:"카페 주문하기", radius:cafeCounterRadius, indoorOnly:true});
        continue;
      }
      if(hall.id==="history") {
        for(const exhibit of hall.exhibits) readingStops.push({...exhibit,spaceId:"history",indoorOnly:true,
          action:exhibit.id==="history-book"?"역사보기":"시청하기",radius:1.7});
        continue;
      }
      const gallery = Boolean(hall.exhibits?.length);
      readingStops.push({
        id:hall.id, spaceId:hall.id, title:space.title, station:hall.station,
        action:space.title + (gallery ? " 전시 안내" : " 자료 보기"),
        radius:gallery ? 1.85 : 2.65, indoorOnly:gallery
      });
      for (const exhibit of hall.exhibits || []) {
        const record = records.find(item => item.id === exhibit.id);
        if (record) readingStops.push({...exhibit, record, spaceId:hall.id, action:exhibit.title+" 살펴보기", radius:2, indoorOnly:true});
      }
    }
    if (world.warpGate) readingStops.push({...world.warpGate, spaceId:"warp", action:"이동하기 · 포탈"});
    const arrival = ["cologne","cafe","history"].includes(visitId) ? bySpace.get(visitId) : ["portal","warp"].includes(visitId) ? world.warpGate : null;
    player=window.HLBPlayer3D.create(scene,camera,canvas,world,arrival,exhibit=>{
      if (exhibit?.id === "lupe") { guide.menu("lupe"); positionLupeUI(); return; }
      yacht?.cancelApproach();
      interruptWalk();
      const stop=exhibit && readingStops.find(candidate=>candidate.id===exhibit.id);
      if (stop) walkToStop(stop, true);
    },action=>{
      if (action === "move") { interruptWalk();yacht?.cancelApproach(); }
      else if (action === "interact") interact();
      else if (action === "eat-bread") consumeCafeItem("bread");
      else if (action === "drink-coffee") consumeCafeItem("coffee");
      else if (action === "ride-yacht") rideYacht();
      else playAction(action);
    });
    yacht=window.HLBYachtRide.create({scene,world,player,onChange:state=>{
      guide.setAboard(player.isRiding());
      if (state.message) el("announcement").textContent=state.message;
    }});
    fireworks=window.HLBFireworks.create(scene, camera, canvas, {
      onBurst: phrase => { el("announcement").textContent = phrase; }
    });
    historyFilm=window.HLBHistoryFilm.create({hall:bySpace.get("history"),camera,onState:state=>{
      el("history-video-status").textContent=state.message;
      el("history-video-message").hidden=!state.message;
      el("retry-history-video").hidden=!state.failed;
    }});
    player.setActive(!dialog.open);
    el("visit-cafe").disabled=false;
    el("visit-warp").disabled=!world.warpGate;
    el("visit-history").disabled=false;
    resize();
    new ResizeObserver(resize).observe(canvas);
    canvas.addEventListener("webglcontextlost",event=>{
      event.preventDefault(); cancelAnimationFrame(frame); frame=0; player.setActive(false);
      fireworks.dispose();
      showError("그래픽 연결이 끊겼습니다. ‘다시 시도’를 눌러 HLB 유니버스에 입장하세요.");
    });
    el("loading").hidden=true;
    el("play-actions").hidden=false;
    guide.enter(!initialHash);
    updateStatus();
  }
  start().catch(error=>{
    console.error("HLB 유니버스 초기화 실패",error);
    showError("HLB 유니버스 파일을 불러오지 못했습니다. 새로고침하거나 자료 검색을 열어주세요.");
  });
})();
