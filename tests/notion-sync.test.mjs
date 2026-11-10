import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp,readFile,writeFile,mkdir,rm,readdir} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {crawlNotion,extractResources,synchronize,checkedURL,isPublicAddress,extractHeyzinePDF,richText,richLinks} from "../scripts/sync-notion.mjs";

const id=n=>"aaaaaaaa-aaaa-aaaa-aaaa-"+String(n).padStart(12,"0");
const rich=value=>[[value]];
const wrapped=value=>({value:{value,role:"reader"}});
const pdf=Buffer.from("%PDF-1.7\npublic test document\n%%EOF\n");
const digest=value=>createHash("sha256").update(value).digest("hex");

function fixture() {
  const blocks={
    [id(1)]:{id:id(1),type:"page",properties:{title:rich("Public InfoBank")},content:[id(2),id(3),id(4)]},
    [id(2)]:{id:id(2),type:"page",properties:{title:rich("[HLB] 최신 제품 리스트")},content:[id(5),id(6)]},
    [id(3)]:{id:id(3),type:"page",properties:{title:rich("신규 회사별 연락처")},content:[id(7)]},
    [id(4)]:{id:id(4),type:"collection_view_page",view_ids:[id(11)],collection_id:id(12)},
    [id(5)]:{id:id(5),type:"embed",properties:{source:rich("https://heyzine.com/flip-book/public.html")}},
    [id(6)]:{id:id(6),type:"text",properties:{title:rich("제품 정보가 새롭게 변경되었습니다.")}},
    [id(7)]:{id:id(7),type:"table",format:{table_block_column_order:["name","phone"],table_block_column_header:true},content:[id(8),id(9)]},
    [id(8)]:{id:id(8),type:"table_row",properties:{name:rich("회사"),phone:rich("전화")}},
    [id(9)]:{id:id(9),type:"table_row",properties:{name:rich("HLB"),phone:rich("02-123-4567")}},
    [id(10)]:{id:id(10),type:"page",parent_table:"collection",properties:{title:rich("HLB"),vision:rich("Human Life Better")}},
    [id(99)]:{id:id(99),type:"page",properties:{title:rich("Unrelated ancestry")}}
  };
  const config={source:"https://example.notion.site/"+id(1),rootPageId:id(1),output:"assets/reading/notion/catalog.json",
    downloadHosts:["heyzine.com","cdnm.heyzine.com"],records:{[id(2)]:{id:"products-ko",space:"product"}},
    limits:{maxBlocks:50,maxPages:10,maxApiRequests:50,maxCollectionRows:100,maxDownloads:10,maxPdfBytes:1000,maxTotalBytes:2000}};
  const calls=[];
  const controls={corruptPDF:false,incomplete:false,truncated:false,pdfStatus:200,pdfBytes:pdf};
  const request=async (raw,options={})=>{
    const url=new URL(raw);calls.push({url,options});
    const json=value=>({status:200,headers:{},body:Buffer.from(JSON.stringify(value))});
    if(url.pathname.endsWith("loadPageChunk"))return json({cursor:{stack:[]},recordMap:{block:{[id(1)]:wrapped(blocks[id(1)]),[id(99)]:wrapped(blocks[id(99)])}}});
    if(url.pathname.endsWith("getRecordValues")) {
      const requests=JSON.parse(options.body).requests;
      return json({results:requests.map(({id:recordId,table})=>{
        if(controls.incomplete&&recordId===id(3))return {role:"none"};
        if(table==="collection_view")return {value:{id:recordId,format:{collection_pointer:{id:id(12)}}}};
        if(table==="collection")return {value:{id:recordId,name:rich("HLB 비전과 슬로건"),schema:{vision:{name:"비전",type:"text"},title:{name:"법인명",type:"title"},...(controls.image?{image:{name:"이미지",type:"file"}}:{})}}};
        return {value:blocks[recordId],role:"reader"};
      })});
    }
    if(url.pathname.endsWith("queryCollection"))return json({result:{reducerResults:{collection_group_results:{blockIds:[id(10)],hasMore:controls.truncated}}},recordMap:{block:{[id(10)]:wrapped(blocks[id(10)])}}});
    if(url.pathname.endsWith("getSignedFileUrls"))return json({signedUrls:["https://cdnm.heyzine.com/public-vision.jpg?temporary=123"]});
    if(url.hostname==="heyzine.com")return {status:200,headers:{},body:Buffer.from('<a href="https://cdnm.heyzine.com/flip-book/pdf/public.pdf" id="btnDownPdf">Download</a>')};
    if(url.pathname.endsWith(".jpg"))return {status:200,headers:{"content-type":"image/jpeg"},body:controls.badImage?Buffer.from("<html>Error</html>"):Buffer.from([255,216,255,224,0,0,255,217])};
    if(url.hostname==="cdnm.heyzine.com")return {status:controls.pdfStatus,headers:{etag:'"version-one"',"last-modified":"Tue, 10 Nov 2026 00:00:00 GMT"},body:controls.corruptPDF?Buffer.from("<html>Error</html>"):controls.pdfBytes};
    throw new Error("Unexpected request: "+url.href);
  };
  return {blocks,config,controls,calls,request};
}

