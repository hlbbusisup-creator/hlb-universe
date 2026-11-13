import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createContext, runInContext} from "node:vm";
import test from "node:test";

const paths=["assets/vendor/three.min.js","src/blackcat-yacht.js","src/lupe3d.js","src/player3d.js","src/yacht-ride.js"];
const scripts=await Promise.all(paths.map(path=>readFile(new URL("../"+path,import.meta.url),"utf8")));

function createTrip(t,{spawnDock=0}={}) {
  const page=new EventTarget();
  page.window=page;
  page.performance=performance;
  page.AbortController=AbortController;
  page.matchMedia=()=>({matches:false});
  page.document=Object.assign(new EventTarget(),{hidden:false,createElement:canvas});
  function canvas() {
    const element=new EventTarget();
    element.classList={add(){},remove(){}};
    element.focus=()=>{page.document.activeElement=element;};
    element.setPointerCapture=element.releasePointerCapture=()=>{};
    element.hasPointerCapture=()=>false;
    element.getBoundingClientRect=()=>({left:0,top:0,width:800,height:500});
    element.getContext=()=>({fillRect(){},strokeRect(){},fillText(){},
      createRadialGradient:()=>({addColorStop(){}})});
    return element;
  }
  const context=createContext(page);
  scripts.forEach((script,index)=>runInContext(script,context,{filename:paths[index]}));
  const T=page.THREE, scene=new T.Scene(), camera=new T.PerspectiveCamera(55,1.6,.1,200);
  const docks=[
    {id:"entrance",title:"입구",x:6,z:12,yaw:0,station:{x:3,z:12},sign:{x:8,z:12}},
    {id:"group",title:"그룹안내소",x:0,z:-28,yaw:0,station:{x:0,z:-24},sign:{x:3,z:-28}},
    {id:"history",title:"HLB 역사관",x:-35.4,y:4.5,z:-6.55,yaw:Math.PI/2,
      station:{x:-40.5,y:4.5,z:-5.35},sign:{x:-41.9,y:4.5,z:-5.25}}
  ];
  const world={bounds:{minX:-45,maxX:40,minZ:-45,maxZ:25},colliders:[],
    spawn:{...docks[spawnDock].station},yachtDocks:docks,groundHeight:p=>p.x<-30?4.5:0,
    spaces:[{id:"group",x:0,z:-34,interior:{minX:-3,maxX:3,minZ:-37,maxZ:-31,ceilingY:4}}]};
  const actions=[], changes=[],picked=[],surface=canvas();
  const player=page.HLBPlayer3D.create(scene,camera,surface,world,null,item=>picked.push(item?.id),action=>actions.push(action));
  player.setActive(true);
  const yacht=page.HLBYachtRide.create({scene,world,player,onChange:state=>changes.push(state)});
  const craft=scene.getObjectByName("BlackCAT flying catamaran");
  const avatar=scene.getObjectByName("campus-visitor");
  t.after(()=>player.dispose());
  function step(dt=.05,reducedMotion=false) {
    // Match the app: move the craft first, then update its passenger and camera.
    yacht.update(dt,reducedMotion);player.update(dt);
  }
  function until(predicate,maxFrames=500,inspect=()=>{}) {
    for (let frame=0;frame<maxFrames;frame++) {
      if (predicate()) return;
      step();inspect();
    }
    assert.fail("Timed out waiting for yacht state: "+JSON.stringify(yacht.getState()));
  }
  function key(type,code,extra={}) {
    const event=new Event(type,{cancelable:true});Object.assign(event,{code,...extra});
    page.dispatchEvent(event);return event;
  }
  return {T,page,scene,camera,world,docks,player,yacht,craft,avatar,actions,changes,step,until,key,surface,picked};
}

function close(actual,expected,message,tolerance=1e-7) {
  assert.ok(Math.abs(actual-expected)<tolerance,`${message}: expected ${expected}, got ${actual}`);
}
function atStation(player,dock) {
  const position=player.getPosition();
  close(position.x,dock.station.x,"Disembark X");
  close(position.z,dock.station.z,"Disembark Z");
  close(position.y,(dock.y??0)+.025,"Disembark at dock ground level");
}

