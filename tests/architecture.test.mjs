import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createContext, runInContext} from "node:vm";
import test from "node:test";

const context = createContext({
  document: {
    createElement() {
      return {getContext: () => ({fillRect() {}, fillText() {}})};
    }
  }
});
for (const path of ["assets/vendor/three.min.js", "src/hall-designs.js", "src/cafe.js", "src/cologne-gallery.js", "src/history-hall.js"]) {
  runInContext(await readFile(new URL("../" + path, import.meta.url), "utf8"), context, {filename: path});
}
const T = context.THREE;
const forms = {
  box: new T.BoxGeometry(1, 1, 1),
  round: new T.CylinderGeometry(1, 1, 1, 18),
  rock: new T.DodecahedronGeometry(1, 0),
  crystal: new T.OctahedronGeometry(1),
  leaf: new T.SphereGeometry(1, 8, 6)
};

function kit() {
  const site = new T.Group();
  const colliders = [], roofs = [];
  const material = new T.MeshBasicMaterial();
  const place = (shape, color, x, y, z, sx, sy, sz, rotation) => {
    const mesh = new T.Mesh(forms[shape], material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    if (rotation?.isQuaternion) mesh.quaternion.copy(rotation);
    else if (rotation) mesh.rotation.set(...rotation);
    site.add(mesh);
  };
  return {
    T, site, colliders, roofs, place,
    box: (x, y, z, w, h, d, color, rotation) => place("box", color, x, y, z, w, h, d, rotation),
    tube(a, b, r, color) {
      const start = new T.Vector3(...a), end = new T.Vector3(...b);
      const direction = end.clone().sub(start);
      const midpoint = start.add(end).multiplyScalar(.5);
      const rotation = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction.clone().normalize());
      place("round", color, midpoint.x, midpoint.y, midpoint.z, r, direction.length(), r, rotation);
    },
    collider: (x, z, w, d, height, base = 0) =>
      ({minX:x-w/2, maxX:x+w/2, minZ:z-d/2, maxZ:z+d/2, minY:base, maxY:height})
  };
}

test("기존 일곱 건물의 장식을 포함한 지붕 최고점은 4.3m 선을 유지한다", () => {
  for (const id of ["group", "brand", "product", "ir", "esg", "cafe", "cologne"]) {
    const builder = kit();
    if (id === "cafe") context.HLBCafe.build(builder);
    else if (id === "cologne") context.HLBCologneGallery.build(builder);
    else context.HLBHalls.build(builder, {id, title:id, en:id, x:0, front:0, width:10, depth:6.5});
    const bounds = new T.Box3().setFromObject(builder.site);
    assert.ok(Math.abs(bounds.max.y - 4.3) < .025, id + " 최고 높이 " + bounds.max.y);
    assert.ok(builder.roofs.length > 0, id + " 카메라 지붕 충돌체");
  }
});

