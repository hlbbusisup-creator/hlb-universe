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
for (const path of ['assets/vendor/three.min.js', 'src/cologne-gallery.js', 'src/world3d.js', 'src/player3d.js']) {
  const file = new URL('../' + path, import.meta.url);
  runInContext(await readFile(file, 'utf8'), context, { filename: path });
}
const {THREE, HLBWorld3D, HLBPlayer3D} = page;
const scene = new THREE.Scene();
const world = HLBWorld3D.build(scene);

function createPlayer() {
  const camera = new THREE.PerspectiveCamera(55, 1.6, 0.1, 200);
  const player = HLBPlayer3D.create(scene, camera, makeCanvas(), world);
  player.setActive(true);
  return { player, camera };
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

test('산책 시작점에서 여섯 건물의 열람대까지 벽을 통과하지 않고 걸어갈 수 있다', () => {
  assert.deepEqual(Array.from(world.spaces, space => space.id).sort(), ['brand', 'cologne', 'esg', 'group', 'ir', 'product']);
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

test('레서판다 방문객은 실제 머리 높이의 약 두 배이고 앞뒤에서 HLB 마그마 레드가 보인다', () => {
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