test("루페는 육지와 블랙캣에서 선택할 수 있고 다음 승선에서는 다른 자리에 앉는다",t=>{
  const {scene,camera,world,docks,player,yacht,avatar,step,until,surface,picked}=createTrip(t);
  const lupe=scene.getObjectByName("루페");
  function tapGuide() {
    camera.updateMatrixWorld();
    const point=player.getLupePosition().project(camera);
    for(const type of ["pointerdown","pointerup"]) {
      const event=new Event(type);
      Object.assign(event,{pointerType:"touch",pointerId:1,clientX:400*(1+point.x),clientY:250*(1-point.y)});
      surface.dispatchEvent(event);
    }
    assert.equal(picked.pop(),"lupe");
  }
  tapGuide();
  const origin=player.getLupePosition();
  for(let i=0;i<30;i++)step();
  assert.ok(origin.distanceTo(player.getLupePosition())>.3,"루페가 제자리에서만 떠 있지 않고 주변을 비행");
  player.setGuideTarget(docks[1].station);
  for(let i=0;i<20;i++)step();
  assert.ok(player.getLupePosition().z<world.spawn.z-.4,"다음 정거장을 향해 앞서 비행");
  player.setGuideTarget(null);
  let last;
  for(const [from,to] of [[0,1],[1,2],[2,0]]) {
    assert.ok(yacht.request(from,to));
    until(()=>yacht.getState().phase==="flying");
    assert.equal(lupe.parent,avatar);
    assert.ok(!last || last.distanceTo(lupe.position)>.1);
    last=lupe.position.clone();
    tapGuide();
    until(()=>!yacht.getState().busy);
    assert.equal(lupe.parent,scene);
    assert.ok(player.getLupePosition().distanceTo(avatar.position)<5,"도착 정박소에서도 동행");
  }
});

test("루페는 곡선을 유영하며 실제 비행 방향으로 몸을 돌리고, 동작 줄이기에서는 선회를 멈춘다",t=>{
  const {T,page,scene,player,step}=createTrip(t);
  const lupe=scene.getObjectByName("루페"),forward=new T.Vector3();
  const previous=player.getLupePosition(),delta=new T.Vector3();
  let aligned=0, rise=0, fall=0;
  for(let i=0;i<200;i++) {
    step();
    const current=player.getLupePosition();
    delta.subVectors(current,previous);
    if(i>25) {
      if(delta.y>.002)rise++;
      if(delta.y<-.002)fall++;
      delta.y=0;delta.normalize();
      lupe.getWorldDirection(forward);forward.y=0;forward.normalize();
      if(delta.dot(forward)>.82)aligned++;
    }
    previous.copy(current);
  }
  assert.ok(aligned>155,"곡선 구간에서도 카메라가 아닌 진행 방향을 향함");
  assert.ok(rise>15 && fall>15,"유영 중 상승과 하강이 모두 있음");
  const otherScene=new T.Scene(),stationary=page.HLBLupe3D.create(T,otherScene);
  const visitor=new T.Group(),camera=new T.PerspectiveCamera();
  camera.position.set(0,3,8);
  stationary.fly(0,visitor,camera,null,true,()=>{});
  const before=stationary.root.position.clone();
  for(let i=0;i<100;i++)stationary.fly(.05,visitor,camera,null,true,()=>{});
  assert.ok(before.distanceTo(stationary.root.position)<.001);
  stationary.dispose();
});

