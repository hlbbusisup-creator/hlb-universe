// The reading desk only embeds approved publications. Notion addresses remain catalog metadata.
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  let entry = null;
  let mediaURL = null;
  let closePDF = null;
  let textReady = false;
  let playingVideo = null;
  let mediaChoices = [], mediaIndex = 0, mediaSelect = null;
  function releasePDF() {
    closePDF?.();
    closePDF=null;
  }
  function releaseMedia() {
    releasePDF();
    if (playingVideo) {
      playingVideo.pause();
      playingVideo.removeAttribute("src");
      playingVideo.load();
      playingVideo=null;
    }
  }
  function node(tag, className, content) {
    const n=document.createElement(tag);
    if (className) n.className=className;
    if (content != null) n.textContent=content;
    return n;
  }
  function mediaLocation(media) {
    if (!media?.url) return null;
    let u;
    try { u=new URL(media.url, document.baseURI); } catch { return null; }
    if (u.username || u.password) return null;
    try {
      const decoded=decodeURIComponent(u.pathname);
      if (decoded.includes("\\") || decoded.split("/").includes("..")) return null;
    } catch { return null; }
    const local=new URL(".",document.baseURI);
    if (u.origin===local.origin && u.protocol===local.protocol && u.pathname.startsWith(local.pathname+"assets/reading/")) {
      const extensions={pdf:/\.pdf$/i,video:/\.(mp4|webm|ogv)$/i,image:/\.(png|jpe?g|webp|gif)$/i};
      return extensions[media.type]?.test(u.pathname) ? u : null;
    }
    if (u.protocol!=="https:" || u.port || !["embed","video"].includes(media.type)) return null;
    // Normalize only known public player routes; arbitrary pages never become frames.
    if (["youtube.com","www.youtube.com","m.youtube.com","youtu.be"].includes(u.hostname)) {
      const video=u.hostname==="youtu.be" ? u.pathname.slice(1)
        : u.pathname==="/watch" ? u.searchParams.get("v") : u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)$/)?.[1];
      if (!video || !/^[\w-]+$/.test(video)) return null;
      u=new URL("https://www.youtube-nocookie.com/embed/"+video+"?rel=0");
    }
    if (u.hostname==="drive.google.com" && /^\/file\/d\/[\w-]+\/view$/.test(u.pathname)) {
      u.pathname=u.pathname.replace(/\/view$/,"/preview");u.search="";
    }
    if (["google.com","www.google.com"].includes(u.hostname) && /^\/maps\/d\/(?:u\/\d+\/)?viewer$/.test(u.pathname)) {
      u.hostname="www.google.com";u.pathname=u.pathname.replace(/\/viewer$/,"/embed");
    }
    const providers={
      "heyzine.com": /^\/flip-book\/[a-z0-9]+\.html$/i,
      "www.youtube.com": /^\/embed\/[\w-]+$/,
      "www.youtube-nocookie.com": /^\/embed\/[\w-]+$/,
      "drive.google.com": /^\/file\/d\/[\w-]+\/preview$/,
      "www.google.com": /^\/maps\/(?:embed|d\/(?:u\/\d+\/)?embed)$/
    };
    return u.protocol==="https:" && !u.port && providers[u.hostname]?.test(u.pathname) ? u : null;
  }
  function readingEntry(record) {
    const fallback=globalThis.HLBReadingData?.[record.id] || globalThis.HLBReportReadingData?.[record.id]
      || globalThis.HLBCologneReadingData?.[record.id] || null;
    const supplied=record.reading && typeof record.reading==="object" && !Array.isArray(record.reading) ? record.reading : null;
    const result={...(supplied || fallback)};
    let sections=Array.isArray(result.sections) ? [...result.sections] : [];
    if (supplied) {
      // Synced prose is authoritative. The static product book is safe to retain
      // only when its source PDF is byte-for-byte the same published edition.
      const productSection=fallback?.sections?.find(section=>section.productLanguage);
      if (productSection) {
        sections=sections.filter(section=>!section.productLanguage);
        result.productPreview=productSection;
      }
    }
    result.sections=sections;
    const normalizeMedia=media=>media && {...media,type:media.kind || media.type,
      title:media.title || record.title || "자료"};
    result.media=normalizeMedia(result.media);
    result.attachments=(Array.isArray(result.attachments) ? result.attachments : []).map(normalizeMedia);
    return result;
  }
  function configureControls() {
    if (entry.productPreview) {
      const section=entry.productPreview;
      const hash=String(entry.media?.sha256 || "").toLowerCase();
      const source=String(globalThis.HLBProductSourceHashes?.[section.productLanguage] || "").toLowerCase();
      const sameEdition=mediaURL && /^[a-f0-9]{64}$/.test(hash) && hash===source;
      entry.sections=entry.sections.filter(part=>!part.productLanguage);
      if (sameEdition) entry.sections.push(section);
      entry.previewNotice=sameEdition ? "" : "제품별 미리보기가 없는 판본입니다. PDF에서 제품을 확인해 주세요.";
    }
    const productLanguage=entry.sections.find(section=>section.productLanguage)?.productLanguage;
    const prompt=productLanguage==="ko" ? "제품명 · 브랜드 · 설명 검색" : productLanguage==="en"
      ? "Search products, brands or descriptions" : "이 자료 안에서 찾기";
    const find=el("reader-find");
    find.value="";find.placeholder=prompt;find.setAttribute("aria-label",prompt);
    const count=entry.sections.reduce((sum,section)=>sum+(section.rows?.length || 0)+(section.items?.length || 0),0);
    el("reader-find-label").hidden=!productLanguage && (count<10 || Boolean(entry.fragrances));
    el("reader-modes").hidden=!mediaURL;
    const label=mediaURL?.hostname || "";
    el("reader-text-mode").textContent=productLanguage ? "제품 찾아보기" : entry.photo || entry.fragrances ? "제품 설명" : "자료 내용";
    el("reader-original-mode").textContent=label.includes("youtube") || label==="drive.google.com" || entry.media?.type==="video"
      ? "영상 보기" : label==="www.google.com" ? "지도 보기" : entry.media?.type==="pdf" ? "PDF 보기" : "자료 보기";
  }
  function selectMedia(index) {
    const choice=mediaChoices[index];
    mediaIndex=index;mediaURL=choice?.url || null;
    if (choice) entry.media=choice.media;
    textReady=false;el("reader-body").replaceChildren();
    configureControls();
  }
  const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g,"");
  const compactColumns = new Set(["회사 · 사업장","사업장","법인","구분","채널","브랜드","Brand","슬로건","대표 전화","팩스"]);
  function columnClass(label, index) {
    if (/^금액(?:\s|$)/.test(label)) return "col-amount";
    if (["쪽","Page","Pages"].includes(label)) return "col-page";
    if (label === "주소") return "col-address";
    if (label === "구성") return "col-part";
    if (["비전","목표","기능","카트리지 조합"].includes(label)) return "col-detail";
    return index === 0 || compactColumns.has(label) ? "col-label" : "col-text";
  }
  const tableObserver = typeof ResizeObserver === "function" ? new ResizeObserver(entries => {
    for (const {target} of entries) {
      const overflow = target.clientWidth > 0 && target.scrollWidth > target.clientWidth + 1;
      target.previousElementSibling.hidden = !overflow;
      if (overflow) target.tabIndex = 0;
      else target.removeAttribute("tabindex");
    }
  }) : null;
  function exhibitPhoto(photo) {
    const img = node("img", "exhibit-photo");
    img.src = photo.url;
    img.alt = photo.alt;
    return img;
  }

  function fragranceCollection(fragrances) {
    const section = node("section", "scent-collection");
    const heading = node("h2", "", "향 카트리지 "+fragrances.length+"종");
    const layout = node("div", "scent-layout");
    const choices = node("div", "scent-choices");
    const detail = node("section", "scent-detail");
    detail.setAttribute("aria-live", "polite");
    const families = new Map();
    const buttons = new Map();

    function select(scent) {
      for (const [code, button] of buttons) button.setAttribute("aria-pressed", String(code === scent.code));
      const tag = node("p", "scent-family", scent.family + "  /  " + scent.code);
      detail.replaceChildren(tag, node("h3", "", scent.name));
      if (scent.english && scent.english !== scent.name) {
        const english = node("p", "scent-english", scent.english);
        english.lang = "fr";
        detail.append(english);
      }
      if (scent.description) detail.append(node("p", "scent-description", scent.description));
      if (scent.notes?.length) {
        const notes = node("dl", "scent-notes");
        for (const {label,value} of scent.notes) {
          notes.append(node("dt", "", label), node("dd", "", value));
        }
        detail.append(notes);
      }
    }

    for (const scent of fragrances) {
      if (!families.has(scent.family)) {
        const group = node("fieldset", "scent-group");
        group.append(node("legend", "", scent.family));
        choices.append(group);
        families.set(scent.family, group);
      }
      const button = node("button", "scent-choice");
      button.type = "button";
      button.append(node("span", "scent-code", scent.code), " ", scent.name);
      button.addEventListener("click", () => select(scent));
      families.get(scent.family).append(button);
      buttons.set(scent.code, button);
    }
    layout.append(choices, detail);
    section.append(heading, layout);
    select(fragrances[0]);
    return section;
  }

  function productDirectory(part, searchText) {
    const language = part.productLanguage;
    const english = language === "en";
    const products = globalThis.HLBProducts?.[language] || [];
    const section = node("section", "product-directory");
    section.lang = language;
    const heading = node("header", "product-list-head");
    const count = node("span", "product-list-count");
    count.setAttribute("role", "status");
    heading.append(node("h2", "", part.heading), count);
    section.append(heading, node("p", "product-list-help", part.text));
    const labels = english ? ["Product", "Brand / Company", "Description and use", "Catalog price"] : ["제품명", "브랜드 · 법인", "제품 설명 및 용도", "카탈로그 가격"];
    const columns = node("div", "product-columns");
    columns.setAttribute("aria-hidden", "true");
    for (const label of labels) columns.append(node("span", "", label));
    const list = node("ul", "product-rows");
    list.setAttribute("aria-label", part.heading);
    const terms = searchText.trim().split(/\s+/).filter(Boolean).map(normalize);
    for (const [index, product] of products.entries()) {
      if (terms.length) {
        const fields = [product.name, product.brand, product.company, product.category, product.description, product.price,
          ...(product.details || []).map(pair => pair[1])].map(normalize);
        if (!terms.every(term => fields.some(field => field.includes(term)))) continue;
      }
      const item = node("li");
      const button = node("button", "product-row");
      button.type = "button";
      button.setAttribute("aria-label", product.name);
      button.setAttribute("aria-haspopup", "dialog");
      const title = node("span", "product-row-title");
      title.append(node("strong", "", product.name));
      if (product.category) title.append(node("small", "", product.category));
      const maker = node("span", "product-row-maker");
      if (product.brand) maker.append(node("span", "", product.brand));
      if (product.company && product.company !== product.brand) maker.append(node("small", "", product.company));
      const description = node("span", "product-row-description", product.description);
      const price = node("span", "product-row-price", product.price || "—");
      const arrow = node("span", "product-row-arrow", "›");
      arrow.setAttribute("aria-hidden", "true");
      button.append(title, maker, description, price, arrow);
      button.addEventListener("click", () => globalThis.HLBProductBook.open(products, index, button, language));
      item.append(button);
      list.append(item);
    }
    const total = products.length, shown = list.childElementCount;
    count.textContent = english
      ? (terms.length ? shown + " of " + total : total) + " products"
      : (terms.length ? "검색 " + shown + "개 / 전체 " : "전체 ") + total + "개";
    if (shown) section.append(columns, list);
    else section.append(node("p", "reading-empty", english ? "No products found." : "일치하는 제품이 없습니다."));
    return section;
  }

  function drawText() {
    textReady=true;
    const body=el("reader-body");
    tableObserver?.disconnect();
    const blocks=document.createDocumentFragment();
    const searchText=el("reader-find").value;
    const query=normalize(searchText);
    const matches=value=>normalize(value).includes(query);
    if (entry?.summary && matches(entry.summary)) blocks.append(node("p","reading-summary",entry.summary));
    for (const [index, part] of (entry?.sections || []).entries()) {
      if (part.productLanguage) {
        blocks.append(productDirectory(part, searchText));
        continue;
      }
      const section=node("section","reading-section");
      const whole=matches(part.heading);
      if (part.text && (whole || matches(part.text))) section.append(node("p","",part.text));
      const items=(part.items || []).filter(it=>whole || matches(it));
      if (items.length) {
        const list=node("ul");
        for (const it of items) list.append(node("li","",it));
        section.append(list);
      }
      const [headers=[],...data]=part.rows || [];
      const rows=data.filter(row=>whole || matches(row.join(" ")));
      if (rows.length) {
        const hint=node("div","table-scroll-hint","↔ 좌우로 스크롤");
        hint.hidden=true;
        const wrap=node("div","reading-grid");
        wrap.tabIndex=0;
        wrap.setAttribute("role","region");
        wrap.setAttribute("aria-label",(part.heading || "자료 표")+" 스크롤 영역");
        const table=node("table"), head=table.createTHead().insertRow(), content=table.createTBody();
        table.setAttribute("aria-label",part.heading || "자료 표");
        if (headers.length >= 3) table.className="multi-column";
        const columns=headers.map(columnClass);
        for (const [i,label] of headers.entries()) {
          const cell=node("th",columns[i],label); cell.scope="col"; head.append(cell);
        }
        for (const row of rows) {
          const r=content.insertRow();
          for (const [i,value] of row.entries()) {
            const cell=r.insertCell(); cell.className=columns[i];
            if (!(/^https?:\/\//i).test(value)) {
              cell.textContent=value;
              continue;
            }
            const address=node("div","channel-address");
            address.append(node("span","address-value",value));
            if (navigator.clipboard?.writeText) {
              const copy=node("button","copy-address","복사"); copy.type="button";
              copy.setAttribute("aria-label",row[0]+" "+row[1]+" 주소 복사");
              copy.addEventListener("click",async()=>{
                try { await navigator.clipboard.writeText(value); copy.textContent="복사됨"; }
                catch { copy.textContent="주소를 선택해 복사하세요"; }
              });
              address.append(copy);
            }
            cell.append(address);
          }
        }
        wrap.append(table); section.append(hint,wrap);
        tableObserver?.observe(wrap);
      }
      if (section.childNodes.length) {
        if (part.heading) section.prepend(node("h2","",part.heading));
        if (index === 0 && entry.photo && !query) {
          const lead = node("div", "exhibit-intro");
          lead.append(exhibitPhoto(entry.photo), section);
          blocks.append(lead);
        } else blocks.append(section);
      }
      if (index === 0 && entry.fragrances?.length && !query) blocks.append(fragranceCollection(entry.fragrances));
    }
    if (!blocks.childNodes.length) blocks.append(node("p","reading-empty", query ? "이 자료에서 일치하는 내용을 찾지 못했습니다." : "자료 내용을 불러올 수 없습니다."));
    body.replaceChildren(blocks);
  }
  function mode(original) {
    original=Boolean(original && mediaURL);
    const box=el("reader-media");
    const wideTable=entry?.sections.some(section=>section.productLanguage || (section.rows?.[0]?.length || 0) >= 3);
    el("panel").classList.toggle("wide-tables", !original && Boolean(wideTable));
    releaseMedia();
    box.replaceChildren();  // Also stops audio and releases the previous document.
    mediaSelect=null;
    el("reader-text").hidden=original;
    box.hidden=!original;
    el("reader-text-mode").setAttribute("aria-pressed",String(!original));
    el("reader-original-mode").setAttribute("aria-pressed",String(original));
    if (!original && !textReady) drawText();
    if (!original || !mediaURL) return;
    if (mediaChoices.length>1) {
      const label=node("label","reader-attachments");
      const select=node("select");mediaSelect=select;
      select.setAttribute("aria-label","첨부 자료 선택");
      for (const [index,choice] of mediaChoices.entries()) {
        const option=node("option","",(index+1)+". "+choice.media.title);
        option.value=String(index);select.append(option);
      }
      select.value=String(mediaIndex);
      select.addEventListener("change",()=>{
        const index=Number(select.value);
        if (!Number.isInteger(index) || !mediaChoices[index]) return;
        const focused=document.activeElement===select;
        selectMedia(index);mode(true);
        if (focused) mediaSelect?.focus?.();
      });
      label.append(node("span","","첨부 자료"),select);box.append(label);
    }
    const media=entry.media;
    if (media.type==="pdf" && mediaURL.origin===location.origin && globalThis.HLBPDFViewer) {
      closePDF=globalThis.HLBPDFViewer.mount(box,mediaURL.href,media.title);
      if (entry.previewNotice) box.append(node("p","media-note",entry.previewNotice));
      return;
    }
    let frame;
    if (media.type==="image") {
      frame=node("img","reading-image"); frame.alt=media.title;
    } else if (media.type==="video" && /\.(mp4|webm|ogv)$/i.test(mediaURL.pathname)) {
      frame=node("video","reading-video"); frame.controls=true; frame.playsInline=true;
      playingVideo=frame;
    } else {
      frame=node("iframe","reading-frame");
      frame.title=media.title || "자료 원본";
      const remote=mediaURL.origin!==location.origin;
      if (remote) {
        frame.setAttribute("sandbox","allow-scripts allow-same-origin allow-presentation");
        frame.referrerPolicy="strict-origin-when-cross-origin";
        frame.allow="fullscreen; encrypted-media; picture-in-picture";
        frame.allowFullscreen=true;
      }
      if (mediaURL.hostname.includes("youtube") || mediaURL.hostname==="drive.google.com") frame.classList.add("film");
    }
    frame.src=mediaURL.href;
    box.append(frame);
    if (entry.previewNotice) box.append(node("p","media-note",entry.previewNotice));
    const remote=mediaURL.origin!==location.origin;
    const alternate=el("reader-text-mode").textContent;
    box.append(node("p","media-note",remote
      ? "인터넷 연결이 필요합니다. 화면이 표시되지 않으면 ‘"+alternate+"’에서 내용을 확인하세요."
      : "화면이 표시되지 않으면 ‘"+alternate+"’에서 내용을 확인하세요."));
  }
  function clear() {
    globalThis.HLBProductBook?.close();
    releaseMedia();
    tableObserver?.disconnect();
    el("panel").classList.remove("wide-tables");
    entry=null; mediaURL=null; textReady=false;
    mediaChoices=[];mediaIndex=0;mediaSelect=null;
    el("reader-pane").classList.remove("exhibit-reader");
    el("reader-media").replaceChildren(); el("reader-body").replaceChildren();
  }
  function open(record,spaceName) {
    entry=readingEntry(record);
    el("reader-pane").classList.toggle("exhibit-reader", Boolean(entry?.photo));
    mediaChoices=[];
    const seen=new Set();
    for (const media of [entry.media,...entry.attachments]) {
      const url=mediaLocation(media);
      if (!url || seen.has(url.href)) continue;
      seen.add(url.href);mediaChoices.push({media,url});
    }
    el("reader-meta").textContent=[spaceName,record.company,record.type,record.language,record.year].filter(Boolean).join("  ·  ");
    selectMedia(0);
    mode(Boolean(mediaURL));
  }
  el("reader-find").addEventListener("input",drawText);
  el("reader-text-mode").addEventListener("click",()=>mode(false));
  el("reader-original-mode").addEventListener("click",()=>mode(true));
  globalThis.HLBReader={open,clear};
})();
