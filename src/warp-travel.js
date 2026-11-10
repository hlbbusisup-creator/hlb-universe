(() => {
  "use strict";

  // Add another destination here to extend the selection without changing the UI.
  const destinations = Object.freeze([
    Object.freeze({
      id:"the-river",
      title:"THE RIVER",
      description:"강 위에서 만나는 또 하나의 경험",
      url:"https://the-river-moments.brawnyswan21.chatgpt.site/"
    })
  ]);
  const sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads";
  let nextInstance=0;

  function element(tag,className,text) {
    const node=document.createElement(tag);
    if(className) node.className=className;
    if(text!==undefined) node.textContent=text;
    return node;
  }

  function create({onDepart,onReturn}={}) {
    const instance=++nextInstance;
    let dialog=null,frame=null,active=null,noticeTimer=null,previousFocus=null;

    function finish() {
      if(!dialog) return;
      const returningFrom=active,restore=previousFocus,closing=dialog;
      clearTimeout(noticeTimer);
      noticeTimer=null;
      // Removing the frame ends the external experience while the original
      // world, player position and camera remain in their existing document.
      frame?.remove();
      frame=null;dialog=null;active=null;previousFocus=null;
      closing.remove();
      try { onReturn?.(returningFrom); }
      finally {
        if(restore?.isConnected && restore.getClientRects().length &&
          !restore.closest('[inert], dialog:not([open])')) {
          restore.focus({preventScroll:true});
        }
      }
    }

    function close() {
      if(!dialog) return false;
      if(dialog.open) dialog.close();
      finish();
      return true;
    }

    function open(destinationId) {
      const destination=destinations.find(item=>item.id===destinationId);
      if(!destination || dialog) return false;
      previousFocus=document.activeElement;
      active=destination;
      const current=element("dialog","warp-travel-dialog");
      dialog=current;
      current.setAttribute("aria-label",destination.title+" 외부 체험 공간");

      const returnButton=element("button","warp-travel-return");
      returnButton.type="button";
      returnButton.setAttribute("aria-label","HLB 온라인 체험관으로 돌아가기");
      returnButton.autofocus=true;
      const arrow=element("span","warp-travel-back","←");
      const badge=element("span","warp-travel-brand","HLB");
      arrow.setAttribute("aria-hidden","true");
      badge.setAttribute("aria-hidden","true");
      const copy=element("span","warp-travel-return-copy");
      copy.append(element("strong","","HLB 온라인 체험관으로 돌아가기"),
        element("small","","외부 공간 · "+destination.title));
      returnButton.append(arrow,badge,copy);
      returnButton.addEventListener("click",close);

      const help=element("aside","warp-travel-help");
      help.setAttribute("aria-label","외부 공간 이용 도움말");
      const notice=element("p","warp-travel-notice");
      notice.hidden=true;
      notice.setAttribute("role","status");
      notice.setAttribute("aria-live","polite");
      const details=element("details","warp-travel-details");
      const summary=element("summary","","화면이 안 보이나요?");
      const helpBody=element("div","warp-travel-help-body");
      helpBody.id="warp-travel-help-"+instance;
      const newTab=element("a","warp-travel-new-tab",destination.title+" 새 탭으로 열기 ↗");
      newTab.href=destination.url;
      newTab.target="_blank";
      newTab.rel="noopener noreferrer";
      helpBody.append(
        notice,
        element("p","","화면이 보이지 않거나 멈춰 있다면 새 탭에서 열어 보세요."),
        newTab,
        element("p","warp-travel-tab-note","새 탭에서는 이 복귀 버튼이 표시되지 않습니다. 체험 후 현재 HLB 탭으로 돌아오세요.")
      );
      details.append(summary,helpBody);
      help.append(details);

      frame=element("iframe","warp-travel-frame");
      frame.title=destination.title+" 외부 체험 공간";
      frame.setAttribute("sandbox",sandbox);
      frame.referrerPolicy="no-referrer";
      frame.src=destination.url;
      current.append(returnButton,help,frame);
      current.addEventListener("cancel",event=>{event.preventDefault();close();});
      current.addEventListener("close",()=>{if(dialog===current) finish();});
      document.body.append(current);
      try { current.showModal(); }
      catch(error) {
        // A failed native dialog must not leave an invisible external frame.
        frame.remove();current.remove();
        frame=null;dialog=null;active=null;previousFocus=null;
        throw error;
      }
      returnButton.focus({preventScroll:true});
      noticeTimer=setTimeout(()=>{
        if(dialog!==current) return;
        summary.textContent="화면이 안 보이면 도움말 열기";
        notice.textContent="화면이 보이지 않으면 아래 도움말을 확인하세요.";
        notice.hidden=false;
      },12000);
      // An iframe load event also fires for some blocked pages. Keep the return
      // control and help available without claiming that its content has loaded.
      onDepart?.(destination);
      return true;
    }

    function renderList(container) {
      const list=element("div","warp-travel-destinations");
      for(const destination of destinations){
        const button=element("button","warp-travel-destination");
        button.type="button";
        button.dataset.destinationId=destination.id;
        button.setAttribute("aria-label",destination.title+" 방문하기");
        const art=element("span","warp-travel-destination-art");
        art.setAttribute("aria-hidden","true");
        art.append(element("span","warp-travel-river-line"),element("span","warp-travel-river-line"));
        const copy=element("span","warp-travel-destination-copy");
        copy.append(element("small","warp-travel-eyebrow","새로운 공간으로"),
          element("strong","",destination.title),element("span","",destination.description));
        const visit=element("span","warp-travel-visit","방문하기 ↗");
        button.append(art,copy,visit);
        button.addEventListener("click",()=>open(destination.id));
        list.append(button);
      }
      container.replaceChildren(list);
    }

    return {renderList,open,close,isOpen:()=>Boolean(dialog?.open)};
  }

  globalThis.HLBWarpTravel={destinations,create};
})();
