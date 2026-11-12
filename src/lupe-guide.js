(() => {
  "use strict";
  const route = ["group", "product", "history"];
  const greeting = "안녕하세요 저는 루페에요! 처음 방문하셨으면 제가 안내해드려도 괜찮을까요?";
  const stories = {
    group:"여기는 그룹안내소예요. 궁금한 그룹사가 있다면 이곳에서 위치와 연락처를 찾고, 공식 소셜미디어도 둘러볼 수 있어요.",
    product:"이곳은 제품전시관이에요. 제품 찾아보기에서 관심 있는 브랜드를 골라 보세요. 책을 펼치면 제품 사진과 설명을 한눈에 볼 수 있어요.",
    history:"언덕 위 궁궐은 HLB 역사관이에요. 중앙 제단의 책을 펼치면 HLB의 첫걸음부터 연혁을 따라갈 수 있어요. 안쪽 스크린 앞에서는 GI 선포식 영상도 볼 수 있어요.",
    ir:"이곳은 IR 자료관이에요. 관심 있는 회사의 투자자 자료를 찾거나, 정기보고서와 IR 영상을 열어 볼 수 있어요.",
    esg:"유리 온실처럼 생긴 이곳은 ESG 정원이에요. 보고서를 펼치면 HLB가 환경과 사회, 기업 경영에 관해 어떤 활동을 해 왔는지 살펴볼 수 있어요.",
    brand:"이곳은 브랜드관이에요. 그룹사마다 어떤 미래를 그리고 있는지 비전과 슬로건을 보고, 브로슈어와 홍보 영상도 만나 보세요.",
    cologne:"여기는 에데꼬론 상품관이에요. 퍼스널 디퓨저와 향 카트리지가 서로 다른 전시대에 있어요. 궁금한 전시품을 누르면 가까이 가서 살펴볼 수 있어요.",
    cafe:"여기는 카페 렌토예요. 주문대에서 커피와 빵을 받아 보세요. 손에 들고 다음 전시관까지 산책할 수도 있어요."
  };
  function create({nearest, space, walk, stop, riding, available}) {
    const el = id => document.getElementById(id);
    const widget = el("lupe-guide"), card = el("lupe-card"), launcher = el("lupe-launcher");
    const title = el("lupe-title"), copy = el("lupe-copy"), actions = el("lupe-actions");
    const next = el("lupe-tour"), local = el("lupe-near"), voice = el("lupe-voice"), end = el("lupe-end");
    let step = -1, mode = "idle", page = "", hallId = "", utterance = null;
    const synth = window.speechSynthesis;
    function silence() {
      if (utterance) { utterance = null; synth?.cancel(); }
      voice.textContent = "설명 듣기";
    }
    function speak() {
      if (!synth || !window.SpeechSynthesisUtterance) return;
      silence();
      const line = new SpeechSynthesisUtterance(copy.textContent);
      line.lang = "ko-KR";
      line.rate = 1;
      utterance = line;
      line.onend = line.onerror = () => {
        if (utterance === line) { utterance = null; voice.textContent = "다시 듣기"; }
      };
      voice.textContent = "음성 멈추기";
      synth.speak(line);
    }
    function dismiss() {
      silence();
      card.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
    }
    function nearby() {
      const hall = nearest();
      local.hidden = !hall;
      if (hall && local.dataset.hall !== hall.id) {
        local.dataset.hall = hall.id;
        local.textContent = hall.title + " 둘러보기";
      }
    }
    function display(view, heading, text) {
      silence();
      page = view;
      title.textContent = heading;
      copy.textContent = text;
      card.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      actions.hidden = view === "welcome";
      el("lupe-talk").hidden = view !== "welcome";
      end.hidden = step < 0;
      voice.hidden = !(synth && window.SpeechSynthesisUtterance && (view === "story" || view === "arrival"));
      next.textContent = mode === "arrived" ? (step === route.length - 1 ? "관람 마치기" : "다음 장소로 · " + space(route[step + 1]).title)
        : mode === "paused" ? "HLB 둘러보기 계속하기" : "HLB 둘러보기";
      nearby();
    }
    function menu() {
      if (!available()) return;
      if (mode === "arrived") { arrivalCard(); return; }
      display("menu", "루페와 둘러보기", step < 0 ? "저와 함께 그룹안내소, 제품전시관, HLB 역사관을 차례로 둘러볼까요?" :
        space(route[step]).title + (mode === "queued" ? " 안내는 블랙캣에서 내리면 시작할게요." : "까지 함께 가요. 자유롭게 둘러보다가 다시 저를 불러도 돼요."));
    }
    function beginLeg() {
      const hall = space(route[step]);
      if (riding()) {
        mode = "queued";
        display("menu", "블랙캣에서 내리면 출발해요", "도착하면 " + hall.title + "까지 안내할게요.");
        return;
      }
      mode = "walking";
      dismiss();
      if (!walk(hall)) {
        mode = "paused";
        display("menu", "길을 다시 찾아볼게요", "조금 이동한 뒤 ‘HLB 둘러보기 계속하기’를 눌러 주세요.");
      }
    }
    function arrivalCard() {
      const id = route[step];
      display("arrival", (step + 1) + " / " + route.length + " · " + space(id).title, stories[id]);
    }
    function finish(completed) {
      if (mode === "walking") stop();
      step = -1; mode = "idle";
      display("menu", completed ? "함께 둘러봐서 즐거웠어요!" : "자유롭게 둘러보세요",
        "궁금한 건물 가까이에서 저를 누르면 그곳 이야기를 들려드릴게요.");
    }
    next.addEventListener("click", () => {
      if (mode === "arrived") {
        if (step === route.length - 1) { finish(true); return; }
        step++;
      } else if (step < 0) step = 0;
      beginLeg();
    });
    local.addEventListener("click", () => {
      const hall = nearest();
      if (!hall) return;
      hallId = hall.id;
      display("story", hall.title, stories[hall.id] || hall.description);
      speak();
    });
    voice.addEventListener("click", () => utterance ? silence() : speak());
    end.addEventListener("click", () => finish(false));
    el("lupe-talk").addEventListener("click", menu);
    el("lupe-dismiss").addEventListener("click", () => { dismiss(); launcher.focus({preventScroll:true}); });
    launcher.addEventListener("click", () => card.hidden || page === "welcome" ? menu() : dismiss());
    widget.addEventListener("keydown", e => {
      if (e.key === "Escape" && !card.hidden) { dismiss(); launcher.focus({preventScroll:true}); }
    });
    return {
      enter(welcome) {
        widget.hidden = false;
        if (welcome) display("welcome", "루페", greeting);
      },
      menu, dismiss,
      disable() { dismiss(); widget.hidden = true; },
      interrupt() { if (mode === "walking") mode = "paused"; },
      arrived() { if (mode === "walking") { mode = "arrived"; arrivalCard(); } },
      tick() {
        if (!available()) return;
        if (mode === "queued" && !riding()) { beginLeg(); return; }
        if (!card.hidden) {
          nearby();
          if (page === "story" && local.dataset.hall !== hallId) menu();
        }
      }
    };
  }
  window.HLBLupeGuide = {create};
})();
