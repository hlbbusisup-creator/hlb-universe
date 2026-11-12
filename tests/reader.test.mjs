import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createContext,runInContext} from "node:vm";
import test from "node:test";

const paths=["src/catalog-data.js","src/reading-data.js","src/report-reading-data.js",
  "src/cologne-reading.js","src/product-data.js","src/product-library.js","src/reader.js"];
const scripts=await Promise.all(paths.map(path=>readFile(new URL("../"+path,import.meta.url),"utf8")));

class Element extends EventTarget {
  constructor(tag){
    super();this.tagName=tag.toUpperCase();this.childNodes=[];this.attributes=new Map();
    this.className="";this.hidden=false;this.value="";this._text="";
    this.classList={
      contains:name=>this.className.split(" ").includes(name),
      toggle:(name,enabled)=>{
        const names=new Set(this.className.split(" ").filter(Boolean));
        const add=enabled ?? !names.has(name);if(add)names.add(name);else names.delete(name);
        this.className=[...names].join(" ");return add;
      },
      add:name=>this.classList.toggle(name,true),remove:name=>this.classList.toggle(name,false)
    };
  }
  get textContent(){return this._text+this.childNodes.map(child=>child.textContent).join("");}
  set textContent(text){this._text=String(text);this.childNodes=[];}
  get childElementCount(){return this.childNodes.filter(child=>child.tagName!=="#TEXT").length;}
  append(...children){
    for(let child of children){
      if(typeof child==="string"){const text=new Element("#text");text.textContent=child;child=text;}
      if(child.tagName==="#FRAGMENT"){this.append(...child.childNodes);continue;}
      child.parentElement=this;this.childNodes.push(child);
    }
  }
  prepend(child){child.parentElement=this;this.childNodes.unshift(child);}
  replaceChildren(...children){this.childNodes=[];this._text="";this.append(...children);}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name) ?? null;}
  removeAttribute(name){this.attributes.delete(name);if(name==="src")delete this.src;}
  click(){this.dispatchEvent(new Event("click"));}
  pause(){this.paused=true;}
  load(){this.unloaded=true;}
  insertRow(){const row=new Element("tr");this.append(row);return row;}
  insertCell(){const cell=new Element("td");this.append(cell);return cell;}
  createTHead(){const head=new Element("thead");this.append(head);return head;}
  createTBody(){const body=new Element("tbody");this.append(body);return body;}
}
function descendants(element,predicate){
  return element.childNodes.flatMap(child=>[...(predicate(child)?[child]:[]),...descendants(child,predicate)]);
}
function reader(){
  const elements=new Map(),mounted=[],released=[],books=[];
  const get=id=>{
    if(!elements.has(id))elements.set(id,new Element(id.includes("mode")?"button":"div"));
    return elements.get(id);
  };
  const context=createContext({URL,navigator:{},location:new URL("https://hlb.example/hlb-universe/"),
    document:{baseURI:"https://hlb.example/hlb-universe/",getElementById:get,
      createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element("#fragment")},
    HLBPDFViewer:{mount(container,url,title){mounted.push({url,title});container.append(new Element("canvas"));
      return ()=>released.push(url);}},HLBProductBook:{open:(...args)=>books.push(args),close(){}}
  });
  scripts.forEach((script,index)=>runInContext(script,context,{filename:paths[index]}));
  return {api:context.HLBReader,context,get,mounted,released,books};
}

