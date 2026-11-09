(() => {
  "use strict";

  const assets = new URL("../assets/vendor/pdfjs/", document.currentScript.src);
  const asset = path => new URL(path, assets).href;
  const zoomSteps = [.5, .75, 1, 1.25, 1.5, 2, 2.5, 3];
  const fitIndex = zoomSteps.indexOf(1);

  function mount(container, url, title) {
    const events = new AbortController();
    const listen = (node, name, handler) => node.addEventListener(name, handler, {signal:events.signal});
    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    }
    function button(text, name, click) {
      const node = element("button", "", text);
      node.type = "button";
      node.title = name;
      node.setAttribute("aria-label", name);
      listen(node, "click", click);
      return node;
    }

    const viewer = element("section", "pdf-viewer");
    viewer.setAttribute("aria-label", title + " 원본 문서");
    const toolbar = element("div", "pdf-toolbar");
    const paging = element("div", "pdf-paging");
    const prev = button("이전", "이전 페이지", () => go(number - 1));
    const next = button("다음", "다음 페이지", () => go(number + 1));
    const input = element("input", "pdf-page-number");
    input.type = "number";
    input.inputMode = "numeric";
    input.min = "1";
    input.step = "1";
    input.value = "1";
    input.setAttribute("aria-label", "이동할 페이지");
    const total = element("span", "pdf-total", "/ …");
    paging.append(prev, input, total, next);
    const zoom = element("div", "pdf-zoom");
    const smaller = button("−", "축소", () => setZoom(zoomIndex - 1));
    const larger = button("+", "확대", () => setZoom(zoomIndex + 1));
    const percent = element("span", "pdf-percent", "100%");
    const fit = button("폭 맞춤", "화면 너비에 맞추기", () => setZoom(fitIndex));
    zoom.append(smaller, percent, larger, fit);
    toolbar.append(paging, zoom);
    const status = element("p", "pdf-status", "PDF를 여는 중입니다.");
    status.setAttribute("role", "status");
    const stage = element("div", "pdf-stage");
    stage.tabIndex = 0;
    stage.setAttribute("role", "region");
    stage.setAttribute("aria-label", "원본 페이지");
    const details = element("details", "pdf-text");
    const summary = element("summary", "", "이 페이지의 텍스트 읽기");
    const transcript = element("div", "pdf-transcript");
    details.append(summary, transcript);
    details.hidden = true;
    viewer.append(toolbar, status, stage, details);
    container.append(viewer);

    let loading = null, pdf = null, currentPage = null, drawing = null;
    let number = 1, zoomIndex = fitIndex, revision = 0, closed = false;
    let frame = 0, lastWidth = 0, lastPage = 0, textPage = null;
    function controls() {
      prev.disabled = !pdf || number === 1;
      next.disabled = !pdf || number === pdf.numPages;
      input.disabled = !pdf;
      smaller.disabled = !pdf || zoomIndex === 0;
      larger.disabled = !pdf || zoomIndex === zoomSteps.length - 1;
      fit.disabled = !pdf || zoomIndex === fitIndex;
      input.value = String(number);
      percent.textContent = Math.round(zoomSteps[zoomIndex] * 100) + "%";
      if (pdf) {
        input.max = String(pdf.numPages);
        total.textContent = "/ " + pdf.numPages;
      }
    }
    controls();

    function releaseCanvas(canvas) {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
    }
    async function readText() {
      const page = currentPage;
      if (!details.open || !page || textPage === page) return;
      textPage = page;
      transcript.textContent = "텍스트를 불러오는 중입니다.";
      try {
        const content = await page.getTextContent();
        if (closed || currentPage !== page) return;
        const text = content.items.map(item =>
          typeof item.str === "string" ? item.str + (item.hasEOL ? "\n" : " ") : ""
        ).join("").trim();
        transcript.textContent = text || "텍스트가 포함되지 않은 이미지 페이지입니다.";
      } catch {
        if (!closed && currentPage === page) transcript.textContent = "이 페이지의 텍스트를 읽을 수 없습니다.";
      }
    }
    listen(details, "toggle", readText);

    function showError(message, retry) {
      status.textContent = message + " ";
      status.append(button("다시 시도", "다시 시도", retry));
      stage.setAttribute("aria-busy", "false");
    }

    async function render() {
      if (!pdf || closed) return;
      const pass = ++revision, requested = number;
      drawing?.cancel();
      drawing = null;
      let canvas = null, job = null;
      stage.setAttribute("aria-busy", "true");
      status.textContent = requested + "쪽을 여는 중입니다.";
      try {
        const page = await pdf.getPage(requested);
        if (closed || pass !== revision) return;
        if (currentPage !== page) {
          currentPage?.cleanup();
          currentPage = page;
          textPage = null;
          transcript.textContent = "";
        }
        details.hidden = false;
        readText();
        const original = page.getViewport({scale:1});
        const available = stage.clientWidth;
        // A hidden container will be measured again by ResizeObserver when shown.
        if (!available) return;
        lastWidth = available;
        const viewport = page.getViewport({scale:available / original.width * zoomSteps[zoomIndex]});
        const density = Math.min(window.devicePixelRatio || 1, 2,
          Math.sqrt(6000000 / (viewport.width * viewport.height)), 4096 / viewport.width, 4096 / viewport.height);
        canvas = element("canvas", "pdf-canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width * density));
        canvas.height = Math.max(1, Math.floor(viewport.height * density));
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", title + " " + requested + "쪽");
        job = page.render({canvas, viewport, transform:[density,0,0,density,0,0]});
        drawing = job;
        await job.promise;
        if (closed || pass !== revision) return;
        releaseCanvas(stage.firstElementChild);
        stage.replaceChildren(canvas);
        canvas = null;
        if (lastPage !== requested) {
          stage.scrollTop = 0;
          stage.scrollLeft = 0;
        }
        lastPage = requested;
        status.textContent = "전체 " + pdf.numPages + "쪽 중 " + requested + "쪽";
        stage.setAttribute("aria-busy", "false");
      } catch (error) {
        if (!closed && pass === revision && error.name !== "RenderingCancelledException") {
          releaseCanvas(stage.firstElementChild);
          stage.replaceChildren();
          showError(requested + "쪽을 표시할 수 없습니다.", render);
        }
      } finally {
        releaseCanvas(canvas);
        if (drawing === job) drawing = null;
      }
    }

    function go(value) {
      if (!pdf || !Number.isFinite(value)) { input.value = String(number); return; }
      const target = Math.max(1, Math.min(pdf.numPages, Math.round(value)));
      input.value = String(target);
      if (target === number) return;
      number = target;
      controls();
      render();
    }
    function setZoom(index) {
      const clamped = Math.max(0, Math.min(zoomSteps.length - 1, index));
      if (clamped === zoomIndex) return;
      zoomIndex = clamped;
      controls();
      render();
    }
    listen(input, "change", () => go(input.valueAsNumber));
    listen(input, "keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); go(input.valueAsNumber); }
    });
    const observer = new ResizeObserver(() => {
      if (!pdf || closed || !stage.clientWidth || stage.clientWidth === lastWidth) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    });
    observer.observe(stage);

    async function open() {
      status.textContent = "PDF를 여는 중입니다.";
      try {
        const library = await import(asset("legacy/build/pdf.min.mjs"));
        if (closed) return;
        library.GlobalWorkerOptions.workerSrc = asset("legacy/build/pdf.worker.min.mjs");
        loading = library.getDocument({
          url:new URL(url, document.baseURI).href, cMapUrl:asset("cmaps/"), cMapPacked:true,
          standardFontDataUrl:asset("standard_fonts/"), wasmUrl:asset("wasm/"), iccUrl:asset("iccs/"),
          disableWorkerRendering:true
        });
        const documentProxy = await loading.promise;
        if (closed) return;
        pdf = documentProxy;
        controls();
        render();
      } catch {
        if (closed) return;
        const failed = loading;
        loading = null;
        if (failed) failed.destroy().catch(() => {});
        showError("PDF를 열 수 없습니다.", open);
      }
    }
    open();
    return () => {
      if (closed) return;
      closed = true;
      events.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
      drawing?.cancel();
      if (loading) loading.destroy().catch(() => {});
      releaseCanvas(stage.firstElementChild);
      viewer.remove();
    };
  }
  globalThis.HLBPDFViewer = {mount};
})();
