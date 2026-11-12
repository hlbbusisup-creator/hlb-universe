import assert from "node:assert/strict";
import test from "node:test";
import "../src/product-library.js";

const {search,productRoute,resourceRoute,readRoute,resolveProduct} = globalThis.HLBProductLibrary;
const a = {id:"ko-02-01", name:"엔진 에디티브", company:"에이치엘비글로벌", brand:"CARMIM", description:"차량용 첨가제"};
const b = {...a, id:"ko-02-02", name:"엔진 클리너"};

test("제품과 회사 별칭 및 브랜드를 한 번에 검색한다", () => {
  assert.deepEqual(search([a,b], "hlb글로벌 carmim 에디티브"), [a]);
  assert.deepEqual(search([a,b], "엔진에디티브"), [a]);
});

test("제품 공유는 판본에서 행이 이동해도 해당 제품을 열고 같은 자리에 들어온 다른 제품은 거른다", () => {
  const route = readRoute(productRoute(a,"ko"));
  const moved = {...a, id:"ko-04-01"};
  const replacement = {...a, description:"다른 형식의 첨가제"};
  assert.equal(resolveProduct([replacement,moved],route),moved);
  assert.equal(resolveProduct([replacement],route),null);
  assert.equal(readRoute("#/product/ko/../test"),null);
});

test("특정 첨부의 공유 링크가 쿼리 문자를 포함하는 원래 식별자를 보존한다", () => {
  const attachment="https://example.com/a?first=1&next=2#result";
  assert.deepEqual(readRoute(resourceRoute("ir-film",attachment)), {type:"resource",id:"ir-film",attachment});
});