test("소셜미디어의 복수 링크와 빈 채널을 표시하고 검색한 행의 주소를 정확히 연결한다",()=>{
  const {api,get}=reader();
  const empty=()=>[[],[],[],[]];
  const links=[empty(),empty(),empty()];
  links[1][1]=[{label:"HLB 홈페이지",url:"https://hlbkorea.com/"},{label:"HLB 사이언스",url:"https://hlbscience.com/"}];
  links[1][2]=[{label:"HLB 유튜브",url:"https://www.youtube.com/@hlb3150"}];
  links[2][3]=[{label:"제약 인스타그램",url:"https://www.instagram.com/hlbpharma"}];
  api.open({id:"social",reading:{sections:[{heading:"소셜미디어",rows:[
    ["Company","Homepage","YouTube","Instagram"],["HLB 서울","홈페이지","유튜브",""],["HLB제약","","","인스타그램"]
  ],cellLinks:links}]}},"그룹안내소");
  const all=descendants(get("reader-body"),el=>el.tagName==="A");
  assert.equal(all.length,4);
  assert.deepEqual(all.map(link=>link.href),links.slice(1).flat(2).map(link=>link.url));
  assert.ok(all.every(link=>link.target==="_blank" && link.rel==="noopener noreferrer"));
  assert.ok(all.every(link=>link.getAttribute("aria-label").includes("새 탭")));
  assert.equal(descendants(get("reader-body"),el=>el.classList.contains("channel-empty")).length,3);
  get("reader-find").value="hlbpharma";
  get("reader-find").dispatchEvent(new Event("input"));
  const filtered=descendants(get("reader-body"),el=>el.tagName==="A");
  assert.equal(filtered.length,1);
  assert.equal(filtered[0].href,"https://www.instagram.com/hlbpharma");
  assert.match(get("reader-body").textContent,/HLB제약/);
  assert.doesNotMatch(get("reader-body").textContent,/HLB 서울/);
});

test("링크 주소는 http/https만 허용하고 원본 라벨을 HTML로 해석하지 않는다",()=>{
  const {api,get}=reader();
  api.open({id:"social",reading:{sections:[{rows:[["회사","링크"],["HLB","참고"]],cellLinks:[
    [[],[]],[[],[
      {label:"실행 금지",url:"javascript:alert(1)"},{label:"데이터 금지",url:"data:text/html,test"},
      {label:"인증 주소 금지",url:"https://user:secret@example.com"},
      {label:"<script>실행 금지</script>",url:"http://www.hlbkorea.com/"}
    ]]
  ]}]}},"그룹안내소");
  const links=descendants(get("reader-body"),el=>el.tagName==="A");
  assert.equal(links.length,1);
  assert.equal(links[0].textContent,"<script>실행 금지</script>");
  assert.equal(descendants(get("reader-body"),el=>el.tagName==="SCRIPT").length,0);
});

test("등록된 모든 PDF·영상·지도가 자료 클릭 즉시 팝업 미디어로 열린다",()=>{
  const {api,context,get,mounted}=reader();
  const documents={...context.HLBReadingData,...context.HLBReportReadingData,...context.HLBCologneReadingData};
  let mediaCount=0;
  for(const record of context.HLBCatalogData.resources){
    api.open(record,"전시관");
    if(!documents[record.id]?.media)continue;
    mediaCount++;
    assert.equal(get("reader-media").hidden,false,record.id);
    assert.equal(get("reader-text").hidden,true,record.id);
    assert.equal(get("reader-original-mode").getAttribute("aria-pressed"),"true",record.id);
    assert.equal(get("reader-body").childElementCount,0,"보조 본문은 선택할 때 렌더링");
    const frame=get("reader-media").childNodes[0];
    if(documents[record.id].media.type==="pdf")assert.equal(frame.tagName,"CANVAS");
    else{
      assert.equal(frame.tagName,"IFRAME");
      assert.ok(frame.src.startsWith("https://"));
      assert.equal(frame.getAttribute("sandbox"),"allow-scripts allow-same-origin allow-presentation");
    }
  }
  assert.ok(mediaCount>10);
  assert.ok(mounted.length>5);
});

