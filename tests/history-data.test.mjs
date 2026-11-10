import assert from 'node:assert/strict';
import test from 'node:test';
import {stat} from 'node:fs/promises';
import '../src/history-data.js';

test('역사책의 2000~2026 연혁은 시간순이며 모든 장에 실제 사진과 출처가 있다',async()=>{
  const data=globalThis.HLBHistoryData;
  assert.equal(data.title,'History of HLB');
  assert.equal(data.chapters.length,20);
  assert.equal(data.chapters[0].year,2000);
  assert.equal(data.chapters.at(-1).year,2026);
  assert.equal(new Set(data.chapters.map(c=>c.id)).size,20);
  let previous=1999;
  for(const chapter of data.chapters){
    assert.ok(chapter.year>previous);previous=chapter.year;
    assert.ok(chapter.title && chapter.intro && chapter.events.length);
    for(const event of chapter.events){
      assert.ok(event.text.trim());
      assert.ok(event.month===undefined || Number.isInteger(event.month)&&event.month>=1&&event.month<=12);
    }
    assert.ok(chapter.photo?.caption && chapter.photo.alt && /^https?:\/\//.test(chapter.photo.sourceUrl));
    assert.match(chapter.photo.url,/^assets\/history\/images\/[\w-]+\.(?:jpg|png|webp|svg)$/);
    assert.ok((await stat(new URL('../'+chapter.photo.url,import.meta.url))).size>0);
    assert.ok(chapter.sources.length>0);
    for(const source of chapter.sources)assert.match(source.url,/^https:\/\//);
  }
  assert.equal(data.chapters.reduce((n,c)=>n+c.events.length,0),75);
});
