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
  let world, player, renderer, camera, scene, fireworks, timeOfDay, yacht;
  let station = null, destination = null, localCollection = "";
  let returnRow = null, listScroll = 0;
  const stillScenery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0, previousTime = 0, lastStatusTime = 0;
  let lastActionLabel = "", hasWalked = false;
  const bySpace = new Map();
  const readingStops = [];
  const cafeCounterRadius = 1.8;
  const archiveSpaces = new Set();
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
  const warpTravel = window.HLBWarpTravel.create({
    onDepart: () => music.setSuspended(true),
    onReturn: () => {
      music.setSuspended(false);
      if (dialog.open) dialog.close();
      el("announcement").textContent = "HLB 온라인 체험관의 워프로 돌아왔습니다.";
    }
  });
  warpTravel.renderList(el("warp-destinations"));
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
    if (yacht?.getState().busy && yacht.getState().phase !== "walking") return;
    yacht?.cancelApproach();
    setSoundPanel(false);
    player?.setActive(false);
    resetStick();
    destination = null;
    el("travel").hidden = true;
    for (const pane of ["guide", "gallery", "cafe", "library", "help", "reader", "warp"]) el(pane + "-pane").hidden = pane !== name;
    const reading=name==="reader";
    dialog.classList.toggle("reading",reading);
    dialog.classList.toggle("cafe-order",name==="cafe");
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
    el("library-desc").textContent = space ? space.description : "HLB그룹의 자료를 찾아 이곳에서 열람하세요.";
    openPane("library", space ? space.title + " 열람대" : "자료 검색");
    renderRecords();
  }

  function openRecord(record, row = null) {
    returnRow = row;
    listScroll = dialog.scrollTop;
    openPane("reader", record.title);
    el("reader-back").textContent = row ? "← 자료 목록" : "← 전시장";
    window.HLBReader.open(record, spaces.get(record.space).title);
  }

  function walkToStop(stop, inspectOnArrival = false) {
    if (yacht?.getState().busy) return;
    if (dialog.open) dialog.close();
    player.setActive(true);
    if (player.walkTo(stop.station)) {
      destination = {...stop, inspectOnArrival};
      el("announcement").textContent = stop.title + "까지 이동합니다.";
    } else {
      el("announcement").textContent = "길을 찾지 못했습니다. 캐릭터를 직접 움직여 보세요.";
    }
    updateStatus();
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
    if (yacht?.getState().busy) return;
    if (!station) return;
    if (station.id === "warp") openPane("warp", "워프 · 목적지 선택");
    else if (station.spaceId === "cafe") openCafe();
    else if (station.record) openRecord(station.record);
    else if (station.spaceId === "cologne") openGallery();
    else openLibrary(station.spaceId);
  }

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
    if (!player || yacht?.getState().busy || dialog.open || document.hidden) return;
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

  function renderRecords() {
    const results = catalog.searchResources(records, {
      query: el("query").value, space: localCollection || fields.space.value,
      type:fields.type.value, language:fields.language.value, year:fields.year.value
    });
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
  }

  function prepareLibrary() {
    const sync=catalog.getSyncState();
    el("catalog-status").textContent=sync.updatedAt
      ? "노션 자료 반영 · "+new Intl.DateTimeFormat("ko-KR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Seoul"}).format(new Date(sync.updatedAt))+(sync.status==="cached"?" · 저장된 자료":"")
      : "저장된 전시 자료를 표시하고 있습니다.";
    const defaults = {space:"모든 공간",type:"모든 유형",language:"모든 언어",year:"모든 연도"};
    for (const [name, select] of Object.entries(fields)) {
      select.add(new Option(defaults[name], ""));
      if (name === "space") {
        for (const space of spaces.values()) if (archiveSpaces.has(space.id)) select.add(new Option(space.title, space.id));
      } else {
        const values = [...new Set(records.map(record => record[name]).filter(Boolean))];
        if (name === "year") values.sort((a,b) => b-a);
        else values.sort((a,b) => a.localeCompare(b,"ko"));
        for (const value of values) select.add(new Option(value + (name === "year" ? "년" : ""), String(value)));
      }
      select.addEventListener("change", renderRecords);
    }
    el("query").addEventListener("input", renderRecords);
    el("clear-filters").addEventListener("click", () => { resetFilters(); renderRecords(); el("query").focus(); });
    for (const space of spaces.values()) {
      const button = make("button", "guide-row");
      button.type = "button";
      if (space.id === "cafe") { button.id = "visit-cafe"; button.disabled = true; }
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
    warpCopy.append(make("strong", "", "워프"), make("small", "", "입구 왼쪽 · 다른 공간으로 떠나기"));
    warpButton.append(icon("warp"), warpCopy, icon("arrow"));
    warpButton.addEventListener("click", () => {
      const stop = readingStops.find(item => item.id === "warp");
      if (stop) walkToStop(stop);
    });
    el("guide-list").append(warpButton);
  }


  function distance(a,b) { return Math.hypot(a.x-b.x,a.z-b.z); }

  function updateStatus() {
    if (!world || !player) return;
    syncCafeActions();
    const p = player.getPosition();
    const inside = world.spaces.find(({interior}) => interior && world.containsPoint(interior,p));
    const rideState=yacht.getState(), busy=rideState.busy;
    const locked=busy && rideState.phase!=="walking";
    const dock=busy?null:yacht.nearby();
    el("ride-yacht").hidden=dock===null || inside?.id==="group";
    const rideDestination=dock===0?"그룹안내소로":"입구로";
    if (dock!==null && el("ride-destination").textContent!==rideDestination) el("ride-destination").textContent=rideDestination;
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
      destination = null;
      if (arrived?.spaceId === "cafe") openCafe();
      else if (arrived?.id === "warp") openPane("warp", "워프 · 목적지 선택");
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
  }

  function renderFrame(now) {
    frame = 0;
    if (document.hidden || !renderer || renderer.getContext().isContextLost()) return;
    const dt = previousTime ? Math.min(.08,(now-previousTime)/1000) : 1/60;
    previousTime = now;
    if (!dialog.open) {
      world.update(dt, stillScenery.matches);
      yacht.update(dt, stillScenery.matches);
      player.update(dt);
      fireworks.update(dt);
      if (now-lastStatusTime > 90) { updateStatus(); lastStatusTime=now; }
    }
    renderer.render(scene,camera);
    if (!dialog.open) frame=requestAnimationFrame(renderFrame);
  }

  function resumeRendering() {
    if (renderer && player && !frame && !document.hidden) { previousTime=0; frame=requestAnimationFrame(renderFrame); }
  }

  function resize() {
    if (!renderer) return;
    const width=canvas.clientWidth, height=canvas.clientHeight;
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
    destination=null;
    stickPointer=event.pointerId; stick.setPointerCapture(stickPointer); readStick(event);
  });
  stick.addEventListener("pointermove",event=>{ if(event.pointerId===stickPointer) readStick(event); });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]) stick.addEventListener(type,event=>{if(event.pointerId===stickPointer) resetStick();});

  el("open-guide").addEventListener("click",()=>openPane("guide","공간 안내"));
  el("gallery-guide").addEventListener("click",openGallery);
  el("open-search").addEventListener("click",()=>openLibrary());
  el("open-help").addEventListener("click",()=>openPane("help","조작 방법"));
  el("close-panel").addEventListener("click",()=>dialog.close());
  function backToList() {
    if (!returnRow) { dialog.close(); return; }
    window.HLBReader.clear();
    openPane("library",localCollection ? spaces.get(localCollection).title+" 열람대" : "자료 검색");
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
    returnRow=null;
    player?.setActive(!document.hidden);
    resumeRendering();
    if(player) canvas.focus({preventScroll:true});
  });
  el("interact").addEventListener("click",interact);
  function rideYacht() {
    if (!player || yacht?.getState().busy || dialog.open || document.hidden) return;
    const dock=yacht?.nearby();
    if (dock===null || dock===undefined) {
      el("announcement").textContent="블랙캣 탑승장이나 그룹안내소에서 이동할 수 있어요.";
      return;
    }
    destination=null;
    resetStick();
    if (!yacht.request(dock)) el("announcement").textContent="탑승장으로 조금 더 가까이 와 주세요.";
    updateStatus();canvas.focus({preventScroll:true});
  }
  el("ride-yacht").addEventListener("click",rideYacht);
  function playAction(action) {
    if (!player || yacht?.getState().busy || dialog.open || document.hidden || el("play-actions").hidden) return;
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
    destination=null;
    yacht?.cancelApproach();
    player?.setActive(false); player?.setActive(true);
    updateStatus(); canvas.focus({preventScroll:true});
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden) { cancelAnimationFrame(frame); frame=0; destination=null; yacht?.cancelApproach(); resetStick(); player?.setActive(false); }
    else { player?.setActive(!dialog.open); resumeRendering(); }
  });
  el("retry").addEventListener("click",()=>location.reload());
  el("fallback-search").addEventListener("click",()=>openLibrary());
  function showError(message) {
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
  }

  async function start() {
    records=await catalog.loadResources();
    for (const record of records) archiveSpaces.add(record.space);
    prepareLibrary();
    if (location.hash === "#/products") {
      openLibrary("product");
      el("resources").querySelector('[data-record-id="products-ko"]')?.click();
    }
    const T=window.THREE;
    if (!T || !window.HLBWorld3D || !window.HLBPlayer3D) throw new Error("missing 3D resources");
    try {
      renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
    } catch (error) {
      showError("브라우저의 그래픽 가속을 켜고 다시 열어주세요. 자료 검색도 이용할 수 있습니다.");
      if (visitId === "cologne") openLibrary(visitId);
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
    if (world.warpGate) readingStops.push({...world.warpGate, spaceId:"warp", action:"이동하기 · 워프"});
    const arrival = ["cologne","cafe"].includes(visitId) ? bySpace.get(visitId) : visitId === "warp" ? world.warpGate : null;
    player=window.HLBPlayer3D.create(scene,camera,canvas,world,arrival,exhibit=>{
      yacht?.cancelApproach();
      destination=null;
      const stop=exhibit && readingStops.find(candidate=>candidate.id===exhibit.id);
      if (stop) walkToStop(stop, true);
    },action=>{
      if (action === "move") { destination=null;yacht?.cancelApproach(); }
      else if (action === "interact") interact();
      else if (action === "eat-bread") consumeCafeItem("bread");
      else if (action === "drink-coffee") consumeCafeItem("coffee");
      else if (action === "ride-yacht") rideYacht();
      else playAction(action);
    });
    yacht=window.HLBYachtRide.create({scene,world,player,onChange:state=>{
      if (state.message) el("announcement").textContent=state.message;
    }});
    fireworks=window.HLBFireworks.create(scene, camera, canvas, {
      onBurst: phrase => { el("announcement").textContent = phrase; }
    });
    player.setActive(!dialog.open);
    el("visit-cafe").disabled=false;
    el("visit-warp").disabled=!world.warpGate;
    resize();
    new ResizeObserver(resize).observe(canvas);
    canvas.addEventListener("webglcontextlost",event=>{
      event.preventDefault(); cancelAnimationFrame(frame); frame=0; player.setActive(false);
      fireworks.dispose();
      showError("그래픽 연결이 끊겼습니다. ‘다시 시도’를 눌러 HLB 유니버스에 입장하세요.");
    });
    el("loading").hidden=true;
    el("play-actions").hidden=false;
    updateStatus();
    // Retain existing bookmarks to a specific collection.
    if (location.hash.startsWith("#/library")) {
      const params=new URLSearchParams(location.hash.split("?")[1]);
      openLibrary(spaces.has(params.get("space")) ? params.get("space") : "");
      el("query").value=params.get("query") || "";
      for(const [name,select] of Object.entries(fields)) if(params.has(name)) select.value=params.get(name);
      renderRecords();
    }
  }
  start().catch(error=>{
    console.error("HLB 유니버스 초기화 실패",error);
    showError("HLB 유니버스 파일을 불러오지 못했습니다. 새로고침하거나 자료 검색을 열어주세요.");
  });
})();
