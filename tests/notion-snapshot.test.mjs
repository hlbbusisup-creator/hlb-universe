import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import "../src/catalog-data.js";
import "../src/catalog.js";

test("배포하는 노션 스냅샷의 모든 첨부와 카탈로그를 실제 파일로 검증한다",async()=>{
  const root=new URL("../",import.meta.url);
  const snapshot=JSON.parse(await readFile(new URL("assets/reading/notion/catalog.json",root),"utf8"));
  const files=new Map();
  for(const file of snapshot.files){
    assert.match(file.url,/^assets\/reading\/notion\/files\/[a-f0-9]{64}\.(?:pdf|jpg|png|webp)$/);
    if(!files.has(file.url)){
      const bytes=await readFile(new URL(file.url,root));
      if(file.url.endsWith(".pdf"))assert.equal(bytes.subarray(0,5).toString(),"%PDF-");
      else if(file.url.endsWith(".jpg"))assert.deepEqual([...bytes.subarray(0,3)],[255,216,255]);
      else if(file.url.endsWith(".png"))assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
      else assert.equal(bytes.subarray(8,12).toString(),"WEBP");
      assert.equal(bytes.length,file.bytes);
      assert.equal(createHash("sha256").update(bytes).digest("hex"),file.sha256);
      files.set(file.url,file);
    }
  }
  assert.ok(files.size>0);
  for(const resource of snapshot.resources){
    assert.equal(resource.pendingMedia,undefined);
    for(const media of [resource.reading.media,...(resource.reading.attachments??[])].filter(Boolean)){
      if(["pdf","image"].includes(media.type)){
        assert.ok(files.has(media.url),resource.title+" 첨부 파일이 있어야 합니다");
        assert.equal(files.get(media.url).sha256,media.sha256);
      }
    }
  }
  const resources=await HLBCatalog.loadResources({baseURI:"https://example.com/hlb-universe/",
    fetcher:async()=>({ok:true,json:async()=>snapshot})});
  assert.equal(HLBCatalog.getSyncState().status,"synced");
  assert.equal(resources.length,snapshot.resources.length+2);
});
