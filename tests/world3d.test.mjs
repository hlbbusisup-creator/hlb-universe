import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';

// Signs and the character shadow use 2D textures. Geometry, navigation and
// animation run with the real Three.js API before any WebGL frame is drawn.
function makeCanvas() {
  const canvas = new EventTarget();
  const context = {
    canvas,
    fillRect() {},
    strokeRect() {},
    fillText() {},
    createRadialGradient: () => ({addColorStop() {}})
  };
  canvas.getContext = () => context;
  canvas.classList = {remove() {}, add() {}};
  return canvas;
}

const page = new EventTarget();
page.window = page;
page.document = Object.assign(new EventTarget(), {
  createElement: () => makeCanvas(),
  hidden: false
});
page.performance = performance;
page.matchMedia = () => ({matches: false});
page.AbortController = AbortController;
const context = createContext(page);
for (const path of ['assets/vendor/three.min.js', 'src/cologne-gallery.js', 'src/hall-designs.js', 'src/cafe.js', 'src/world3d.js', 'src/player3d.js']) {
  const file = new URL('../' + path, import.meta.url);
  runInContext(await readFile(file, 'utf8'), context, { filename: path });
}
const {THREE, HLBWorld3D, HLBPlayer3D} = page;
const scene = new THREE.Scene();
const world = HLBWorld3D.build(scene);