test("BlackCAT carries the real avatar above the roofs and returns to both stations",t=>{
  const {T,scene,docks,player,yacht,craft,avatar,changes,step,until}=createTrip(t);
  assert.equal(yacht.nearby(),0);
  assert.equal(yacht.request(0,1),true);
  until(()=>yacht.getState().phase==="boarding");
  assert.equal(player.isRiding(),true);
  assert.equal(avatar.parent,craft,"Avatar must become a real child of the moving yacht");
  until(()=>yacht.getState().phase==="flying");
  close(avatar.position.y,1.14,"Passenger stands on foredeck");
  close(avatar.position.z,-1.7,"Passenger stays in front of cabin");

  let maximumAltitude=0, cruiseFrames=0;
  until(()=>!yacht.getState().busy,300,()=>{
    maximumAltitude=Math.max(maximumAltitude,craft.position.y);
    if (craft.position.z<docks[0].z-.1 && craft.position.z>docks[1].z+.1) {
      close(craft.position.y,9.08,"Clear the roofs before travelling horizontally");
      cruiseFrames++;
      assert.equal(avatar.parent,craft);
      const expected=craft.localToWorld(avatar.position.clone());
      const actual=player.getPosition();
      assert.ok(new T.Vector3(actual.x,actual.y,actual.z).distanceTo(expected)<1e-7);
    }
  });
  assert.ok(cruiseFrames>50);
  close(maximumAltitude,9.08,"Flight altitude");
  assert.equal(player.isRiding(),false);
  assert.equal(avatar.parent,scene,"Reattach avatar to the scene on landing");
  atStation(player,docks[1]);
  assert.equal(yacht.nearby(),1);
  assert.equal(yacht.getState().dockIndex,1);
  close(craft.position.x,docks[1].x,"Destination dock X");
  close(craft.position.z,docks[1].z,"Destination dock Z");
  close(craft.position.y,.08,"Yacht rests above the docking platform");

  assert.equal(yacht.request(1,0),true);
  until(()=>yacht.getState().phase==="flying");
  until(()=>!yacht.getState().busy);
  atStation(player,docks[0]);
  assert.equal(avatar.parent,scene);
  assert.equal(yacht.getState().dockIndex,0);
  assert.equal(changes.filter(state=>state.phase==="flying").length,2);
  const arrived=player.getPosition();
  step();
  close(player.getPosition().x,arrived.x,"No old walking route resumes after landing");
  close(player.getPosition().z,arrived.z,"No old walking route resumes after landing");
});

test("A visitor at the other station can summon the empty yacht and then board",t=>{
  const {scene,docks,player,yacht,craft,avatar,changes,step,until}=createTrip(t,{spawnDock:1});
  assert.equal(yacht.getState().dockIndex,0);
  assert.equal(yacht.request(1,0),true);
  until(()=>yacht.getState().phase==="calling");
  const waitingPosition=player.getPosition();
  for (let frame=0;frame<40;frame++) step();
  assert.equal(yacht.getState().phase,"calling");
  assert.equal(player.isRiding(),false);
  assert.equal(avatar.parent,scene,"Visitor must wait on land while the yacht is empty");
  assert.deepEqual(player.getPosition(),waitingPosition);
  assert.ok(craft.position.y>9,"Empty yacht also clears the roofs");
  until(()=>yacht.getState().phase==="boarding");
  assert.equal(avatar.parent,craft);
  close(craft.position.x,docks[1].x,"Called yacht dock X");
  close(craft.position.z,docks[1].z,"Called yacht dock Z");
  until(()=>!yacht.getState().busy);
  atStation(player,docks[0]);
  assert.deepEqual(changes.map(state=>state.phase),["walking","calling","boarding","flying","idle"]);
});

test("All six routes land at the selected dock and history flights cover 1.3 times the distance per second",t=>{
  const {docks,yacht,player,craft,step,until}=createTrip(t);
  const length=(from,to)=>Math.hypot(docks[to].x-docks[from].x,docks[to].z-docks[from].z);
  const ordinarySpeed=length(0,1)/9;
  let from=0;
  for (const to of [2,1,2,0,1,0]) {
    assert.equal(yacht.nearby(),from);
    assert.equal(yacht.request(from,to),true);
    until(()=>yacht.getState().phase==="flying");
    let elapsed=0,peak=0;
    while (yacht.getState().phase==="flying" && elapsed<30) {
      step(.025);elapsed+=.025;
      peak=Math.max(peak,craft.position.y);
    }
    assert.equal(yacht.getState().phase,"idle");
    const historyRoute=from===2 || to===2;
    close(length(from,to)/elapsed,ordinarySpeed*(historyRoute?1.3:1),"Actual flight speed",.03);
    close(peak,historyRoute?13.58:9.08,"Cruise above both docks");
    close(craft.position.y,(docks[to].y??0)+.08,"Hull lands on its platform");
    atStation(player,docks[to]);from=to;
  }
});

