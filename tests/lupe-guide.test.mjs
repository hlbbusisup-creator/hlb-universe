import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {runInNewContext} from "node:vm";

const script=await readFile(new URL("../src/lupe-guide.js",import.meta.url),"utf8");
const halls=Object.fromEntries([
  ["group","그룹안내소"],["product","제품전시관"],["history","HLB 역사관"],["cafe","카페 렌토"]
].map(([id,title])=>[id,{id,title}]));

function setup({voice=true}={}) {
  const elements=new Map(), walks=[], spoken=[];
  const state={aboard:false,nearest:"group",available:true,stopped:0,cancelled:0};
  function el(id) {
    if (!elements.has(id)) {
      const element=new EventTarget();
      Object.assign(element,{dataset:{},hidden:false,textContent:"",setAttribute(){},focus(){},
        click(){this.dispatchEvent(new Event("click"));}});
      elements.set(id,element);
    }
    return elements.get(id);
  }
  const page={document:{getElementById:el}};
  page.window=page;
  if (voice) {
    page.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
    page.speechSynthesis={speak:line=>spoken.push(line),cancel:()=>{state.cancelled++;}};
  }
  runInNewContext(script,page);
  const guide=page.HLBLupeGuide.create({
    nearest:()=>halls[state.nearest],space:id=>halls[id],walk:hall=>{walks.push(hall.id);return true;},
    riding:()=>state.aboard,available:()=>state.available,stop:()=>{state.stopped++;},
  });
  const button=suffix=>el("lupe-"+suffix);
  return {guide,button,state,walks,spoken};
}

test("동의를 받은 루페가 세 전시관을 방문하며 사용자가 다음 장소를 선택할 때까지 기다린다",()=>{
  const {guide,button,walks}=setup();
  guide.enter(true);
  assert.equal(button("copy").textContent,"안녕하세요 저는 루페에요! 처음 방문하셨으면 제가 안내해드려도 괜찮을까요?");
  assert.equal(button("actions").hidden,true);
  guide.menu(); // Scene pick or equivalent accessible menu.
  assert.deepEqual(walks,[]);
  for(const [i,id] of ["group","product","history"].entries()) {
    button("tour").click();
    assert.equal(walks.length,i+1);
    assert.equal(walks[i],id);
    guide.arrived();guide.tick();
    assert.match(button("title").textContent,new RegExp(halls[id].title));
    assert.equal(button("card").hidden,false);
  }
  assert.equal(button("tour").textContent,"관람 마치기");
  button("tour").click();
  assert.equal(button("end").hidden,true);
  assert.equal(button("tour").textContent,"HLB 둘러보기");
});

test("자유 이동 후 동일 전시관에서 코스를 재개하고, 직접 종료하면 다시 이동하지 않는다",()=>{
  const {guide,button,state,walks}=setup();
  guide.menu();button("tour").click();guide.arrived();button("tour").click();
  guide.interrupt();guide.arrived();guide.menu();
  assert.equal(button("tour").textContent,"HLB 둘러보기 계속하기");
  button("tour").click();
  assert.deepEqual(walks,["group","product","product"]);
  guide.menu();button("end").click();guide.tick();
  assert.equal(state.stopped,1);
  assert.equal(walks.length,3);
});

test("블랙캣에서 요청한 안내는 하선 후 한 번만 시작하며, 하선 전에 취소할 수 있다",()=>{
  const {guide,button,state,walks}=setup();
  state.aboard=true;
  guide.menu();button("tour").click();guide.tick();
  assert.deepEqual(walks,[]);
  button("end").click();
  state.aboard=false;guide.tick();
  assert.deepEqual(walks,[]);
  state.aboard=true;guide.menu();button("tour").click();guide.tick();
  state.aboard=false;state.available=false;guide.tick();
  assert.deepEqual(walks,[]);
  state.available=true;guide.tick();guide.tick();
  assert.deepEqual(walks,["group"]);
});

test("현재 건물의 설명을 한국어로 들려주고, 이동하면 근처 건물 이름과 내용을 갱신한다",()=>{
  const {guide,button,state,spoken}=setup();
  state.nearest="cafe";
  guide.menu();
  assert.equal(button("near").textContent,"카페 렌토 둘러보기");
  button("near").click();
  assert.equal(spoken.length,1);
  assert.equal(spoken[0].lang,"ko-KR");
  assert.match(spoken[0].text,/주문대/);
  assert.equal(button("copy").textContent,spoken[0].text);
  state.nearest="history";
  guide.tick();
  assert.equal(state.cancelled,1);
  assert.equal(button("near").textContent,"HLB 역사관 둘러보기");
  button("near").click();
  assert.match(spoken[1].text,/제단/);
  button("voice").click();
  assert.equal(state.cancelled,2);
});

test("기기에 음성 합성이 없어도 근처 건물의 이야기를 읽을 수 있다",()=>{
  const {guide,button}=setup({voice:false});
  guide.menu();button("near").click();
  assert.match(button("copy").textContent,/그룹안내소/);
  assert.equal(button("voice").hidden,true);
});
