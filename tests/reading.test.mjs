import test from "node:test";
import assert from "node:assert/strict";
import { open, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import "../src/catalog-data.js";
import "../src/catalog.js";
import "../src/reading-data.js";
import "../src/report-reading-data.js";
import "../src/cologne-reading.js";
import "../src/product-data.js";

const documents={...globalThis.HLBReadingData,...globalThis.HLBReportReadingData,...globalThis.HLBCologneReadingData};
const root=new URL("../",import.meta.url);

test("제품 찾아보기에는 국·영문 원본의 384개 품목과 해당 사진 파일이 연결된다", async () => {
  const pictures = new Set();
  for (const [language, lastPage] of [["ko", 17], ["en", 16]]) {
    const items = globalThis.HLBProducts[language];
    assert.equal(items.length, 384);
    assert.equal(new Set(items.map(item => item.id)).size, items.length);
    assert.equal(items[0].page, 2);
    assert.equal(items.at(-1).page, lastPage);
    assert.equal(items.filter(item => item.images.length).length, 352, language + " 원본 사진 보유 품목");
    for (const item of items) {
      assert.ok(item.name.trim(), item.id);
      for (const photo of item.images) {
        const url = new URL(photo.url, root);
        assert.ok(url.href.startsWith(new URL("assets/", root).href), item.id);
        pictures.add(url.href);
      }
    }
  }
  await Promise.all([...pictures].map(async href => assert.ok((await stat(new URL(href))).size > 0, href)));
});

test("모든 열람대의 자료에 팝업 안에서 읽을 본문이 있고, 로컬 원본은 실제 PDF이다",async()=>{
  const catalog=await globalThis.HLBCatalog.loadResources();
  assert.deepEqual(Object.keys(documents).sort(),catalog.map(r=>r.id).sort());
  for (const [id,doc] of Object.entries(documents)) {
    assert.ok(doc.sections?.some(s=>s.text?.trim() || s.items?.length || s.rows?.length>1),id);
    for (const section of doc.sections) if (section.rows?.length)
      assert.ok(section.rows.every(r=>Array.isArray(r) && r.length===section.rows[0].length),id+" 표 열 개수");
    if (!doc.media) continue;
    const url=new URL(doc.media.url,root);
    assert.ok(!/notion\.(site|so)$/i.test(url.hostname),id+" 노션 이동 금지");
    if (doc.media.type==="pdf") {
      assert.ok(url.href.startsWith(new URL("assets/reading/",root).href),id);
      const file=await open(url);
      try {
        const {buffer}=await file.read(Buffer.alloc(5),0,5,0);
        assert.equal(buffer.toString(),"%PDF-",id);
      } finally { await file.close(); }
    }
  }
});

test("에데꼬론의 디퓨저와 향 카트리지에 각각 해당 원본이 등록되어 있다",()=>{
  const expected = {
    "cologne-diffuser": "assets/reading/cologne/diffuser.pdf",
    "cologne-cartridges": "assets/reading/cologne/cartridges.pdf"
  };
  for (const [id, url] of Object.entries(expected)) {
    assert.equal(documents[id]?.media.type, "pdf", id);
    assert.equal(documents[id].media.url, url, id);
  }
});

test("개발 서버가 PDF 원본의 일부와 뷰어 모듈을 올바른 형식으로 전송한다", {timeout:12000},async t=>{
  const server=spawn(process.execPath,["scripts/serve.mjs"],{cwd:fileURLToPath(root),env:{...process.env,PORT:"0"},stdio:["ignore","pipe","pipe"],windowsHide:true});
  t.after(()=>{ server.kill(); });
  const [line]=await once(server.stdout,"data");
  const address=line.toString().match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
  assert.ok(address);
  const pdf=documents["cologne-cartridges"].media.url;
  const part=await fetch(new URL(pdf,address),{headers:{Range:"bytes=0-4"}});
  assert.equal(part.status,206);
  assert.equal(part.headers.get("Content-Type"),"application/pdf");
  assert.match(part.headers.get("Content-Range"),/^bytes 0-4\/\d+$/);
  assert.equal(await part.text(),"%PDF-");
  const bundle=await fetch(address+"assets/vendor/pdfjs/legacy/build/pdf.min.mjs",{method:"HEAD"});
  assert.equal(bundle.status,200);
  assert.match(bundle.headers.get("Content-Type"),/javascript/);
});
