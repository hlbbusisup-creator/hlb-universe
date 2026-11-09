import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createContext, runInContext} from "node:vm";
import test from "node:test";

const scripts = await Promise.all(["assets/vendor/three.min.js", "src/player3d.js"]
  .map(path => readFile(new URL("../" + path, import.meta.url), "utf8")));

function controls() {
  const page = new EventTarget();
  page.window = page;
  page.performance = performance;
  page.AbortController = AbortController;
  page.matchMedia = () => ({matches:false});
  page.document = Object.assign(new EventTarget(), {hidden:false, createElement:canvas});
  page.closest = selector => page.document.activeElement?.closest?.(selector);
  function canvas() {
    const element = new EventTarget();
    element.classList = {add() {}, remove() {}};
    element.focus = () => { page.document.activeElement = element; };
    element.getContext = () => ({
      fillRect() {}, fillText() {}, strokeRect() {},
      createRadialGradient:() => ({addColorStop() {}})
    });
    return element;
  }
  const context = createContext(page);
  for (const script of scripts) runInContext(script, context);
  const scene = new page.THREE.Scene();
  const camera = new page.THREE.PerspectiveCamera(55, 1.6, .1, 200);
  const actions = [];
  const world = {
    bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},
    colliders:[], spawn:{x:0,z:5}, spaces:[{id:"group",x:0,z:0}]
  };
  const player = page.HLBPlayer3D.create(scene,camera,canvas(),world,null,null,action => actions.push(action));
  const key = (type,code,flags={}) => {
    const event = new Event(type, {cancelable:true});
    Object.assign(event,{code,...flags});
    page.dispatchEvent(event);
    return event;
  };
  return {page,player,actions,key};
}

test("메뉴 버튼 포커스에서도 W+D+Space+F를 함께 누르면 이동·점프·폭죽을 각각 처리한다", () => {
  const {page,player,actions,key} = controls();
  try {
    page.document.activeElement = {closest:selector => selector === "button,a" ? {} : null};
    assert.equal(key("keydown","Space").defaultPrevented,false, "단독 스페이스는 버튼 동작을 보존");
    key("keyup","Space");
    const start = player.getPosition();
    for (const code of ["KeyW","KeyD","Space","KeyF"]) {
      assert.equal(key("keydown",code).defaultPrevented,true);
    }
    player.update(.05);
    const moved = player.getPosition();
    assert.ok(moved.x > start.x && moved.z < start.z);
    assert.ok(moved.y > start.y + .15);
    assert.ok(Math.abs(Math.hypot(moved.x-start.x,moved.z-start.z) - 4.8*.05) < .00001);
    assert.equal(actions.filter(action => action === "firework").length,1);
    key("keydown","KeyF",{repeat:true});
    key("keydown","KeyF");
    assert.equal(actions.filter(action => action === "firework").length,1);
    key("keyup","KeyF");
    key("keydown","KeyF");
    assert.equal(actions.filter(action => action === "firework").length,2);
    key("keyup","KeyD");
    player.update(.05);
    const forward = player.getPosition();
    assert.equal(forward.x,moved.x);
    assert.ok(forward.z < moved.z);
    key("keyup","KeyW");
    player.update(.05);
    assert.equal(player.getPosition().z,forward.z);
  } finally { player.dispose(); }
});

test("방향키 별칭과 반대 방향을 함께 누르고 개별 해제해도 남은 입력을 유지한다", () => {
  const {player,key} = controls();
  try {
    const start = player.getPosition();
    for (const code of ["KeyW","ArrowUp","KeyA","KeyD"]) key("keydown",code);
    player.update(.05);
    assert.equal(player.getPosition().x,start.x);
    key("keyup","KeyW");
    key("keyup","KeyA");
    const before = player.getPosition();
    player.update(.05);
    const after = player.getPosition();
    assert.ok(after.x > before.x && after.z < before.z);
    for (const code of ["ArrowUp","KeyD"]) key("keyup",code);
    player.update(.05);
    assert.equal(player.getPosition().x,after.x);
    assert.equal(player.getPosition().z,after.z);
  } finally { player.dispose(); }
});

test("포커스 상실·팝업·한글 조합은 입력을 해제하고 새 키를 눌러야 다시 움직인다", () => {
  const {page,player,actions,key} = controls();
  try {
    key("keydown","KeyW");
    player.update(.05);
    page.dispatchEvent(new Event("blur"));
    const start = player.getPosition();
    key("keydown","KeyW",{repeat:true});
    key("keydown","KeyF",{repeat:true});
    player.update(.05);
    assert.equal(player.getPosition().z,start.z);
    assert.equal(actions.filter(action => action === "firework").length,0);
    key("keyup","KeyW");
    key("keydown","KeyW");
    player.update(.05);
    assert.ok(player.getPosition().z < start.z);
    player.setActive(false);
    key("keydown","KeyD");
    key("keydown","Space");
    player.setActive(true);
    const paused = player.getPosition();
    key("keydown","KeyW",{repeat:true});
    player.update(.05);
    assert.deepEqual(player.getPosition(),paused);
    key("keydown","KeyD",{isComposing:true});
    player.update(.05);
    assert.deepEqual(player.getPosition(),paused);
    key("keydown","KeyW");
    page.document.dispatchEvent(new Event("compositionstart"));
    player.update(.05);
    assert.deepEqual(player.getPosition(),paused);
    key("keydown","KeyW",{ctrlKey:true});
    player.update(.05);
    assert.deepEqual(player.getPosition(),paused);
  } finally { player.dispose(); }
});
