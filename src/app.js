(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const canvas = el("world");
  const dialog = el("panel");
  const catalog = window.HLBCatalog;
  const spaces = new Map(catalog.spaces.map(space => [space.id, space]));
  const fields = {space:el("space-filter"), type:el("type-filter"), language:el("language-filter"), year:el("year-filter")};
  let records = [];
  let world, player, renderer, camera, scene;
  let station = null, destination = null, localCollection = "";
  let returnRow = null, listScroll = 0;
  const stillScenery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0, previousTime = 0, lastStatusTime = 0;
  let lastActionLabel = "", hasWalked = false;
  const bySpace = new Map();
  const readingStops = [];
  const visitId = new URLSearchParams(location.search).get("visit");

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
    player?.setActive(false);
    resetStick();
    destination = null;
    el("travel").hidden = true;
    for (const pane of ["guide", "gallery", "library", "help", "reader"]) el(pane + "-pane").hidden = pane !== name;
    const reading=name==="reader";
    dialog.classList.toggle("reading",reading);
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
    if (!station) return;
    if (station.record) openRecord(station.record);
    else if (station.spaceId === "cologne") openGallery();
    else openLibrary(station.spaceId);
  }

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
    const defaults = {space:"모든 공간",type:"모든 유형",language:"모든 언어",year:"모든 연도"};
    for (const [name, select] of Object.entries(fields)) {
      select.add(new Option(defaults[name], ""));
      if (name === "space") {
        for (const space of spaces.values()) select.add(new Option(space.title, space.id));
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
      const copy = make("span", "guide-copy");
      copy.append(make("strong", "", space.title), make("small", "", space.subtitle));
      button.append(icon("pin"), copy, icon("arrow"));
      button.addEventListener("click", () => {
        const hall = bySpace.get(space.id);
        if (!hall || !player) { openLibrary(space.id); return; }
        walkToStop(hall);
      });
      el("guide-list").append(button);
    }
  }

  function lightWorld() {
    const T = window.THREE;
    scene.background = new T.Color(0xe6b29e);
    scene.fog = new T.FogExp2(0xe5b6aa, .0053);
    const sky = new T.Mesh(new T.SphereGeometry(195,32,16), new T.ShaderMaterial({
      side:T.BackSide, depthWrite:false, fog:false,
      uniforms:{
        top:{value:new T.Color(0x7f8cae)}, bottom:{value:new T.Color(0xf4caba)},
        sun:{value:new T.Vector3(-.56,.72,.37).normalize()}
      },
      vertexShader:"varying vec3 dir; void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:[
        "varying vec3 dir; uniform vec3 top; uniform vec3 bottom; uniform vec3 sun;",
        "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
        "float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
        "return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}",
        "void main(){vec3 d=normalize(dir);float h=smoothstep(-.04,.49,d.y);",
        "vec3 c=mix(bottom,top,pow(h,.66));float g=max(dot(d,sun),0.);",
        "vec2 p=d.xz*3.0/max(.12,d.y+.16);float w=.55*noise2(p)+.30*noise2(p*2.1)+.15*noise2(p*4.1);",
        "c=mix(c,vec3(.83,.70,.70),smoothstep(.57,.78,w)*smoothstep(.03,.21,d.y)*.44);",
        "c+=vec3(.8,.52,.25)*pow(g,65.)*.34;c=mix(c,vec3(1.0,.94,.74),smoothstep(.9994,.9998,g));",
        "gl_FragColor=vec4(c,1.0);", "#include <colorspace_fragment>", "}"
      ].join("\n")
    }));
    sky.renderOrder = -10;
    scene.add(sky);
    scene.add(new T.HemisphereLight(0xf3e9f3,0xb1867b,1.68));
    const sun = new T.DirectionalLight(0xffddd0, 2.18);
    sun.position.set(-24,42,22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-48,right:48,bottom:-45,top:45,near:.3,far:125});
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias = .032;
    sun.shadow.bias = -.00025;
    scene.add(sun);
  }

  function distance(a,b) { return Math.hypot(a.x-b.x,a.z-b.z); }

  function updateStatus() {
    if (!world || !player) return;
    const p = player.getPosition();
    const inside = world.spaces.find(({interior}) => interior && p.x >= interior.minX &&
      p.x <= interior.maxX && p.z >= interior.minZ && p.z <= interior.maxZ);
    const eligible = readingStops.filter(stop => !stop.indoorOnly || inside?.id === stop.spaceId);
    const nearest = eligible.reduce((a,b) => distance(p,a.station) < distance(p,b.station) ? a : b);
    const nearDistance = distance(p, nearest.station);
    const previous = station;
    station = nearDistance <= nearest.radius ? nearest : null;
    if (station && station.id !== previous?.id) el("announcement").textContent = station.title + "에 도착했습니다.";
    if (destination && distance(p, destination.station) < .12) {
      if (destination.lookAt) player.facePoint(destination.lookAt);
      const record = destination.inspectOnArrival && destination.record;
      destination = null;
      if (record) openRecord(record);
    }
    const nearby = inside ? spaces.get(inside.id).title : nearDistance < 7 ? spaces.get(nearest.spaceId).title : "칼데라 광장";
    el("gallery-guide").hidden = inside?.id !== "cologne" || station?.id === "cologne";
    if (el("location-name").textContent !== nearby) el("location-name").textContent = nearby;
    const label = station?.action || "";
    if (label !== lastActionLabel) {
      el("interact").querySelector("span").textContent = label;
      lastActionLabel = label;
    }
    el("interact").hidden = !station;
    if (destination) {
      const status = destination.title + "까지 " + Math.ceil(distance(p,destination.station)) + " m";
      if (el("travel-text").textContent !== status) el("travel-text").textContent = status;
    }
    el("travel").hidden = !destination;
    hasWalked ||= distance(p,world.spawn) > 2;
    el("hint").hidden = Boolean(station || destination || hasWalked);
  }

  function renderFrame(now) {
    frame = 0;
    if (document.hidden || !renderer || renderer.getContext().isContextLost()) return;
    const dt = previousTime ? Math.min(.08,(now-previousTime)/1000) : 1/60;
    previousTime = now;
    if (!dialog.open) {
      if (!stillScenery.matches) world.update?.(dt);
      player.update(dt);
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
  el("cancel-travel").addEventListener("click",()=>{
    destination=null;
    player?.setActive(false); player?.setActive(true);
    updateStatus(); canvas.focus({preventScroll:true});
  });
  document.addEventListener("keydown",e=>{
    if (dialog.open || !player || e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input,select,textarea")) return;
    if (e.code==="KeyE" && !e.repeat && station) { e.preventDefault(); interact(); }
    if (/^(Arrow(Up|Down|Left|Right)|Key[WASD])$/.test(e.code)) destination=null;
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden) { cancelAnimationFrame(frame); frame=0; destination=null; resetStick(); player?.setActive(false); }
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
  }

  async function start() {
    records=await catalog.loadResources();
    prepareLibrary();
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
    lightWorld();
    world=window.HLBWorld3D.build(scene);
    for (const hall of world.spaces) {
      const space = spaces.get(hall.id);
      bySpace.set(hall.id, {...hall, title:space.title});
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
    const arrival = visitId === "cologne" ? bySpace.get(visitId) : null;
    player=window.HLBPlayer3D.create(scene,camera,canvas,world,arrival,exhibit=>{
      destination=null;
      const stop=exhibit && readingStops.find(candidate=>candidate.id===exhibit.id);
      if (stop) walkToStop(stop, true);
    });
    player.setActive(true);
    resize();
    new ResizeObserver(resize).observe(canvas);
    canvas.addEventListener("webglcontextlost",event=>{
      event.preventDefault(); cancelAnimationFrame(frame); frame=0; player.setActive(false);
      showError("그래픽 연결이 끊겼습니다. ‘다시 시도’를 눌러 HLB 유니버스에 입장하세요.");
    });
    el("loading").hidden=true;
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