async function workspace(t) {
  const root=await mkdtemp(path.join(os.tmpdir(),"hlb-notion-test-"));
  t.after(()=>rm(root,{recursive:true,force:true}));
  return root;
}
const silent=()=>{};

test("Crawl follows only public descendants, includes full tables and keeps stable legacy IDs",async()=>{
  const f=fixture();
  const tree=await crawlNotion(f.config,{request:f.request});
  const resources=extractResources(tree,f.config);
  assert.equal(resources.length,3);
  assert.equal(resources[0].id,"products-ko");
  assert.equal(resources[0].title,"[HLB] 최신 제품 리스트");
  assert.equal(resources[0].space,"product");
  assert.equal(resources.some(resource=>resource.title.includes("Unrelated")),false);
  assert.deepEqual(resources[1].reading.sections[0].rows,[["회사","전화"],["HLB","02-123-4567"]]);
  assert.deepEqual(resources[2].reading.sections[0].rows,[["법인명","비전"],["HLB","Human Life Better"]]);
  assert.equal(resources.some(resource=>resource.notionPageId===id(10)),false,"Database rows remain inside their table");
});

test("Public workspace routing is derived from the root response and passed without authentication tokens",async()=>{
  const f=fixture();
  f.blocks[id(1)].space_id=id(90);
  await crawlNotion(f.config,{request:f.request});
  const calls=f.calls.filter(call=>call.url.pathname.endsWith("getRecordValues"));
  assert.ok(calls.length>0);
  for(const {options} of calls) {
    const body=JSON.parse(options.body);
    assert.equal(body.spaceId,id(90));
    assert.ok(body.requests.every(record=>record.spaceId===id(90)));
    assert.equal(options.headers["x-notion-space-id"],id(90));
    assert.equal(Object.keys(options.headers).some(key=>/authorization|cookie|token/i.test(key)),false);
  }
  assert.equal(f.config.spaceId,undefined,"Workspace identity is discovered, not hardcoded in config");
});

test("Notion link mentions, ordinary links and plain URLs retain all destinations and separate adjacent accounts",()=>{
  const value=[
    ["‣",[["lm",{href:"http://www.hlbkorea.com/",title:"에이치엘비 (HLB)"}]]],
    ["            "],
    ["‣",[["lm",{href:"https://www.hlbscience.com/",title:"HLB사이언스"}]]],
    ["\n"],
    ["‣\n",[["a","https://www.instagram.com/hey_theriver/"]]],
    ["‣",[["lm",{href:"https://www.instagram.com/hey_theriver/",title:"Instagram"}]]],
    ["\nhttps://www.facebook.com/hlbeng"]
  ];
  assert.deepEqual(richLinks(value),[
    {label:"에이치엘비 (HLB)",url:"http://www.hlbkorea.com/"},
    {label:"HLB사이언스",url:"https://www.hlbscience.com/"},
    {label:"https://www.instagram.com/hey_theriver/",url:"https://www.instagram.com/hey_theriver/"},
    {label:"https://www.facebook.com/hlbeng",url:"https://www.facebook.com/hlbeng"}
  ],"All unique destinations survive, including the same URL represented as both a and lm");
  const rendered=richText(value);
  assert.equal(rendered.includes("‣"),false);
  assert.match(rendered,/hlbkorea\.com\/\)\nHLB사이언스/);
  for(const {url} of richLinks(value))assert.ok(rendered.includes(url),url);
  assert.deepEqual(richLinks([["‣",[["lm",{href:"javascript:alert(1)",title:"Unsafe"}]]],
    ["private",[["a","https://user:password@example.com/"]]]]),[]);
});