test("A call from the hill lands the empty yacht at the raised dock before boarding",t=>{
  const {docks,yacht,player,craft,until}=createTrip(t,{spawnDock:2});
  assert.equal(yacht.request(2,1),true);
  until(()=>yacht.getState().phase==="calling");
  atStation(player,docks[2]);
  until(()=>yacht.getState().phase==="boarding");
  close(craft.position.y,4.58,"Summoned hull height");
  until(()=>!yacht.getState().busy);
  atStation(player,docks[1]);
});

test("Duplicate travel requests are refused and boarding clears walking, jump and held inputs",t=>{
  const {player,yacht,craft,avatar,actions,step,until,key,docks}=createTrip(t);
  key("keydown","KeyW");key("keydown","KeyD");
  assert.equal(player.jump(),true);
  assert.equal(yacht.request(0,1),true);
  assert.equal(yacht.request(1,0),false);
  // The controller boards before the first walking frame, clearing the keys.
  step();
  assert.equal(avatar.parent,craft);
  actions.length=0;
  assert.equal(yacht.request(0,1),false);
  assert.equal(player.beginRide(craft,{x:0,y:1,z:0}),false);
  assert.equal(player.walkTo({x:10,z:0}),false);
  assert.equal(player.jump(),false);
  for (const code of ["KeyW","KeyD","Space","KeyF","KeyE"]) key("keydown",code);
  player.setStick(1,1);
  player.toggleOverview();
  assert.equal(player.isOverview(),false);
  until(()=>yacht.getState().phase==="flying");
  assert.equal(yacht.request(1,0),false);
  assert.equal(yacht.cancelApproach(),false);
  assert.deepEqual(actions,[],"No firework or interaction action while riding");
  close(avatar.position.x,0,"Blocked movement cannot displace the passenger");
  close(avatar.position.y,1.14,"Blocked jump cannot lift the passenger");
  until(()=>!yacht.getState().busy);
  atStation(player,docks[1]);
  step();
  atStation(player,docks[1]);
  key("keyup","KeyW");key("keydown","KeyW");
  step();
  assert.ok(player.getPosition().z<docks[1].station.z,"Fresh keyboard input works after landing");
});

test("Paused or invalid frame deltas cannot advance a flight, and reduced motion disables banking",t=>{
  const {player,yacht,craft,avatar,camera,step,until}=createTrip(t);
  yacht.request(0,1);until(()=>yacht.getState().phase==="flying");
  for (let frame=0;frame<50;frame++) step();
  assert.ok(Math.abs(craft.rotation.z)>.001,"Normal flight has a gentle bank");
  const craftPosition=craft.position.clone(), rotation=craft.rotation.clone();
  const passengerPosition=avatar.position.clone(), cameraPosition=camera.position.clone();
  const position=player.getPosition();
  for (const dt of [0,0,-1,NaN,null]) step(dt);
  assert.ok(craft.position.equals(craftPosition));
  assert.ok(craft.rotation.equals(rotation));
  assert.ok(avatar.position.equals(passengerPosition));
  assert.ok(camera.position.equals(cameraPosition));
  assert.deepEqual(player.getPosition(),position);
  assert.equal(yacht.getState().phase,"flying");
  step(.05,true);
  assert.equal(craft.rotation.z,0);
  const before=craft.position.clone();
  step(10,true);
  assert.equal(yacht.getState().phase,"flying","A long stalled frame must not skip the whole trip");
  assert.ok(craft.position.distanceTo(before)<2,"A long frame is clamped to a small advance");
});

test("Invalid requests and a refused walking route cannot take ownership of the character",t=>{
  const {world,player,yacht,avatar,scene,step}=createTrip(t);
  for (const [from,to] of [[-1,0],[0,3],[0,0],[0,undefined]]) {
    assert.equal(yacht.request(from,to),false);
  }
  world.yachtDocks[0].station={x:4,z:12};
  player.setActive(false);
  assert.equal(yacht.request(0,1),false);
  step();
  assert.equal(yacht.getState().phase,"idle");
  assert.equal(player.isRiding(),false);
  assert.equal(avatar.parent,scene);
});
