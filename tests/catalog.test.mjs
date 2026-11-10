import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/catalog-data.js';
import '../src/catalog.js';

const { spaces, loadResources, searchResources } = globalThis.HLBCatalog;
const resources = await loadResources();

test('모든 자료에는 고유 ID, 전시관, 온라인 또는 로컬 원본 주소가 있다', () => {
  const spaceIds = new Set(spaces.map(space => space.id));
  assert.equal(spaceIds.size, spaces.length);
  assert.ok(spaceIds.has('cafe'));
  assert.equal(new Set(resources.map(item => item.id)).size, resources.length);
  for (const item of resources) {
    assert.ok(item.id && item.title.trim());
    assert.ok(spaceIds.has(item.space), item.id);
    assert.ok(/^https:\/\//.test(item.url) || /^assets\/reading\/[\w/-]+\.pdf$/.test(item.url), item.id);
  }
  for (const space of spaceIds) {
    if (['cafe','history'].includes(space)) continue;
    assert.ok(resources.some(item => item.space === space), space);
  }
});

test('에데꼬론 상품관의 두 자료는 한글 발음과 영문 브랜드명으로 검색된다', () => {
  const expected = ['cologne-cartridges', 'cologne-diffuser'];
  for (const query of ['에데꼬론', 'AI de cologne']) {
    const results = searchResources(resources, { query, space: 'cologne' });
    assert.deepEqual(results.map(item => item.id).sort(), expected);
  }
});

test('한국어로 영문 브로슈어를 검색하고 언어와 공간으로 좁힐 수 있다', () => {
  const matches = searchResources(resources, { query: '영문 브로슈어' });
  assert.ok(matches.some(item => item.id === 'brochure-en'));
  assert.ok(!matches.some(item => item.id === 'brochure-ko'));
  const narrowed = searchResources(resources, { space: 'brand', language: '영문' });
  assert.ok(narrowed.some(item => item.id === 'brochure-en'));
  assert.ok(narrowed.every(item => item.space === 'brand' && item.language === '영문'));
});

test('IR 보고서를 연도로 찾고 검색 조건을 지울 수 있다', () => {
  const report = resources.find(item => item.id === 'ir-half');
  assert.ok(report?.year);
  const matches = searchResources(resources, { space: 'ir', year: String(report.year), type: report.type });
  assert.ok(matches.some(item => item.id === report.id));
  assert.ok(matches.every(item => item.space === 'ir' && item.year === report.year && item.type === report.type));
  assert.equal(searchResources(resources, { query: 'zzzz없는자료zzzz' }).length, 0);
  assert.equal(searchResources(resources, {}).length, resources.length);
});
