import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createContext, runInContext} from "node:vm";
import test from "node:test";

const scripts=await Promise.all(["assets/vendor/three.min.js","src/player3d.js"]
  .map(path=>readFile(new URL("../"+path,import.meta.url),"utf8")));

function visitor(t,{reducedMotion=false}={}) {
  const page=new EventTarget();
  page.window=page;page.performance=performance;page.AbortController=AbortController;
  page.matchMedia=()=>({matches:reducedMotion});
  const canvas=()=>Object.assign(new EventTarget(),{
    classList:{add(){},remove(){}},focus(){},
    getContext:()=>({fillRect(){},fillText(){},strokeRect(){},
      createRadialGradient:()=>({addColorStop(){}})})
  });
  page.document=Object.assign(new EventTarget(),{hidden:false,createElement:canvas});
  const context=createContext(page);
  scripts.forEach(script=>runInContext(script,context));
  const T=page.THREE, scene=new T.Scene(), camera=new T.PerspectiveCamera(55,1.6,.1,200);
  const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},colliders:[],
    spawn:{x:0,z:0},spaces:[{id:"group",x:0,z:-50}]};
  const player=page.HLBPlayer3D.create(scene,camera,canvas(),world);
  const avatar=scene.getObjectByName("campus-visitor");
  const head=avatar.getObjectByName("visitor-head"), chest=head.parent, hips=chest.parent;
  const thighs=hips.children.filter(object=>object.isGroup && object!==chest);
  const hands=["left","right"].map(side=>avatar.getObjectByName("visitor-"+side+"-hand"));
  const elbows=hands.map(hand=>hand.parent);
  const tick=(seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)player.update(1/60);};
  t.after(()=>player.dispose());
  return {T,player,avatar,hips,chest,head,thighs,hands,elbows,tick,camera};
}

test("조깅은 이동속도를 유지하면서 초당 2~3보로 움직이고 멈추면 자세가 풀린다",t=>{
  const {player,hips,chest,head,thighs,elbows,tick}=visitor(t);
  player.setStick(0,1);tick(1);
  const start=player.getPosition(), heights=[], bends=[], angles=[];
  let previous=thighs[0].rotation.x, cycles=0;
  for(let frame=0;frame<240;frame++){
    player.update(1/60);
    const angle=thighs[0].rotation.x;
    if(previous<=0 && angle>0)cycles++;
    previous=angle;angles.push(angle);heights.push(hips.position.y);
    bends.push(...elbows.map(elbow=>elbow.rotation.x));
    assert.ok(Math.abs(head.position.y-.82)<.005,"목 없는 머리와 어깨의 간격 유지");
  }
  const end=player.getPosition();
  assert.ok(Math.abs(Math.hypot(end.x-start.x,end.z-start.z)-4.8*4)<1e-6,"이동속도 4.8 유지");
  assert.ok(cycles>=4 && cycles<=6,"4초 동안 4~6회의 양발 주기: "+cycles);
  const bounce=Math.max(...heights)-Math.min(...heights);
  assert.ok(bounce>.015 && bounce<.04,"가벼운 상하 탄성: "+bounce);
  assert.ok(Math.min(...bends)>.65 && Math.max(...bends)<1.1,"팔꿈치를 편안하게 굽힌 자세");
  assert.ok(Math.max(...angles)-Math.min(...angles)<1.3,"과도한 큰 보폭을 억제");
  player.setStick(0,0);tick(1.4);
  for(const thigh of thighs)assert.ok(Math.abs(thigh.rotation.x)<1e-5);
  for(const elbow of elbows)assert.ok(Math.abs(elbow.rotation.x-.16)<1e-5);
  assert.ok(Math.abs(hips.position.y-.354)<1e-5);
  assert.ok(Math.abs(chest.rotation.x)<1e-5);
});

