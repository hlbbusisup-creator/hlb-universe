import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import '../src/history-data.js';

test('역사책의 2000~2026 연혁은 시간순이며 사진 유무와 관계없이 본문과 출처를 보존한다',async()=>{
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
    if(chapter.photo){
      assert.ok(chapter.photo.caption && chapter.photo.alt && /^https?:\/\//.test(chapter.photo.sourceUrl));
      assert.match(chapter.photo.url,/^assets\/history\/images\/[\w-]+\.(?:jpg|png|webp|svg)$/);
      assert.ok((await stat(new URL('../'+chapter.photo.url,import.meta.url))).size>0);
    }
    assert.ok(chapter.sources.length>0);
    for(const source of chapter.sources)assert.match(source.url,/^https:\/\//);
  }
  assert.equal(data.chapters.reduce((n,c)=>n+c.events.length,0),75);
});

test('역사책은 관련 이미지 9개를 각각 한 장에서만 사용하고 사진 없는 장을 허용한다',async()=>{
  const chapters=globalThis.HLBHistoryData.chapters;
  const illustrated=chapters.filter(chapter=>chapter.photo);
  assert.equal(illustrated.length,9);
  assert.equal(chapters.filter(chapter=>!chapter.photo).length,11);
  const urls=illustrated.map(chapter=>chapter.photo.url);
  assert.equal(new Set(urls).size,urls.length,'같은 이미지 URL을 다른 연도에 반복해서 배치하지 않는다');
  const hashes=await Promise.all(urls.map(async url=>createHash('sha256').update(await readFile(new URL('../'+url,import.meta.url))).digest('hex')));
  assert.equal(new Set(hashes).size,hashes.length,'파일명이 달라도 동일한 이미지 파일을 반복해서 배치하지 않는다');
});