test("역사관은 넓은 궁궐형 전각과 곡선 겹처마·팔작지붕을 갖춘다", () => {
  const builder=kit(),hall=context.HLBHistoryHall.build(builder);
  builder.site.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(builder.site),roof=hall.palace.roof;
  assert.ok(bounds.max.y>7.8 && bounds.max.y<8.2,'역사관만 높은 궁궐 지붕');
  assert.equal(hall.interior.maxX-hall.interior.minX,18);
  assert.equal(hall.z-hall.interior.minZ,13.5);
  assert.equal(hall.interior.floorY,0,'언덕 배치 이전의 로컬 바닥 기준');
  assert.ok(hall.interior.ceilingY>4 && hall.interior.ceilingY<4.2,'내부 보는 별도 천장 높이');
  assert.ok(hall.palace.tileLines.geometry.getAttribute('position').count>1000,'곡면을 따르는 기와선');
  const roofHeight=z=>{
    const ray=new T.Raycaster(new T.Vector3(0,10,z),new T.Vector3(0,-1,0));
    const hit=ray.intersectObject(roof,false)[0];
    assert.ok(hit,'연속된 곡선 처마');return hit.point.y;
  };
  const inner=roofHeight(-2.65),middle=roofHeight(-.65),edge=roofHeight(1.34);
  assert.ok(Math.abs(middle-(inner+edge)/2)>.15,'직선 삼각지붕이 아닌 휘어진 처마');
  const ray=new T.Raycaster(new T.Vector3(0,10,.80),new T.Vector3(0,-1,0));
  const layers=[...new Set(ray.intersectObject(roof,false).map(hit=>hit.point.y.toFixed(2)))];
  assert.ok(layers.length>=2,'서로 다른 높이에 놓인 겹처마');
  assert.ok(hall.exhibits.every(exhibit=>Math.abs(exhibit.station.x)<.01),'책과 시청점 중앙 축');
  assert.ok(hall.projection.cameraPosition.y<hall.interior.ceilingY);
  const solids=[];
  builder.site.traverse(object=>{if(object.isMesh && object.material.opacity>.9)solids.push(object);});
  const {screen,cameraPosition,screenWidth,screenHeight}=hall.projection;
  const eye=new T.Vector3(cameraPosition.x,cameraPosition.y,cameraPosition.z),sampler=new T.Raycaster();
  for(const x of [-.43,0,.43])for(const y of [-.43,0,.43]) {
    const target=screen.localToWorld(new T.Vector3(screenWidth*x,screenHeight*y,0));
    sampler.set(eye,target.clone().sub(eye).normalize());sampler.far=eye.distanceTo(target)-.001;
    assert.equal(sampler.intersectObjects(solids,false).length,0,'궁궐 기둥과 보가 화면을 가리지 않음');
  }
  for(const x of [-3.5,0,3.5])for(const z of [-1,-3,-9.4]) {
    assert.ok(builder.colliders.every(box=>x<=box.minX || x>=box.maxX || z<=box.minZ || z>=box.maxZ),
      '좌석 없는 개방된 진입·관람 공간 '+x+','+z);
  }
});

test("주요 간판의 글자 영역은 진입 방향에서 처마와 장식에 가리지 않는다", () => {
  for (const id of ["group", "brand", "product", "ir", "esg", "cologne", "history"]) {
    const builder = kit();
    if (id === "cologne") context.HLBCologneGallery.build(builder);
    else if (id === "history") context.HLBHistoryHall.build(builder);
    else context.HLBHalls.build(builder, {id, title:id, en:id, x:0, front:0, width:10, depth:6.5});
    builder.site.updateMatrixWorld(true);
    const signs = [], solids = [];
    builder.site.traverse(object => {
      if (object.userData.wayfindingSign) signs.push(object);
      if (object.isMesh && object.material.opacity > .9) solids.push(object);
    });
    assert.equal(signs.length, id === "cologne" ? 2 : 1, id + " 외부 간판 개수");
    const ray = new T.Raycaster();
    for (const sign of signs) {
      const {width, height} = sign.userData.wayfindingSign;
      const center = sign.getWorldPosition(new T.Vector3());
      const normal = new T.Vector3(0, 0, 1).transformDirection(sign.matrixWorld);
      const tangent = new T.Vector3(1, 0, 0).transformDirection(sign.matrixWorld);
      for (const side of [-3, 0, 3]) for (const eyeY of [1.7, 5.5]) {
        const eye = center.clone().addScaledVector(normal, 8).addScaledVector(tangent, side);
        eye.y = eyeY;
        for (const x of [-.42, -.21, 0, .21, .42]) for (const y of [-.35, 0, .35]) {
          const target = sign.localToWorld(new T.Vector3(width*x, height*y, 0));
          ray.set(eye, target.clone().sub(eye).normalize());
          ray.far = eye.distanceTo(target) - .001;
          const first = ray.intersectObjects(solids, false)[0];
          assert.ok(!first,
            id + " 간판 가림: 위치 " + [side,eyeY,x,y] + ", 구조물 " + first?.object.name +
            " " + first?.object.position.toArray() + " / " + first?.object.scale.toArray());
        }
      }
    }
  }
});