test("조깅 후에도 주문품은 손에 유지되고 마시기·먹기·미소가 정상 작동한다",t=>{
  const {T,player,avatar,tick}=visitor(t);
  assert.equal(player.orderCafeItem("coffee"),true);
  assert.equal(player.orderCafeItem("bread"),true);
  player.setStick(0,1);tick(1);
  assert.equal(avatar.getObjectByName("cafe-coffee").parent.name,"visitor-right-hand");
  assert.equal(avatar.getObjectByName("cafe-bread").parent.name,"visitor-left-hand");
  player.setStick(0,0);tick(1.4);
  for(const item of ["coffee","bread"]){
    assert.equal(player.consumeCafeItem(item),true);
    tick(item==="coffee" ? .8 : .7);
    avatar.updateMatrixWorld(true);
    const mouth=avatar.getObjectByName("visitor-mouth").getWorldPosition(new T.Vector3());
    const edge=new T.Vector3(...(item==="coffee" ? [.040,.169,.003] : [.103,.064,-.086]));
    avatar.getObjectByName("cafe-"+item).localToWorld(edge);
    assert.ok(edge.distanceTo(mouth)<.08,item+"를 입에 가져가는 위치 유지");
    tick(1.2);
    assert.equal(player.getCafeState()[item],false);
    assert.equal(avatar.getObjectByName("visitor-cafe-smile").visible,true);
  }
});

test("동작 줄이기에서는 조깅의 상하 탄성을 제거한다",t=>{
  const {player,hips,tick}=visitor(t,{reducedMotion:true});
  player.setStick(0,1);tick(.8);
  for(let frame=0;frame<90;frame++){
    player.update(1/60);
    assert.equal(hips.position.y,.354);
  }
});

for (const reducedMotion of [false,true]) {
  test(`포탈 도보 접근·손 접촉·복귀 (동작 줄이기 ${reducedMotion})`,t=>{
    const {T,player,camera,hands,tick}=visitor(t,{reducedMotion});
    const gate={touchYaw:Math.PI/2,touchStation:{x:-1.89,z:.2},touchPoint:{x:-2.28,y:.82,z:0}};
    const target=new T.Vector3().copy(gate.touchPoint);
    const start=player.getPosition(),eye=camera.position.clone(),orientation=camera.quaternion.clone();
    player.orderCafeItem("coffee");player.orderCafeItem("bread");

    let opened=0,contactFrames=0;
    const palmDistance=()=>hands[1].localToWorld(new T.Vector3(0,-.065,0)).distanceTo(target);
    assert.ok(player.beginPortalTouch(gate,()=>{
      assert.ok(contactFrames>=2,"목적지를 열기 전 실제 손 접촉을 여러 프레임 표시");
      opened++;
    }));
    assert.equal(player.beginPortalTouch(gate),false);
    assert.equal(player.walkTo({x:2,z:3}),false);
    assert.equal(player.jump(),false);
    tick(1/60);
    assert.ok(Math.abs(player.getPosition().x-start.x)<=4.8/60,"접촉점으로 순간 이동하지 않는다");
    for(let i=0;i<180;i++){
      player.update(1/60);
      if (palmDistance()<.012) contactFrames++;
    }
    assert.ok(palmDistance()<.012,`접촉면과 손끝의 거리 ${palmDistance()}`);
    assert.equal(opened,1);
    assert.ok(camera.position.distanceTo(target)<2.4,"측면 클로즈업");
    camera.updateMatrixWorld();
    const screen=target.clone().project(camera);
    assert.ok(Math.abs(screen.x)<1 && Math.abs(screen.y)<1);
    assert.ok(player.isPortalTouching());
    assert.ok(player.endPortalTouch());
    assert.deepEqual(player.getPosition(),start);
    assert.ok(camera.position.equals(eye) && camera.quaternion.equals(orientation));
    assert.ok(hands[1].getObjectByName("cafe-coffee") && hands[0].getObjectByName("cafe-bread"));
    assert.ok(player.jump(),"입력이 복구된다");
  });
}

test("포탈 접근 취소와 도달할 수 없는 접촉 지점은 목적지를 열지 않는다",t=>{
  const {player,tick}=visitor(t);
  const gate={touchYaw:0,touchStation:{x:0,z:-2},touchPoint:{x:.2,y:.82,z:-2.28}};
  const start=player.getPosition();
  let opened=false;
  assert.ok(player.beginPortalTouch(gate,()=>{opened=true;}));
  tick(.2);
  assert.ok(player.endPortalTouch());tick(2);
  assert.deepEqual(player.getPosition(),start);
  assert.equal(opened,false);
  assert.equal(player.beginPortalTouch({...gate,touchStation:{x:200,z:0}}),false);
  assert.equal(player.isPortalTouching(),false);
});
