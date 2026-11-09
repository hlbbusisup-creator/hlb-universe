// The reading desk only embeds approved publications. Notion addresses remain catalog metadata.
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  let entry = null;
  let mediaURL = null;
  let closePDF = null;
  function releasePDF() {
    closePDF?.();
    closePDF=null;
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
    const local=new URL(".",document.baseURI);
    if (u.origin===local.origin && u.protocol===local.protocol && u.pathname.startsWith(local.pathname+"assets/reading/")) return u;
    const providers={
      "heyzine.com": /^\/flip-book\/[a-z0-9]+\.html$/i,
      "www.youtube.com": /^\/embed\/[\w-]+$/,
      "www.youtube-nocookie.com": /^\/embed\/[\w-]+$/,
      "drive.google.com": /^\/file\/d\/[\w-]+\/preview$/,
      "www.google.com": /^\/maps\/d\/(?:u\/\d+\/)?embed$/
    };
    return u.protocol==="https:" && !u.port && providers[u.hostname]?.test(u.pathname) ? u : null;
  }
  const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g,"");
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

  function drawText() {
    const body=el("reader-body");
    const blocks=document.createDocumentFragment();
    const query=normalize(el("reader-find").value);
    const matches=value=>normalize(value).includes(query);
    for (const [index, part] of (entry?.sections || []).entries()) {
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
        const wrap=node("div","reading-grid");
        const table=node("table"), head=table.createTHead().insertRow(), content=table.createTBody();
        table.setAttribute("aria-label",part.heading || "자료 표");
        for (const label of headers) {
          const cell=node("th","",label); cell.scope="col"; head.append(cell);
        }
        for (const row of rows) {
          const r=content.insertRow();
          for (const value of row) {
            const cell=r.insertCell(); cell.textContent=value;
            if ((/^https?:\/\//i).test(value) && navigator.clipboard?.writeText) {
              const copy=node("button","copy-address","복사"); copy.type="button";
              copy.setAttribute("aria-label",row[0]+" "+row[1]+" 주소 복사");
              copy.addEventListener("click",async()=>{
                try { await navigator.clipboard.writeText(value); copy.textContent="복사됨"; }
                catch { copy.textContent="주소를 선택해 복사하세요"; }
              });
              cell.append(" ",copy);
            }
          }
        }
        wrap.append(table); section.append(wrap);
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
    const box=el("reader-media");
    releasePDF();
    box.replaceChildren();  // Also stops audio and releases the previous document.
    el("reader-text").hidden=original;
    box.hidden=!original;
    el("reader-text-mode").setAttribute("aria-pressed",String(!original));
    el("reader-original-mode").setAttribute("aria-pressed",String(original));
    if (!original || !mediaURL) return;
    const media=entry.media;
    if (media.type==="pdf" && mediaURL.origin===location.origin && globalThis.HLBPDFViewer) {
      closePDF=globalThis.HLBPDFViewer.mount(box,mediaURL.href,media.title);
      return;
    }
    let frame;
    if (media.type==="image") {
      frame=node("img","reading-image"); frame.alt=media.title;
    } else if (media.type==="video" && /\.(mp4|webm)$/i.test(mediaURL.pathname)) {
      frame=node("video","reading-video"); frame.controls=true; frame.playsInline=true;
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
    const remote=mediaURL.origin!==location.origin;
    box.append(node("p","media-note",remote
      ? "원본은 인터넷 연결이 필요합니다. 화면이 표시되지 않으면 ‘자료 내용’에서 읽을 수 있습니다."
      : "원본이 표시되지 않는 브라우저에서는 ‘자료 내용’에서 읽을 수 있습니다."));
  }
  function clear() {
    releasePDF();
    entry=null; mediaURL=null;
    el("reader-pane").classList.remove("exhibit-reader");
    el("reader-media").replaceChildren(); el("reader-body").replaceChildren();
  }
  function open(record,spaceName) {
    entry=globalThis.HLBReadingData?.[record.id] || globalThis.HLBReportReadingData?.[record.id] || globalThis.HLBCologneReadingData?.[record.id] || null;
    el("reader-pane").classList.toggle("exhibit-reader", Boolean(entry?.photo));
    mediaURL=mediaLocation(entry?.media);
    el("reader-meta").textContent=[spaceName,record.company,record.type,record.language,record.year].filter(Boolean).join("  ·  ");
    el("reader-find").value="";
    const count=entry?.sections.reduce((sum,s)=>sum+(s.rows?.length || 0)+(s.items?.length || 0),0) || 0;
    el("reader-find-label").hidden=count<10 || Boolean(entry?.fragrances);
    el("reader-modes").hidden=!mediaURL;
    const label=mediaURL?.hostname || "";
    el("reader-original-mode").textContent=label.includes("youtube") || label==="drive.google.com" || entry?.media?.type==="video"
      ? "영상 재생" : label==="www.google.com" ? "지도 펼치기" : "원본 보기";
    drawText();
    mode(false);
  }
  el("reader-find").addEventListener("input",drawText);
  el("reader-text-mode").addEventListener("click",()=>mode(false));
  el("reader-original-mode").addEventListener("click",()=>mode(true));
  globalThis.HLBReader={open,clear};
})();
