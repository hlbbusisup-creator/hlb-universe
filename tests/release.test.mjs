import assert from "node:assert/strict";
import test from "node:test";
import {matchesPublished} from "../scripts/release.mjs";
import {measurePreview} from "../scripts/review-products.mjs";

test("예약 작업은 공개 사이트의 버전과 커밋이 모두 같을 때만 재배포를 건너뛴다", async () => {
  const expected = {version: "0.2.0", commit: "a".repeat(40)};
  for (const [manifest, matches] of [[expected, true], [{...expected, commit: "b".repeat(40)}, false],
    [{...expected, version: "0.1.0"}, false], [null, false]]) {
    const actual = await matchesPublished("https://example.com/hlb-universe", expected, async url => {
      assert.equal(url.pathname, "/hlb-universe/release.json");
      return {ok: Boolean(manifest), json: async () => manifest};
    });
    assert.equal(actual, matches);
  }
  assert.equal(await matchesPublished("https://example.com/", expected, async () => { throw new Error("offline"); }), false);
});

test("사진 바이트와 가격의 수정은 각각 제품 수가 같아도 새 검수판으로 구분된다", async () => {
  const fixture = [{id:"product", name:"제품", page:1, price:"100원", description:"설명",
    images:[{url:"assets/products/product.webp", alt:"제품 사진"}]}];
  const original = await measurePreview(fixture, async () => Buffer.from("image A"));
  assert.equal(original.withPrice, 1);
  const newPicture = await measurePreview(fixture, async () => Buffer.from("image B"));
  const newPrice = await measurePreview([{...fixture[0], price:"200원"}], async () => Buffer.from("image A"));
  assert.notEqual(newPicture.preview, original.preview);
  assert.notEqual(newPrice.preview, original.preview);
});
