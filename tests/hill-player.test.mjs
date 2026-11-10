import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';

const scripts=await Promise.all(['assets/vendor/three.min.js','src/player3d.js']
  .map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));

function hillside(t) {
  const page=new EventTarget();
  page.window=page;page.performance=performance;page.AbortController=AbortController;
  page.matchMedia=()=>({matches:false});
  const makeCanvas=()=>Object.assign(new EventTarget(),{
    classList:{add(){},remove(){}},focus(){},
    getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),
    setPointerCapture(){},hasPointerCapture:()=>false,
    getContext:()=>({fillRect(){},strokeRect(){},fillText(){},
      createRadialGradient:()=>({addColorStop(){}})})
  });
  page.document=Object.assign(new EventTarget(),{hidden:false,createElement:makeCanvas});
  const context=createContext(page);scripts.forEach(script=>runInContext(script,context));
  const T=page.THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(55,4/3,.1,200),canvas=makeCanvas();
  const groundHeight=p=>4.5*Math.max(0,Math.min(1,(2-p.z)/14));
  const walkable=(p,padding=0)=>p.z>=2 || (p.z<=-12 ? Math.abs(p.x)<=6-padding : Math.abs(p.x)<=2-padding);
  const hall={id:'history',x:0,z:-15,station:{x:0,z:-17},lookAt:{x:0,z:-20},
    interior:{minX:-5,maxX:5,minZ:-22,maxZ:-15,floorY:4.5,ceilingY:8.3}};
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute([-2,0,2,2,0,2,-2,4.5,-12,2,4.5,-12],3));
  geometry.setIndex([0,1,2,1,3,2]);geometry.computeVertexNormals();
  const surface=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));scene.add(surface);
  const wall={minX:-1,maxX:1,minZ:-19.15,maxZ:-18.85,minY:4.5,maxY:7.5,floorY:4.5};
  const world={bounds:{minX:-12,maxX:12,minZ:-24,maxZ:12},spawn:{x:0,z:8},
    spaces:[{id:'group',x:0,z:0},hall],colliders:[wall],groundHeight,isWalkablePoint:walkable,walkSurfaces:[surface]};
  const player=page.HLBPlayer3D.create(scene,camera,canvas,world);
  t.after(()=>player.dispose());
  const tick=(count=300)=>{for(let i=0;i<count;i++)player.update(1/60);};
  return {T,page,scene,camera,canvas,world,player,tick,hall,wall};
}

test('언덕을 오르내릴 때 캐릭터와 카메라는 지형 높이를 따르고 비탈 밖 지름길을 쓰지 않는다',t=>{
  const {player,world,camera,tick,hall}=hillside(t);
  assert.ok(player.walkTo(hall.station));
  let previous=player.getPosition(),climbed=false;
  for(let i=0;i<500;i++) {
    player.update(1/60);const p=player.getPosition();
    assert.ok(world.isWalkablePoint(p,.30));
    const offset=p.z<=-15?.086:.025;
    assert.ok(Math.abs(p.y-world.groundHeight(p)-offset)<1e-8);
    assert.ok(Math.abs(p.y-previous.y)<.10,'오르막에서 높이가 갑자기 뛰지 않음');
    climbed ||= p.y>3 && p.y<4;previous=p;
  }
  assert.ok(climbed);assert.ok(Math.abs(player.getPosition().y-4.586)<1e-8);
  assert.ok(camera.position.y>4.5,'언덕 위에서 카메라가 바닥 아래로 내려가지 않음');
  player.walkTo({x:5,z:-5});tick();
  assert.ok(world.isWalkablePoint(player.getPosition(),.30),'경사로 바깥은 이동 불가');
  player.walkTo(world.spawn);tick(550);
  assert.ok(Math.hypot(player.getPosition().x,player.getPosition().z-8)<.1);
  assert.ok(Math.abs(player.getPosition().y-.025)<1e-8);
});

test('높은 바닥의 벽도 우회하고 언덕 위 점프는 같은 바닥 높이로 착지한다',t=>{
  const {player,world,wall,tick}=hillside(t);
  player.walkTo({x:0,z:-21});
  for(let i=0;i<650;i++) {
    player.update(1/60);const p=player.getPosition();
    assert.ok(!(p.x>wall.minX && p.x<wall.maxX && p.z>wall.minZ && p.z<wall.maxZ),'높은 벽 관통 금지');
  }
  assert.ok(Math.abs(player.getPosition().z+21)<.1);
  const base=player.getPosition().y;assert.equal(player.jump(),true);tick(18);
  assert.ok(player.getPosition().y>base+.7);tick(45);
  assert.ok(Math.abs(player.getPosition().y-base)<1e-8);
  player.facePoint({x:0,z:0});player.setStick(0,1);tick(90);player.setStick(0,0);
  assert.ok(world.isWalkablePoint(player.getPosition(),.30));
  assert.ok(player.getPosition().z<wall.minZ,'키보드와 같은 수동 이동도 높은 벽을 통과하지 않음');
});

test('경사로를 클릭하면 평지 투영점이 아닌 눈에 보이는 경사면 지점으로 이동한다',t=>{
  const {T,scene,camera,canvas,world,player,tick}=hillside(t);
  const destination=new T.Vector3(0,world.groundHeight({z:-6}),-6);
  camera.position.set(3,10,12);camera.lookAt(destination);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
  const ndc=destination.clone().project(camera),x=(ndc.x+1)*400,y=(1-ndc.y)*300;
  for(const type of ['pointerdown','pointerup']) {
    const event=new Event(type);Object.assign(event,{pointerId:1,pointerType:'mouse',button:0,clientX:x,clientY:y});
    canvas.dispatchEvent(event);
  }
  tick(350);const p=player.getPosition();
  assert.ok(Math.hypot(p.x-destination.x,p.z-destination.z)<.12);
  assert.ok(Math.abs(p.y-destination.y-.025)<.01);
});