test("Table cellLinks aligns with every row and column while empty cells and text search remain intact",async()=>{
  const f=fixture();
  f.blocks[id(9)].properties.phone=[
    ["‣",[["lm",{href:"https://www.youtube.com/channel/UCn020Wkln53fpx32DO1wYmQ",title:"HLB에이치엘비"}]]],
    [" "],["‣",[["lm",{href:"https://www.youtube.com/@hlb3150",title:"HLB사이언스"}]]]
  ];
  const record=extractResources(await crawlNotion(f.config,{request:f.request}),f.config)
    .find(resource=>resource.notionPageId===id(3));
  const section=record.reading.sections[0];
  assert.equal(section.cellLinks.length,section.rows.length);
  section.rows.forEach((row,index)=>assert.equal(section.cellLinks[index].length,row.length));
  assert.deepEqual(section.cellLinks[0],[[],[]],"Header cells are not data links");
  assert.deepEqual(section.cellLinks[1][0],[],"Company names remain ordinary searchable text");
  assert.equal(section.cellLinks[1][1].length,2);
  assert.match(section.rows[1][1],/HLB에이치엘비.*\nHLB사이언스/);
  assert.equal(section.cellLinks[1][1][1].url,"https://www.youtube.com/@hlb3150");
});

test("A complete sync installs verified PDFs, reflects additions/removals, and preserves unchanged timestamps",async t=>{
  const root=await workspace(t),f=fixture(),options={root,config:f.config,request:f.request,log:silent};
  const result=await synchronize({...options,now:()=>"2026-11-10T00:00:00.000Z"});
  assert.equal(result.changed,true);
  const filename=path.join(root,f.config.output);
  const first=await readFile(filename,"utf8"),snapshot=JSON.parse(first);
  assert.equal(snapshot.resources.length,3);
  assert.equal(snapshot.resources[0].reading.media.sha256,digest(pdf));
  assert.deepEqual(await readFile(path.join(root,snapshot.resources[0].reading.media.url)),pdf);
  assert.equal(snapshot.files[0].etag,'"version-one"');
  f.controls.pdfStatus=304;
  assert.equal((await synchronize({...options,now:()=>"2026-11-11T00:00:00.000Z"})).changed,false);
  assert.equal(await readFile(filename,"utf8"),first,"No checkedAt-only commit when source content is unchanged");
  assert.equal(f.calls.filter(call=>call.url.hostname==="cdnm.heyzine.com").at(-1).options.headers["if-none-match"],'"version-one"');
  f.blocks[id(1)].content=[id(2),id(4)];
  f.blocks[id(2)].properties.title=rich("[HLB] 이름을 변경한 제품 리스트");
  await synchronize({...options,now:()=>"2026-11-12T00:00:00.000Z"});
  const changed=JSON.parse(await readFile(filename,"utf8"));
  assert.equal(changed.resources.length,2,"Removed page is not carried over from the old catalog");
  assert.equal(changed.resources[0].id,"products-ko");
  assert.equal(changed.resources[0].title,"[HLB] 이름을 변경한 제품 리스트");
  assert.notEqual(changed.contentHash,snapshot.contentHash);
});

test("Incomplete trees, truncated collections and invalid PDF downloads retain the last complete snapshot",async t=>{
  const root=await workspace(t),f=fixture(),options={root,config:f.config,request:f.request,log:silent};
  await synchronize(options);
  const filename=path.join(root,f.config.output),before=await readFile(filename,"utf8");
  const oldPDF=JSON.parse(before).resources[0].reading.media.url;
  for(const control of ["incomplete","truncated","corruptPDF"]) {
    f.controls[control]=true;
    await assert.rejects(synchronize(options));
    assert.equal(await readFile(filename,"utf8"),before,control+" cannot publish a partial catalog");
    assert.deepEqual(await readFile(path.join(root,oldPDF)),pdf);
    f.controls[control]=false;
  }
  assert.deepEqual(await readdir(path.join(root,"dist")),[],"Staging downloads are cleaned on failure");
});