test("동기화한 reading이 우선하며 동일 판본의 전체 제품 책과 정적 에데꼬론 설명을 보존한다",()=>{
  const {api,context,get,mounted,books}=reader();
  const sha256="a".repeat(64);
  context.HLBProductSourceHashes={ko:sha256};
  api.open({id:"products-ko",title:"새 카탈로그",reading:{summary:"새 자료 소개",sections:[],
    media:{kind:"pdf",url:"assets/reading/notion/new-catalog.pdf",sha256}}},"제품전시관");
  assert.match(mounted.at(-1).url,/\/assets\/reading\/notion\/new-catalog\.pdf$/);
  assert.equal(mounted.at(-1).title,"새 카탈로그");
  assert.equal(get("reader-text-mode").textContent,"제품 찾아보기");
  get("reader-text-mode").click();
  const products=descendants(get("reader-body"),element=>element.classList.contains("product-row"));
  assert.equal(products.length,context.HLBProducts.ko.length);
  products.at(-1).click();
  assert.equal(books[0][0],context.HLBProducts.ko);
  assert.equal(books[0][1],products.length-1);
  assert.equal(books[0][3],"ko");
  assert.match(get("reader-body").textContent,/새 자료 소개/);
  api.open({id:"cologne-cartridges",title:"향 카트리지"},"에데꼬론");
  assert.equal(get("reader-media").hidden,false);
  assert.equal(get("reader-text-mode").textContent,"제품 설명");
  get("reader-text-mode").click();
  assert.equal(descendants(get("reader-body"),element=>element.classList.contains("scent-choice")).length,9);
  assert.ok(descendants(get("reader-body"),element=>element.classList.contains("exhibit-photo")).length);
});

test("제품 목록과 책이 같은 검색 결과를 공유하며 검색한 행으로 돌아갈 수 있다",()=>{
  const {api,get,books,context}=reader();
  api.open({id:"products-ko"},"제품전시관");
  get("reader-text-mode").click();
  const find=get("reader-find"), products=context.HLBProducts.ko;
  const choice=products.find(product => product.brand && products.some(other => other.brand && other.brand !== product.brand));
  find.value=choice.brand;
  find.dispatchEvent(new Event("input"));
  const rows=descendants(get("reader-body"),element=>element.classList.contains("product-row"));
  rows.at(-1).click();
  const [items,index,opener,,options]=books[0];
  assert.equal(items.length,rows.length);
  assert.ok(items.length>0 && items.length<products.length);
  assert.equal(items[index].id,opener.getAttribute("data-product-id"));
  assert.equal(opener,rows.at(-1));
  assert.equal(options.filtered,true);
  assert.equal(find.value,choice.brand);
});

test("동기화한 새 본문은 과거 설명을 덮어쓰고 다른 판본의 정적 제품 책을 표시하지 않는다",()=>{
  const {api,context,get}=reader();
  context.HLBProductSourceHashes={ko:"a".repeat(64)};
  for(const sha256 of ["b".repeat(64),undefined]){
    api.open({id:"products-ko",reading:{summary:"이번 판본 소개",sections:[],
      media:{kind:"pdf",url:"assets/reading/notion/latest.pdf",sha256}}},"제품전시관");
    assert.equal(get("reader-text-mode").textContent,"자료 내용");
    assert.match(get("reader-media").textContent,/제품별 미리보기가 없는 판본/);
    get("reader-text-mode").click();
    assert.equal(descendants(get("reader-body"),element=>element.classList.contains("product-row")).length,0);
    assert.equal(get("reader-body").textContent,"이번 판본 소개");
  }
  api.open({id:"cologne-cartridges",reading:{summary:"새로 작성된 설명",sections:[]}},"에데꼬론");
  assert.equal(get("reader-body").textContent,"새로 작성된 설명");
  assert.equal(descendants(get("reader-body"),element=>element.classList.contains("scent-choice")).length,0);
  assert.equal(get("reader-pane").classList.contains("exhibit-reader"),false);
});

