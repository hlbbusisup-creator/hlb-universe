(() => {
  "use strict";
  const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  function create(container) {
    container.tabIndex=-1;
    const data=globalThis.HLBHistoryData;
    const chapters=[...data.chapters].sort((a,b)=>a.year-b.year);
    // Keep each physical spread short enough to read without squeezing type.
    const pages=chapters.flatMap(chapter=>{
      const events=[...chapter.events].sort((a,b)=>(a.month || 0)-(b.month || 0));
      const parts=Math.max(1,Math.ceil(events.length/5));
      return Array.from({length:parts},(_,part)=>({chapter,part,parts,events:events.slice(part*5,(part+1)*5)}));
    });
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    const dialog=container.closest("dialog");
    const top=make("div","hb-top"),select=make("select","hb-years"),label=make("label","hb-year-label","연도로 이동 ");
    select.setAttribute("aria-label","역사책 연도로 이동");
    select.append(new Option("표지","-1"));
    chapters.forEach(chapter=>select.append(new Option(String(chapter.year),String(pages.findIndex(page=>page.chapter===chapter)))));
    label.append(select);
    top.append(make("span","hb-edition","HLB ARCHIVE · 2000 — 2026"),label);
    const stage=make("div","hb-stage"),book=make("div","hb-book"),spread=make("div","hb-spread");
    book.append(spread);stage.append(book);
    const nav=make("nav","hb-navigation");nav.setAttribute("aria-label","역사책 페이지 넘기기");
    const prev=make("button","hb-prev","← 이전"),next=make("button","hb-next","다음 →"),count=make("span","hb-count");
    prev.type=next.type="button";count.setAttribute("role","status");
    prev.setAttribute("aria-keyshortcuts","ArrowLeft");next.setAttribute("aria-keyshortcuts","ArrowRight");
    const position=make("div","hb-position"),hint=make("span","hb-keyboard-hint","← → 방향키로 넘기기");
    position.append(count,hint);nav.append(prev,position,next);container.replaceChildren(top,stage,nav);
    let index=-1,active=false,animation=null,leaf=null;
    function photoPage(page) {
      const {chapter,part,parts}=page;
      const left=make("section","hb-page hb-left");
      const photo=part===0?chapter.photo:null;
      left.classList.toggle("hb-text-only",!photo);
      left.append(make("p","hb-kicker","HISTORY OF HLB"),make("p","hb-year",String(chapter.year)),
        make("h2","hb-title",chapter.title));
      if(photo) {
        const figure=make("figure","hb-photo"),img=make("img");
        img.src=photo.url;img.alt=photo.alt || photo.caption;img.loading="lazy";
        img.addEventListener("error",()=>{figure.replaceChildren(make("p","hb-photo-unavailable","사진을 불러오지 못했습니다."));},{once:true});
        figure.append(img,make("figcaption","",photo.caption));left.append(figure);
      }
      left.append(make("p","hb-intro",chapter.intro));
      left.append(make("span","hb-folio",String(index*2+1).padStart(2,"0")+(parts>1 ? " · "+(part+1)+" / "+parts : "")));
      return left;
    }
    function eventPage(page) {
      const right=make("section","hb-page hb-right");
      right.append(make("p","hb-kicker",page.chapter.year+" · 주요 기록"));
      const list=make("ol","hb-events");
      for(const event of page.events) {
        const item=make("li"),date=make("span","hb-month",event.month ? event.month+"월" : String(page.chapter.year));
        item.append(date,make("p","",event.text));list.append(item);
      }
      right.append(list);
      const sources=make("details","hb-sources"),summary=make("summary","","자료 및 사진 출처");
      sources.append(summary);
      const photo=page.part===0?page.chapter.photo:null;
      const links=[...(page.chapter.sources || []),...(photo?.sourceUrl?[{title:"사진 · "+photo.caption,url:photo.sourceUrl}]:[])];
      const seen=new Set();
      for(const source of links) {
        if(!/^https?:\/\//.test(source.url) || seen.has(source.url))continue;
        seen.add(source.url);const link=make("a","",source.title+" ↗");
        link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";sources.append(link);
      }
      right.append(sources,make("span","hb-folio",String(index*2+2).padStart(2,"0")));
      return right;
    }
    function render() {
      book.classList.toggle("hb-closed",index<0);
      if(index<0) {
        const cover=make("button","hb-cover");cover.type="button";cover.setAttribute("aria-label","History of HLB 책 펼치기");
        cover.append(make("span","hb-cover-label","HLB ONLINE MUSEUM"),make("strong","","History\nof HLB"),
          make("span","hb-cover-years","2000 — 2026"),make("span","hb-cover-open","표지를 눌러 책 펼치기 →"));
        cover.addEventListener("click",()=>turn(0));spread.replaceChildren(cover);
      } else spread.replaceChildren(photoPage(pages[index]),eventPage(pages[index]));
      const animating=Boolean(animation);
      prev.disabled=index<0 || animating;next.disabled=index===pages.length-1 || animating;select.disabled=animating;
      prev.setAttribute("aria-label",index===0?"표지로 돌아가기":"이전 페이지");
      next.setAttribute("aria-label",index<0?"책 펼치기":"다음 페이지");
      next.textContent=index<0?"책 펼치기 →":index===pages.length-1?"마지막 페이지":"다음 →";
      count.textContent=index<0?"표지":pages[index].chapter.year+" · "+(index+1)+" / "+pages.length;
      select.value=index<0?"-1":String(pages.findIndex(page=>page.chapter===pages[index].chapter));
    }
    function finishAnimation() {
      animation=null;leaf?.remove();leaf=null;
      if(active)render();
    }
    function turn(target) {
      if(!active || animation || target===index || target< -1 || target>=pages.length)return;
      const forward=target>index,wasCover=index<0;
      const old=spread.querySelector(wasCover?".hb-cover":forward?".hb-right":".hb-left");
      if(!reduced.matches && window.innerWidth>700 && old) {
        leaf=old.cloneNode(true);leaf.className="hb-turn-sheet"+(wasCover?" hb-turn-cover":"");
        leaf.setAttribute("aria-hidden","true");leaf.inert=true;
        leaf.style.left=forward?"50%":"0";leaf.style.transformOrigin=forward?"left center":"right center";
        book.append(leaf);
      }
      index=target;render();
      if(leaf) {
        animation=leaf.animate([{transform:"rotateY(0deg)",opacity:1},{transform:"rotateY("+(forward?-165:165)+"deg)",opacity:.15}],{duration:560,easing:"cubic-bezier(.3,.1,.2,1)"});
        animation.onfinish=finishAnimation;animation.oncancel=finishAnimation;
        prev.disabled=next.disabled=select.disabled=true;
      } else if(!reduced.matches && spread.animate) spread.animate([{opacity:.3},{opacity:1}],{duration:220});
      stage.scrollTop=0;
      // A disabled arrow or a replaced cover can otherwise send focus to the
      // document body, outside this dialog's keyboard page-turn handler.
      container.focus({preventScroll:true});
    }
    prev.addEventListener("click",()=>turn(index-1));next.addEventListener("click",()=>turn(index+1));
    select.addEventListener("change",()=>turn(Number(select.value)));
    dialog.addEventListener("keydown",event=>{
      if(!active || !dialog.open || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.target.closest("input,select,textarea,[contenteditable]:not([contenteditable=false])"))return;
      if(event.key==="ArrowLeft" || event.key==="ArrowRight") {
        event.preventDefault();event.stopPropagation();turn(index+(event.key==="ArrowRight"?1:-1));
      }
    });
    function close() {active=false;animation?.cancel();animation=null;leaf?.remove();leaf=null;}
    function open() {close();active=true;index=-1;render();container.focus({preventScroll:true});}
    return {open,close,getState:()=>({index,count:pages.length,year:index>=0?pages[index].chapter.year:null,animating:Boolean(animation)})};
  }
  globalThis.HLBHistoryBook={create};
})();
