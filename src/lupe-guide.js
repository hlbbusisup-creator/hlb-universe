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
    const title = el("lupe-title"), copy = el("lupe-copy"), bubble = el("lupe-bubble");
    const next = el("lupe-tour"), local = el("lupe-near"), voice = el("lupe-voice"), end = el("lupe-end");
    let step = -1, mode = "idle", storyId = "", utterance = null;
    let expiresAt = 0;
    const introduced = new Set();
    const synth = window.speechSynthesis;
    function silence() {
      if (utterance) { utterance = null; synth?.cancel(); }
      voice.textContent = "설명 듣기";
    }
    function speak(text) {
      if (!synth || !window.SpeechSynthesisUtterance) return;
      silence();
      const line = new SpeechSynthesisUtterance(text);
      line.lang = "ko-KR";
      line.rate = 1;
      utterance = line;
      line.onend = line.onerror = () => {
        if (utterance === line) { utterance = null; voice.textContent = "다시 듣기"; }
      };
      voice.textContent = "음성 멈추기";
      synth.speak(line);
    }
    function closeMenu() {
      card.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
    }
    function clearBubble() {
      bubble.hidden = true;
      bubble.textContent = "";
      expiresAt = 0;
    }
    function dismiss() {
      closeMenu();
      silence();
      clearBubble();
    }
    function say(text) {
      closeMenu();
      bubble.textContent = text;
      expiresAt = performance.now() + Math.max(6500, text.length * 140);
    }
    function nearby() {
      const hall = nearest();
      local.hidden = !hall;
      if (!hall) delete local.dataset.hall;
      else if (local.dataset.hall !== hall.id) {
        local.dataset.hall = hall.id;
        local.textContent = hall.title + " 둘러보기";
      }
    }
    function updateMenu() {
      const hall = step >= 0 ? space(route[step]) : null;
      const story = storyId && nearest()?.id === storyId ? space(storyId) : null;
      title.textContent = mode === "arrived" ? (step + 1) + " / " + route.length + " · " + hall.title : "루페와 둘러보기";
      if (story) copy.textContent = stories[story.id];
      else if (mode === "arrived") copy.textContent = stories[hall.id];
      else if (mode === "queued") copy.textContent = "블랙캣에서 내리면 " + hall.title + "까지 안내할게요.";
      else if (hall) copy.textContent = hall.title + "까지 함께 가요. 자유롭게 둘러보다가 다시 저를 불러도 돼요.";
      else copy.textContent = "저와 함께 그룹안내소, 제품전시관, HLB 역사관을 차례로 둘러볼까요?";
      end.hidden = step < 0;
      voice.hidden = !(synth && window.SpeechSynthesisUtterance && (story || mode === "arrived"));
      next.textContent = mode === "arrived" ? (step === route.length - 1 ? "관람 마치기" : "다음 장소로 · " + space(route[step + 1]).title)
        : mode === "paused" ? "HLB 둘러보기 계속하기" : "HLB 둘러보기";
      nearby();
    }
    function menu() {
      if (!available()) return;
      clearBubble();
      updateMenu();
      card.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
    }
    function beginLeg() {
      const hall = space(route[step]);
      storyId = "";
      silence();
      if (riding()) {
        mode = "queued";
        say("블랙캣에서 내리면 " + hall.title + "까지 안내할게요.");
        return;
      }
      mode = "walking";
      say(hall.title + " 쪽으로 가 볼까요? 저를 따라오세요!");
      if (!walk(hall)) {
        mode = "paused";
        say("길을 다시 찾아볼게요. 조금 이동한 뒤 저를 눌러 주세요.");
      }
    }
    function finish(completed) {
      if (mode === "walking") stop();
      step = -1; mode = "idle"; storyId = "";
      silence();
      say(completed ? "함께 둘러봐서 즐거웠어요! 궁금한 건물 앞에서 또 만나요." : "자유롭게 둘러보세요. 궁금한 게 생기면 저를 눌러 주세요!");
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
      storyId = hall.id;
      const text = stories[hall.id] || hall.description;
      say(text);
      speak(text);
    });
    voice.addEventListener("click", () => utterance ? silence() : speak(copy.textContent));
    end.addEventListener("click", () => finish(false));
    el("lupe-dismiss").addEventListener("click", () => { dismiss(); launcher.focus({preventScroll:true}); });
    launcher.addEventListener("click", () => card.hidden ? menu() : dismiss());
    widget.addEventListener("keydown", e => {
      if (e.key === "Escape" && !card.hidden) { dismiss(); launcher.focus({preventScroll:true}); }
    });
    return {
      enter(welcome) {
        widget.hidden = false;
        dismiss();
        if (welcome) say(greeting);
      },
      menu, dismiss,
      disable() { dismiss(); widget.hidden = true; },
      interrupt() {
        if (mode !== "walking") return;
        mode = "paused";
        if (!card.hidden) updateMenu();
        else clearBubble();
      },
      arrived() {
        if (mode !== "walking") return;
        mode = "arrived";
        const id = route[step];
        introduced.add(id);
        silence();
        say(space(id).title + "에 도착했어요! " + stories[id]);
      },
      tick(insideId) {
        if (!available()) return;
        if (mode === "queued" && !riding()) { beginLeg(); return; }
        if (storyId && nearest()?.id !== storyId) {
          storyId = "";
          silence();
          clearBubble();
          if (!card.hidden) updateMenu();
        }
        if (!card.hidden) { nearby(); return; }
        if (expiresAt && performance.now() >= expiresAt) clearBubble();
        if (mode === "idle" && !expiresAt && insideId && !introduced.has(insideId) && stories[insideId]) {
          introduced.add(insideId);
          say(stories[insideId]);
        }
      }
    };
  }
  window.HLBLupeGuide = {create};
})();