test("검증된 영상·지도 주소만 임베드하고 임의 도메인·경로는 본문으로 대체한다",()=>{
  const {api,get}=reader();
  const open=url=>api.open({id:"new",title:"동기화 자료",reading:{summary:"본문 설명",sections:[],
    media:{kind:"embed",url}}},"자료관");
  for(const [url,expected] of [
    ["https://youtu.be/vI5Rn3avG6A","https://www.youtube-nocookie.com/embed/vI5Rn3avG6A?rel=0"],
    ["https://www.youtube.com/watch?v=vI5Rn3avG6A","https://www.youtube-nocookie.com/embed/vI5Rn3avG6A?rel=0"],
    ["https://drive.google.com/file/d/movie_123/view?usp=sharing","https://drive.google.com/file/d/movie_123/preview"],
    ["https://www.google.com/maps/d/viewer?mid=map_123","https://www.google.com/maps/d/embed?mid=map_123"]
  ]){
    open(url);assert.equal(get("reader-media").childNodes[0].src,expected);
    assert.equal(get("reader-text").hidden,true);
  }
  for(const url of ["javascript:alert(1)","https://notion.site/private", "https://example.com/embed/movie",
    "https://www.youtube.com.evil.example/embed/movie","https://user@www.youtube.com/embed/movie",
    "https://www.youtube.com:444/embed/movie","https://www.google.com/search?q=HLB",
    "assets/reading/notion/untrusted.html"]){
    open(url);assert.equal(get("reader-media").hidden,true,url);
    assert.equal(get("reader-media").childElementCount,0,url);
    assert.equal(get("reader-text").hidden,false,url);
    assert.match(get("reader-body").textContent,/본문 설명/);
  }
  api.open({id:"traversal",reading:{media:{kind:"pdf",url:"assets/reading/%2e%2e%2fother.pdf"}}},"자료관");
  assert.equal(get("reader-media").hidden,true);
});

test("다른 자료·본문 탭·닫기로 전환하면 이전 PDF와 영상 재생을 해제한다",()=>{
  const {api,get,mounted,released}=reader();
  api.open({id:"products-ko"},"제품전시관");
  get("reader-text-mode").click();assert.equal(released.length,1);
  get("reader-original-mode").click();assert.equal(mounted.length,2);
  api.open({id:"movie",reading:{media:{kind:"video",url:"assets/reading/notion/film.mp4"}}},"브랜드관");
  assert.equal(released.length,2);
  const video=get("reader-media").childNodes[0];
  assert.equal(video.tagName,"VIDEO");assert.equal(video.controls,true);assert.equal(video.playsInline,true);
  api.clear();
  assert.equal(video.paused,true);assert.equal(video.unloaded,true);assert.equal(video.src,undefined);
  assert.equal(get("reader-media").childElementCount,0);
  assert.equal(get("reader-body").childElementCount,0);
});

test("여러 첨부 중 첫 자료를 바로 열고 같은 팝업에서 전환하며 판본별 제품 책을 검증한다",()=>{
  const {api,context,get,mounted,released}=reader();
  const sha256="c".repeat(64);
  context.HLBProductSourceHashes={ko:sha256};
  const primary={type:"pdf",url:"assets/reading/notion/catalog.pdf",title:"제품 카탈로그",sha256};
  api.open({id:"products-ko",reading:{summary:"첨부 자료 안내",media:primary,attachments:[primary,
    {type:"embed",url:"https://notion.site/external",title:"임의 페이지"},
    {type:"pdf",url:"assets/reading/notion/new-edition.pdf",title:"다른 판본",sha256:"d".repeat(64)}]}},"제품전시관");
  const chooser=()=>descendants(get("reader-media"),element=>element.tagName==="SELECT")[0];
  assert.equal(chooser().childElementCount,2,"중복과 허용되지 않은 외부 주소 제외");
  assert.equal(chooser().value,"0");
  assert.match(mounted[0].url,/\/catalog\.pdf$/);
  assert.equal(get("reader-text-mode").textContent,"제품 찾아보기");
  chooser().value="1";chooser().dispatchEvent(new Event("change"));
  assert.equal(released.length,1);
  assert.match(mounted.at(-1).url,/\/new-edition\.pdf$/);
  assert.equal(get("reader-text-mode").textContent,"자료 내용");
  assert.equal(get("reader-media").hidden,false);
  assert.equal(chooser().value,"1");
  chooser().value="0";chooser().dispatchEvent(new Event("change"));
  assert.equal(get("reader-text-mode").textContent,"제품 찾아보기");
  api.open({id:"attachments-only",reading:{attachments:[primary]}},"자료관");
  assert.match(mounted.at(-1).url,/\/catalog\.pdf$/);
  assert.equal(get("reader-text").hidden,true);
  assert.equal(chooser(),undefined,"첨부 한 개는 선택 단계 없이 바로 열림");
});
