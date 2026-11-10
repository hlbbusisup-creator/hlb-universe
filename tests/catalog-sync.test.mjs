import test from "node:test";
import assert from "node:assert/strict";
import "../src/catalog-data.js";
import "../src/catalog.js";

const catalog=globalThis.HLBCatalog;
const baseURI="https://example.com/hlb-universe/";
const resource={id:"new-brochure",space:"brand",title:"새 브로슈어",company:"HLB그룹",type:"브로슈어",language:"국문",
  description:"공개 노션에서 갱신한 자료",keywords:["신규"],url:"https://mysterious-bait-6ee.notion.site/new",
  reading:{sections:[{heading:"소개",text:"새 자료"}],media:{type:"pdf",url:"assets/reading/notion/new.pdf"}}};
const snapshot={schemaVersion:1,checkedAt:"2026-11-10T00:00:00.000Z",resources:[resource]};

test("노션 스냅샷을 읽으면 신규·변경·삭제를 반영하고 로컬 에데꼬론은 유지한다",async()=>{
  let requested;
  const resources=await catalog.loadResources({baseURI,fetcher:async(url,options)=>{
    requested=String(url);assert.equal(options.cache,"no-cache");
    return {ok:true,json:async()=>snapshot};
  }});
  assert.equal(requested,"https://example.com/hlb-universe/assets/reading/notion/catalog.json");
  assert.deepEqual(resources.map(r=>r.id).sort(),["cologne-cartridges","cologne-diffuser","new-brochure"]);
  assert.equal(resources.find(r=>r.id===resource.id).reading.media.url,resource.reading.media.url);
  assert.equal(catalog.getSyncState().status,"synced");
  assert.equal(catalog.getSyncState().updatedAt,snapshot.checkedAt);
});

test("일부 누락·중복·알 수 없는 전시관을 가진 스냅샷은 전체를 거절하고 저장된 기본자료를 쓴다",async()=>{
  for(const invalid of [null,{...snapshot,resources:[]},{...snapshot,resources:[resource,resource]},
    {...snapshot,resources:[{...resource,space:"unknown"}]},{...snapshot,resources:[{...resource,reading:null}]}]){
    const resources=await catalog.loadResources({baseURI,fetcher:async()=>({ok:true,json:async()=>invalid})});
    assert.equal(resources.length,globalThis.HLBCatalogData.resources.length);
    assert.equal(catalog.getSyncState().status,"bundled");
  }
});

test("동기화 파일 전송실패는 자료목록 자체를 중단시키지 않는다",async()=>{
  const resources=await catalog.loadResources({baseURI,fetcher:async()=>{throw new Error("offline")}});
  assert.ok(resources.some(r=>r.id==="brochure-ko"));
  assert.ok(resources.some(r=>r.id==="cologne-diffuser"));
});

test("재접속 중 전송이 실패하면 직전에 확인한 노션 자료를 복원한다",async()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  const saved=new Map();
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{
    getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)
  }});
  try {
    await catalog.loadResources({baseURI,fetcher:async()=>({ok:true,json:async()=>snapshot})});
    const resources=await catalog.loadResources({baseURI,fetcher:async()=>{throw new Error("offline")}});
    assert.ok(resources.some(r=>r.id===resource.id));
    assert.ok(!resources.some(r=>r.id==="brochure-ko"));
    assert.equal(catalog.getSyncState().status,"cached");
    assert.equal(catalog.getSyncState().updatedAt,snapshot.checkedAt);
  } finally {
    if(previous)Object.defineProperty(globalThis,"localStorage",previous);
    else delete globalThis.localStorage;
  }
});
