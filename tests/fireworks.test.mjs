import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {createContext, runInContext} from 'node:vm';

test('불꽃이 터질 때 브랜드 문구가 나타나고 폭죽과 문구가 차례로 사라진다', async () => {
  const labels = [];
  const paint = {strokeText() {}, fillText(text) { labels.push(text); }};
  const page = createContext({document:{createElement:() => ({getContext:() => paint})}});
  for (const path of ['assets/vendor/three.min.js','src/fireworks.js']) {
    runInContext(await readFile(new URL('../' + path, import.meta.url), 'utf8'), page);
  }
  const {THREE, HLBFireworks} = page;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, 390/844, .06, 300);
  camera.position.set(0, 2, 5);
  camera.lookAt(0, 1.3, 0);
  const announcements = [];
  const effect = HLBFireworks.create(scene, camera, {width:585, clientWidth:390}, {
    onBurst:text => announcements.push(text)
  });
  const caption = scene.getObjectByName('Human Life Better HLB');
  const launch = reduced => effect.launch({x:0, z:0}, reduced);
  assert.deepEqual(labels, ['Human Life Better HLB']);
  assert.equal(launch(false), true);
  assert.equal(launch(false), false);
  for (let i = 0; i < 6; i++) effect.update(.1);
  assert.equal(caption.visible, false);
  assert.deepEqual(announcements, []);
  for (let i = 0; i < 3; i++) effect.update(.1);
  assert.equal(caption.visible, true);
  assert.deepEqual(announcements, labels);

  // An orbit or tight portrait crop must still leave the complete phrase readable.
  camera.lookAt(8, 2, 5);
  effect.update(.02);
  const center = caption.position.clone().project(camera);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const edge = caption.position.clone().addScaledVector(right, caption.scale.x / 2).project(camera);
  assert.ok(center.x > -1 && edge.x < 1 && 2 * center.x - edge.x > -1);
  for (let i = 0; i < 24; i++) effect.update(.1);
  assert.equal(caption.visible, false);
  assert.equal(scene.getObjectByName('HLB fireworks').children.length, 1);
  assert.equal(launch(true), true);
  assert.equal(caption.visible, true);
  assert.deepEqual(announcements, [...labels, ...labels]);
  effect.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(launch(false), false);
});