test("A changed PDF updates its content hash; file and aggregate size limits prevent publication",async t=>{
  const root=await workspace(t),f=fixture(),options={root,config:f.config,request:f.request,log:silent};
  await synchronize(options);
  const filename=path.join(root,f.config.output),original=JSON.parse(await readFile(filename,"utf8"));
  const filesDirectory=path.dirname(path.join(root,original.resources[0].reading.media.url));
  await writeFile(path.join(filesDirectory,"keep-user-note.txt"),"not a generated attachment");
  f.controls.pdfBytes=Buffer.from("%PDF-1.7\nnew product edition\n%%EOF\n");
  await synchronize(options);
  const next=await readFile(filename,"utf8"),updated=JSON.parse(next);
  assert.notEqual(updated.resources[0].reading.media.sha256,original.resources[0].reading.media.sha256);
  assert.notEqual(updated.resources[0].contentHash,original.resources[0].contentHash);
  await assert.rejects(readFile(path.join(root,original.resources[0].reading.media.url)),{code:"ENOENT"},"Remove old content-addressed files only after a successful replacement");
  assert.equal(await readFile(path.join(filesDirectory,"keep-user-note.txt"),"utf8"),"not a generated attachment");
  f.config.limits.maxPdfBytes=10;
  await assert.rejects(synchronize(options),/size limit/);
  assert.equal(await readFile(filename,"utf8"),next);
  f.config.limits.maxPdfBytes=1000;f.config.limits.maxTotalBytes=10;
  await assert.rejects(synchronize(options),/size limit/);
  assert.equal(await readFile(filename,"utf8"),next);
});

test("Collection file images are signed anonymously, validated, mirrored and retained on failure",async t=>{
  const root=await workspace(t),f=fixture();
  f.controls.image=true;
  const attachment="attachment:"+id(20)+":vision.jpg";
  f.blocks[id(10)].properties.image=[["vision.jpg",[["a",attachment]]]];
  const options={root,config:f.config,request:f.request,log:silent};
  await synchronize(options);
  const filename=path.join(root,f.config.output),before=await readFile(filename,"utf8"),snapshot=JSON.parse(before);
  const image=snapshot.resources.find(resource=>resource.notionPageId===id(4)).reading.media;
  assert.equal(image.type,"image");
  assert.match(image.url,/\/files\/[a-f0-9]{64}\.jpg$/);
  assert.equal(image.source,attachment,"Keep the stable attachment identity, not an expiring signed URL");
  assert.equal(image.sha256,digest(await readFile(path.join(root,image.url))));
  assert.equal(snapshot.files.length,2);
  f.controls.badImage=true;
  await assert.rejects(synchronize(options),/invalid image/);
  assert.equal(await readFile(filename,"utf8"),before);
});

test("Explicit title language wins, while an English company title respects its Chinese section",async()=>{
  const f=fixture();
  f.blocks[id(13)]={id:id(13),type:"header",properties:{title:rich("HLB그룹 브로슈어 (HLB Group Brochure)")}};
  f.blocks[id(14)]={id:id(14),type:"sub_header",properties:{title:rich("中國語")}};
  f.blocks[id(1)].content=[id(13),id(2),id(14),id(3),id(4)];
  f.blocks[id(2)].properties.title=rich("[HLB그룹] 브로슈어 (국문)");
  f.blocks[id(3)].properties.title=rich("[Freshico, CoreBio] Company Profile");
  const resources=extractResources(await crawlNotion(f.config,{request:f.request}),f.config);
  assert.equal(resources[0].language,"국문");
  assert.equal(resources[1].language,"중문");
});

test("Download URLs and DNS cannot target private networks or unexpected hosts",()=>{
  const allowed=["heyzine.com","cdnm.heyzine.com"];
  assert.equal(checkedURL("https://cdnm.heyzine.com/book.pdf",allowed).hostname,"cdnm.heyzine.com");
  for(const raw of ["http://heyzine.com/a.pdf","https://user:pass@heyzine.com/a.pdf","https://heyzine.com:8443/a.pdf",
    "https://heyzine.com.attacker.invalid/a.pdf","https://127.0.0.1/a.pdf","file:///private.pdf","https://[::1]/a.pdf"])
    assert.throws(()=>checkedURL(raw,allowed));
  for(const address of ["127.0.0.1","10.0.0.1","172.16.1.1","192.168.1.1","169.254.169.254","100.64.0.1","::1","::ffff:127.0.0.1","fe80::1","fd00::1"])assert.equal(isPublicAddress(address),false,address);
  for(const address of ["1.1.1.1","8.8.8.8","2606:4700:4700::1111"])assert.equal(isPublicAddress(address),true,address);
});

test("Heyzine discovery reads the public download link without evaluating remote scripts",()=>{
  assert.equal(extractHeyzinePDF('<script>throw new Error("do not run")</script><a id="btnDownPdf" href="/file.pdf?a=1&amp;b=2">PDF</a>',"https://heyzine.com/flip-book/test.html"),"https://heyzine.com/file.pdf?a=1&b=2");
  assert.equal(extractHeyzinePDF('<script>window.pdf="https://internal/file.pdf"</script>',"https://heyzine.com/"),null);
});