function createPlayer(onScenePick = null) {
  const camera = new THREE.PerspectiveCamera(55, 1.6, 0.1, 200);
  const canvas = makeCanvas();
  const player = HLBPlayer3D.create(scene, camera, canvas, world, null, onScenePick);
  player.setActive(true);
  return { player, camera, canvas };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

test('정상 로고는 수직축을 중심으로 시계 방향으로 돌고 모션 감소 설정에서는 정면에 머문다', () => {
  const logo = scene.getObjectByName('HLB summit logo');
  const step = 1 / 30;
  for (let i = 0; i < 165; i++) world.update(step);
  assert.ok(Math.abs(logo.rotation.y + Math.PI / 2) < .001);
  assert.equal(logo.rotation.x, 0);
  assert.equal(logo.rotation.z, 0);
  world.update(step, true);
  assert.equal(logo.rotation.y, 0);
});

test('카페 입구와 주문대에는 흰색으로 빛나는 가로형 입체 간판이 있다', () => {
  for (const place of ['entrance', 'counter']) {
    const marquee = scene.getObjectByName('Café Lento · ' + place + ' marquee');
    assert.ok(marquee, place + ' 간판');
    const letters = marquee.getObjectByName('Café Lento · illuminated lettering');
    assert.ok(letters?.isMesh);
    letters.updateWorldMatrix(true, false);
    letters.geometry.computeBoundingBox();
    const local = new THREE.Matrix4().copy(marquee.matrixWorld).invert().multiply(letters.matrixWorld);
    const size = letters.geometry.boundingBox.clone().applyMatrix4(local).getSize(new THREE.Vector3());
    assert.ok(size.x > size.y * 4 && size.z > 0, place + ' 가로로 긴 입체 문자');
    const lit = letters.material.some(m => m.emissiveIntensity > 0 &&
      Math.min(m.emissive.r, m.emissive.g, m.emissive.b) > .45);
    assert.ok(lit, place + ' 밝은 흰색 발광');
  }
});

function visit(player, space) {
  assert.ok(player.walkTo(space.station), space.id + ' 길찾기 실패');
  // A finite simulated time limit catches blocked routes without a wall clock.
  for (let frame = 0; frame < 1800; frame++) {
    player.update(1 / 30);
    const position = player.getPosition();
    assert.ok(world.colliders.every(box =>
      position.x <= box.minX || position.x >= box.maxX ||
      position.z <= box.minZ || position.z >= box.maxZ
    ), space.id + ' 경로가 벽을 통과함');
    if (distance(position, space.station) < 0.15) return;
  }
  assert.fail(space.id + ' 열람대까지 도달할 수 없음');
}

test('산책 시작점에서 일곱 건물의 실내 목적지까지 벽을 통과하지 않고 걸어갈 수 있다', () => {
  assert.deepEqual(Array.from(world.spaces, space => space.id).sort(), ['brand', 'cafe', 'cologne', 'esg', 'group', 'ir', 'product']);
  for (const space of world.spaces) {
    const room = space.interior;
    assert.ok(space.station.x > room.minX && space.station.x < room.maxX &&
      space.station.z > room.minZ && space.station.z < room.maxZ, space.id + ' 열람대는 건물 내부에 있어야 함');
    const {player, camera} = createPlayer();
    try {
      const start = {...player.getPosition()};
      assert.ok(distance(start, world.spawn) < 0.1);
      visit(player, space);
      assert.ok(camera.position.toArray().every(Number.isFinite));
    } finally {
      player.dispose();
    }
  }
});

test('카페와 에데꼬론은 직선거리 양옆에 있고 네 관은 그룹 뒤쪽 반원에서 모두 입구 쪽을 향한다', () => {
  const cafe=world.spaces.find(space=>space.id==='cafe');
  const cologne=world.spaces.find(space=>space.id==='cologne');
  assert.ok(Math.abs(cafe.x+cologne.x)<.001 && Math.abs(cafe.z-cologne.z)<.001);
  const group=world.spaces.find(space=>space.id==='group').interior;
  assert.ok(Math.abs((group.minX+group.maxX)/2-world.plaza.x)<.01);
  assert.ok(Math.abs((group.minZ+group.maxZ)/2-world.plaza.z)<.4);
  const surrounding=world.spaces.filter(space=>['brand','product','ir','esg'].includes(space.id));
  const radii=surrounding.map(space=>Math.hypot(space.x-world.plaza.x,space.z-world.plaza.z));
  assert.ok(Math.max(...radii)-Math.min(...radii)<.1);
  assert.ok(surrounding.every(space=>space.z<=world.plaza.z));
  assert.equal(new Set(surrounding.map(space=>space.x)).size,4);
  assert.ok(surrounding.every(space=>space.interior.maxZ<world.district.minZ));
  assert.ok(scene.getObjectByName('Semicircular brand plaza promenade'));
  scene.updateMatrixWorld(true);
  for(const space of surrounding){
    const hall=scene.children[0].children.find(object=>object.userData.hallId===space.id);
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(hall.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(Math.abs(forward.x)<.001 && forward.z>.999,space.id+' 간판이 입구 쪽 +Z를 향함');
    assert.ok(space.interior.minZ>world.bounds.minZ && space.interior.minX>world.bounds.minX && space.interior.maxX<world.bounds.maxX);
  }
  for (let z=world.spawn.z;z>=world.district.minZ;z-=.25) {
    assert.ok(world.colliders.every(box=>box.minX>=.5 || box.maxX<=-.5 || z<box.minZ || z>box.maxZ), '거리 중앙 z='+z);
  }
});

test('뒤쪽 IR·ESG 바닥에 화산 지형이나 외곽 주상절리가 침범하지 않는다', () => {
  scene.updateMatrixWorld(true);
  const terrain=['Eroded caldera escarpments','Layered basalt cone and breached summit','Volcanic ash plateau'].map(name=>scene.getObjectByName(name));
  const columns=scene.getObjectByName('column stone'),matrix=new THREE.Matrix4(),columnBox=new THREE.Box3();
  columns.geometry.computeBoundingBox();
  for(const id of ['ir','esg']){
    const room=world.spaces.find(space=>space.id===id).interior;
    for(const x of [room.minX+.15,(room.minX+room.maxX)/2,room.maxX-.15]){
      for(const z of [room.minZ+.15,(room.minZ+room.maxZ)/2,room.maxZ-.15]){
        const ray=new THREE.Raycaster(new THREE.Vector3(x,12,z),new THREE.Vector3(0,-1,0));
        const hit=ray.intersectObjects(terrain,false)[0];
        assert.ok(hit && hit.point.y<.08,id+' 바닥 아래 지형 '+x+','+z);
      }
    }
    for(let i=0;i<columns.count;i++){
      columns.getMatrixAt(i,matrix);matrix.premultiply(columns.matrixWorld);
      columnBox.copy(columns.geometry.boundingBox).applyMatrix4(matrix);
      assert.ok(columnBox.max.x<=room.minX || columnBox.min.x>=room.maxX || columnBox.max.z<=room.minZ || columnBox.min.z>=room.maxZ,
        id+' 공간의 외곽 주상절리 간섭 '+JSON.stringify({min:columnBox.min,max:columnBox.max}));
    }
  }
});

test('직선거리 끝의 낮은 정면 시선에서 네 전시관 간판의 좌우 글자 영역이 가리지 않는다', () => {
  scene.updateMatrixWorld(true);
  const signs=[],meshes=[],eye=new THREE.Vector3(0,3,-10);
  scene.traverse(object=>{
    if(object.isMesh)meshes.push(object);
    if(object.userData.wayfindingSign && ['브랜드관','제품전시관','IR 자료관','ESG 정원'].includes(object.name))signs.push(object);
  });
  assert.equal(signs.length,4);
  for(const sign of signs){
    for(const side of [-.43,0,.43]){
      const target=sign.localToWorld(new THREE.Vector3(sign.userData.wayfindingSign.width*side,0,0));
      const ray=new THREE.Raycaster(eye,target.clone().sub(eye).normalize());
      const hit=ray.intersectObjects(meshes,false).find(({object,face})=>{
        const material=Array.isArray(object.material)?object.material[face.materialIndex]:object.material;
        return material.visible && !(material.transparent && material.opacity<.7);
      });
      // A ray exactly on the plane's triangle seam can miss the text plane.
      // A backing plate behind it is not an obstruction in front of the text.
      assert.ok(!hit || hit.distance>=eye.distanceTo(target)-.001,
        sign.name+' 글자 영역 '+side+'의 가림: '+hit?.object.name);
    }
  }
});

test('블랙캣 양쪽 승하차 장소와 그룹안내소에 걸어서 접근할 수 있다', () => {
  assert.deepEqual(Array.from(world.yachtDocks,dock=>dock.id),['entrance','group']);
  const {player}=createPlayer();
  try {
    for(const dock of world.yachtDocks) visit(player,dock);
    visit(player,world.spaces.find(space=>space.id==='group'));
    visit(player,world.yachtDocks[0]);
  } finally { player.dispose(); }
});

test('야외 전경은 광장을 넓게 보여주고, 전시관에 들어가면 실내 거리로 돌아온다', () => {
  const {player, camera} = createPlayer();
  const cameraDistance = () => {
    const p = player.getPosition();
    return Math.hypot(camera.position.x-p.x, camera.position.y-1.53, camera.position.z-p.z);
  };
  function settle() { for (let i=0; i<60; i++) player.update(1/30); }
  try {
    const walkingDistance = cameraDistance();
    player.toggleOverview();
    settle();
    assert.ok(player.isOverview() && cameraDistance() > walkingDistance * 4);
    visit(player, world.spaces.find(hall => hall.id === 'group'));
    settle();
    assert.equal(player.isOverview(), false);
    assert.ok(cameraDistance() < 6);
    visit(player, {id:'광장', station:world.spawn});
    settle();
    assert.ok(player.isOverview() && cameraDistance() > walkingDistance * 4);
    player.toggleOverview();
    settle();
    assert.ok(Math.abs(cameraDistance() - walkingDistance) < .2);
  } finally {
    player.dispose();
  }
});

test('에데꼬론 상품관에서 디퓨저와 향 카트리지 전시대를 차례로 방문한 뒤 나올 수 있다', () => {
  const hall = world.spaces.find(space => space.id === 'cologne');
  const foyer = hall.station;
  const room = hall.interior;
  const exhibits = Array.from(hall.exhibits);
  assert.deepEqual(exhibits.map(exhibit => exhibit.id).sort(), ['cologne-cartridges', 'cologne-diffuser']);
  const {player} = createPlayer();
  try {
    visit(player, hall);
    for (const exhibit of exhibits) {
      const {x, z} = exhibit.station;
      assert.ok(x > room.minX && x < room.maxX && z > room.minZ && z < room.maxZ, exhibit.id + '는 상품관 안에 있어야 함');
      // The guide opens within 1.85 m, each exhibit within 2 m.
      assert.ok(distance(foyer, exhibit.station) > 3.85, exhibit.id + '와 안내대의 열람 영역이 겹치면 안 됨');
      visit(player, exhibit);
    }
    assert.ok(distance(exhibits[0].station, exhibits[1].station) > 4, '제품과 향 전시대의 열람 영역이 겹치면 안 됨');
    visit(player, world.spaces.find(space => space.id === 'group'));
  } finally {
    player.dispose();
  }
});

test('열람대를 떠나 다른 건물의 내부로 연속해서 이동할 수 있다', () => {
  const {player} = createPlayer();
  try {
    for (const id of ['esg', 'brand', 'ir', 'product', 'group']) {
      visit(player, world.spaces.find(space => space.id === id));
    }
  } finally {
    player.dispose();
  }
});

test('카페 안으로 걸어가 주문대를 화면에서 눌러 선택할 수 있다', () => {
  const cafe = world.spaces.find(space => space.id === 'cafe');
  const counter = cafe.exhibits[0];
  assert.equal(counter.id, 'cafe-counter');
  let picked = null;
  const {player, camera, canvas} = createPlayer(exhibit => { picked = exhibit; });
  try {
    visit(player, counter);
    const {minX, maxX, minZ, maxZ} = cafe.interior;
    const {x, z} = player.getPosition();
    assert.ok(x > minX && x < maxX && z > minZ && z < maxZ, '주문 위치가 카페 내부에 있어야 함');
    player.facePoint(counter.lookAt);
    camera.updateMatrixWorld();
    const box = counter.hitBox;
    const point = new THREE.Vector3((box.minX+box.maxX)/2, (box.minY+box.maxY)/2, (box.minZ+box.maxZ)/2).project(camera);
    assert.ok(Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1, '주문대가 카메라 시야 안에 있어야 함');
    canvas.getBoundingClientRect = () => ({left:0, top:0, width:800, height:500});
    canvas.focus = () => {};
    canvas.setPointerCapture = () => {};
    canvas.hasPointerCapture = () => false;
    for (const type of ['pointerdown', 'pointerup']) {
      canvas.dispatchEvent(Object.assign(new Event(type), {
        pointerId:1, pointerType:'mouse', button:0, clientX:(1+point.x)*400, clientY:(1-point.y)*250
      }));
    }
    assert.equal(picked, counter);
  } finally {
    player.dispose();
  }
});

test('커피와 빵을 각 손에 들고 이동하며 먹거나 마신 손에 다시 주문할 수 있다', () => {
  const cafe = world.spaces.find(space => space.id === 'cafe');
  const counter = cafe.exhibits[0];
  const {player} = createPlayer();
  const avatar = scene.getObjectByName('campus-visitor');
  const mouth = avatar.getObjectByName('visitor-mouth');
  const rightHand = avatar.getObjectByName('visitor-right-hand');
  const leftHand = avatar.getObjectByName('visitor-left-hand');
  const position = part => part.getWorldPosition(new THREE.Vector3());
  try {
    visit(player, counter);
    assert.deepEqual({...player.getCafeState()}, {coffee:false, bread:false, consuming:null});
    assert.equal(player.consumeCafeItem('coffee'), false);
    assert.equal(player.orderCafeItem('coffee'), true);
    assert.equal(player.orderCafeItem('bread'), true);
    assert.equal(player.orderCafeItem('coffee'), false);
    assert.deepEqual({...player.getCafeState()}, {coffee:true, bread:true, consuming:null});
    const cup = rightHand.getObjectByName('cafe-coffee');
    const pastry = leftHand.getObjectByName('cafe-bread');
    visit(player, {id:'광장', station:world.spawn});
    assert.equal(cup.parent, rightHand);
    assert.equal(pastry.parent, leftHand);
    assert.ok(avatar.worldToLocal(position(cup)).x > 0 && avatar.worldToLocal(position(pastry)).x < 0,
      '광장까지 커피는 캐릭터 오른손(+X), 빵은 왼손(-X)에 있어야 함');

    function consume(item, prop, other, otherProp) {
      for (let i=0; i<20; i++) player.update(1/30);
      const atRest = position(prop).distanceTo(position(mouth));
      assert.equal(player.consumeCafeItem(item), true);
      assert.equal(player.consumeCafeItem(other), false);
      let nearest = atRest;
      for (let i=0; i<120 && player.getCafeState().consuming; i++) {
        assert.equal(player.getCafeState().consuming, item);
        assert.equal(player.getCafeState()[item], true);
        assert.equal(avatar.getObjectByName(prop.name), prop);
        nearest = Math.min(nearest, position(prop).distanceTo(position(mouth)));
        player.update(1/30);
      }
      assert.ok(nearest < atRest * .72, item + '을 입으로 가져가는 모션이 있어야 함');
      assert.equal(player.getCafeState().consuming, null);
      assert.equal(player.getCafeState()[item], false);
      assert.equal(avatar.getObjectByName(prop.name), undefined);
      assert.equal(player.consumeCafeItem(item), false);
      assert.equal(player.getCafeState()[other], true);
      assert.equal(avatar.getObjectByName(otherProp.name), otherProp);
    }

    consume('coffee', cup, 'bread', pastry);
    visit(player, counter);
    assert.equal(player.orderCafeItem('coffee'), true);
    const secondCup = rightHand.getObjectByName('cafe-coffee');
    consume('bread', pastry, 'coffee', secondCup);
    assert.equal(player.orderCafeItem('bread'), true);
    assert.deepEqual({...player.getCafeState()}, {coffee:true, bread:true, consuming:null});
  } finally {
    player.dispose();
  }
});

test('커피를 마시거나 빵을 먹으면 미소가 잠시 유지되고 평상시 표정으로 돌아온다', () => {
  const originalMatch = page.matchMedia;
  try {
    for (const reducedMotion of [false, true]) {
      page.matchMedia = () => ({matches: reducedMotion});
      const {player} = createPlayer();
      try {
        const avatar = scene.getObjectByName('campus-visitor');
        const smile = avatar.getObjectByName('visitor-cafe-smile');
        const mouth = avatar.getObjectByName('visitor-mouth');
        assert.ok(smile);
        assert.equal(smile.visible, false);
        const bounds = new THREE.Box3().setFromObject(smile);
        assert.ok(!bounds.isEmpty(), '미소에 실제 얼굴 메시가 있어야 함');
        for (const item of ['coffee', 'bread']) {
          assert.equal(player.orderCafeItem(item), true);
          assert.equal(player.consumeCafeItem(item), true);
          for (let frame=0; player.getCafeState().consuming && frame<100; frame++) player.update(1/30);
          assert.equal(player.getCafeState()[item], false);
          assert.equal(smile.visible, true, item + ' 소품이 사라진 직후 웃어야 함');
          assert.equal(mouth.visible, false, '기본 입이 웃는 입에 겹치지 않아야 함');
          for (let frame=0; frame<15; frame++) {
            player.update(1/30);
            assert.equal(smile.visible, true, item + ' 식후 미소를 볼 시간이 있어야 함');
          }
          for (let frame=0; frame<60; frame++) player.update(1/30);
          assert.equal(smile.visible, false, item + ' 기본 표정으로 복귀');
          assert.equal(mouth.visible, true);
        }
      } finally { player.dispose(); }
    }
  } finally { page.matchMedia = originalMatch; }
});

test('사람 캐릭터는 실제 머리 높이의 약 두 배이고 앞뒤에서 HLB 마그마 레드가 보인다', () => {
  const {player} = createPlayer();
  try {
    const avatar = scene.getObjectByName('campus-visitor');
    const head = avatar.getObjectByName('visitor-head');
    const shadow = avatar.getObjectByName('visitor-shadow');
    assert.ok(head && shadow, '머리와 바닥 그림자를 각각 식별할 수 있어야 함');
    avatar.updateWorldMatrix(true, true);
    const body = avatar.children.filter(part => part !== shadow);
    const bounds = new THREE.Box3();
    for (const part of body) bounds.expandByObject(part, true);
    const height = bounds.max.y - bounds.min.y;
    const headBounds = new THREE.Box3().setFromObject(head, true);
    const ratio = height / (headBounds.max.y - headBounds.min.y);
    assert.ok(ratio >= 1.90 && ratio <= 2.10, `실제 전신/머리 비율: ${ratio.toFixed(2)}`);

    // Sample the foremost surface across each silhouette so paint hidden
    // inside the body or a single red vertex cannot satisfy the brand check.
    const sampler = new THREE.Raycaster();
    const color = new THREE.Color();
    const center = bounds.getCenter(new THREE.Vector3());
    const width = bounds.max.x - bounds.min.x;
    for (const side of [-1, 1]) {
      const direction = new THREE.Vector3(0, 0, -side).transformDirection(avatar.matrixWorld);
      const across = new THREE.Vector3(1, 0, 0).transformDirection(avatar.matrixWorld);
      let visible = 0, magma = 0;
      for (let row = 0; row < 9; row++) {
        for (let column = -3; column <= 3; column++) {
          const origin = center.clone().addScaledVector(across, column * width / 7).addScaledVector(direction, -2);
          origin.y = bounds.min.y + height * (row + 0.5) / 9;
          sampler.set(origin, direction);
          const [hit] = sampler.intersectObjects(body, true);
          if (!hit) continue;
          visible++;
          const material = hit.object.material;
          color.copy(material.color);
          if (material.vertexColors) {
            const tint = hit.object.geometry.getAttribute('color');
            color.multiply(new THREE.Color().fromBufferAttribute(tint, hit.face.a));
          }
          if (color.getHex() === 0xef4136) magma++;
        }
      }
      assert.ok(visible && magma / visible >= 0.08, `${side < 0 ? '앞' : '뒤'}에서 보이는 HLB 레드: ${magma}/${visible}`);
    }
  } finally {
    player.dispose();
  }
});

test('서기·걷기·점프 자세 모두에서 턱이 옷의 양쪽 어깨와 맞닿는다', () => {
  const {player} = createPlayer();
  try {
    const avatar = scene.getObjectByName('campus-visitor');
    const head = avatar.getObjectByName('visitor-head');
    const headMeshes = [];
    head.traverse(part => { if (part.isMesh) headMeshes.push(part); });
    const bodyMeshes = [];
    avatar.traverse(part => { if (part.isMesh && !headMeshes.includes(part)) bodyMeshes.push(part); });
    const up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);
    const sampler = new THREE.Raycaster();
    const color = new THREE.Color();

    function checkContact(pose) {
      avatar.updateWorldMatrix(true, true);
      const center = head.getWorldPosition(new THREE.Vector3());
      // Intersect the actual chin from below and the red jacket from above in
      // the same columns. Disjoint rounded surfaces can share a bounding box.
      // Offset samples a few millimetres from sphere poles and triangle seams.
      for (const [x, z] of [[.003, .002], [-.08, .002], [.08, .002], [.003, -.055], [.003, .055]]) {
        const origin = new THREE.Vector3(x, 0, z).applyQuaternion(avatar.quaternion).add(center);
        sampler.set(origin.clone().addScaledVector(up, -1), up);
        const [chin] = sampler.intersectObjects(headMeshes, false);
        sampler.set(origin.clone().addScaledVector(up, 1), down);
        const jacket = sampler.intersectObjects(bodyMeshes, false).find(hit => {
          const colors = hit.object.geometry.getAttribute('color');
          return colors && color.fromBufferAttribute(colors, hit.face.a).getHex() === 0xef4136;
        });
        assert.ok(chin && jacket, `${pose} 자세 (${x}, ${z})에서 턱 ${Boolean(chin)}, 상의 ${Boolean(jacket)}`);
        const gap = chin.point.y - jacket.point.y;
        assert.ok(gap <= .001, `${pose} 자세 (${x}, ${z})에서 턱과 옷 사이 간격 ${gap.toFixed(3)}m`);
      }
    }
    checkContact('서기');
    player.setStick(1, 0);
    for (let frame = 0; frame < 6; frame++) player.update(1 / 30);
    checkContact('걷기');
    player.jump();
    for (let frame = 0; frame < 10; frame++) player.update(1 / 30);
    checkContact('점프');
  } finally {
    player.dispose();
  }
});

test('자료가 열린 동안 이동을 멈추고, 자료를 닫아도 이전 입력으로 다시 걷지 않는다', () => {
  const {player} = createPlayer();
  try {
    const start = {...player.getPosition()};
    const avatar = scene.getObjectByName('campus-visitor');
    assert.ok(avatar, '장면에 방문객 모델이 있어야 함');
    const dimensions = new THREE.Box3().setFromObject(avatar).getSize(new THREE.Vector3());
    assert.ok(dimensions.y > 1 && dimensions.x > 0.2 && dimensions.z > 0.2, '캐릭터는 사람 크기의 입체 모델이어야 함');
    const joints = [];
    avatar.traverse(part => {
      if (part.isGroup && part !== avatar) joints.push([part, part.quaternion.clone()]);
    });
    player.setStick(0, 1);
    for (let i = 0; i < 6; i++) player.update(1 / 30);
    const moved = {...player.getPosition()};
    assert.ok(distance(start, moved) > 0.15, '조이스틱을 누르면 캐릭터가 움직여야 함');
    assert.ok(joints.filter(([part, pose]) => part.quaternion.angleTo(pose) > 0.03).length >= 2,
      '걷는 동안 여러 관절의 자세가 변해야 함');
    player.setActive(false);
    for (let i = 0; i < 15; i++) player.update(1 / 30);
    player.setActive(true);
    for (let i = 0; i < 15; i++) player.update(1 / 30);
    assert.ok(distance(moved, player.getPosition()) < 0.01, '닫고 돌아온 자리에서 멈춰야 함');
  } finally {
    player.dispose();
  }
});

test('달리면서 한 번 점프하고 바닥에 착지한 뒤 다시 점프할 수 있다', () => {
  const {player} = createPlayer();
  try {
    const avatar = scene.getObjectByName('campus-visitor');
    const head = avatar.getObjectByName('visitor-head');
    const shadow = avatar.getObjectByName('visitor-shadow');
    const height = part => part.getWorldPosition(new THREE.Vector3()).y;
    const start = player.getPosition();
    const standing = height(head), ground = height(shadow);
    player.setStick(0, 1);
    assert.ok(player.jump());
    for (let frame = 0; frame < 10; frame++) player.update(1 / 30);
    assert.ok(height(head) > standing + .6);
    assert.ok(distance(player.getPosition(), start) > .5);
    assert.equal(height(shadow), ground);
    assert.equal(player.jump(), false);
    player.setStick(0, 0);
    for (let frame = 0; frame < 25; frame++) player.update(1 / 30);
    assert.ok(Math.abs(height(head) - standing) < .06);
    player.setActive(false);
    assert.equal(player.jump(), false);
    player.setActive(true);
    assert.ok(player.jump());
  } finally {
    player.dispose();
  }
});
