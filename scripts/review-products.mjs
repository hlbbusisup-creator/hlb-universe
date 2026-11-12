import {createHash} from "node:crypto";
import {appendFile, readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import "../src/product-data.js";
import "../src/product-source-hashes.js";

const root = new URL("../", import.meta.url);
const digest = value => createHash("sha256").update(value).digest();
const languageNames = {ko: "국문", en: "영문"};

export async function measurePreview(rows, loadImage) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("제품 목록이 비어 있습니다.");
  const images = new Set(), ids = new Set();
  for (const row of rows) {
    if (!row.id || ids.has(row.id) || !row.name?.trim() || !Number.isInteger(row.page) || row.page < 1) {
      throw new Error("제품명·고유 ID·원본 쪽 번호를 확인하세요: " + row.id);
    }
    ids.add(row.id);
    for (const image of row.images) {
      if (!/^assets\/products\/[\w.-]+\.(webp|jpg|png)$/i.test(image.url) || !image.alt?.trim()) {
        throw new Error("제품 사진 경로·설명을 확인하세요: " + row.id);
      }
      images.add(image.url);
    }
  }
  const hash = createHash("sha256").update(JSON.stringify(rows));
  for (const path of [...images].sort()) {
    const bytes = await loadImage(path);
    if (!bytes.length) throw new Error("빈 제품 사진: " + path);
    hash.update(path).update(digest(bytes));
  }
  return {
    preview: hash.digest("hex"), products: rows.length,
    withPhotos: rows.filter(row => row.images.length).length,
    withDescription: rows.filter(row => row.description?.trim()).length,
    withPrice: rows.filter(row => row.price?.trim()).length
  };
}

export async function productReport() {
  const catalog = JSON.parse(await readFile(new URL("assets/reading/notion/catalog.json", root), "utf8"));
  const report = [];
  for (const [lang, reviewed] of Object.entries(globalThis.HLBProductEditions)) {
    const media = catalog.resources.find(resource => resource.id === "products-" + lang)?.reading?.media;
    const source = media?.type === "pdf" ? media.sha256 : undefined;
    const measured = await measurePreview(globalThis.HLBProducts[lang], path => readFile(new URL(path, root)));
    const verified = Object.entries(measured).every(([key, value]) => reviewed[key] === value);
    report.push({lang, source, reviewed, measured, verified, pending: source !== reviewed.source});
  }
  return report;
}

function checkIntegrity(report) {
  if (report.some(row => !row.verified)) {
    throw new Error("도감 데이터·사진과 검수 기록이 다릅니다. PDF와 대조한 후 src/product-source-hashes.js의 검수 기록을 갱신하세요.");
  }
}

export async function reviewProducts() {
  checkIntegrity(await productReport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await productReport();
  const lines = ["### 제품 도감 원본 대조", ""];
  for (const {lang, source, reviewed, measured, verified, pending} of report) {
    const title = languageNames[lang];
    lines.push(`- **${title}** — ${pending ? "새 원본 검수 필요" : "원본 판본 일치"} · 제품 ${measured.products}개, 사진 보유 ${measured.withPhotos}개, 설명 ${measured.withDescription}개, 가격 표시 ${measured.withPrice}개`);
    if (pending) {
      lines.push(`  - 원본 PDF \`${source || "없음"}\`, 현재 검수판 \`${reviewed.source}\``);
      if (process.env.GITHUB_ACTIONS) console.log(`::warning title=${title} 제품 도감 확인 필요::원본 PDF가 바뀌었습니다. 작업 요약의 검수 절차를 확인하세요.`);
    }
    if (!verified) lines.push("  - 제품 내용 또는 이미지 파일이 검수 기록과 다릅니다.");
    console.log(title, JSON.stringify({source, ...measured}));
  }
  if (report.some(row => row.pending || !row.verified)) {
    lines.push("", "담당자는 최신 PDF를 열어 제품 목록·사진·설명·가격을 대조하고, 바뀐 데이터와 사진, 검수 기록을 함께 반영하세요. 상세 절차는 README의 ‘제품 도감 판본 검수’를 참조하세요.");
  }
  const summary = lines.join("\n") + "\n";
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, "pending=" + report.some(row => row.pending) + "\n");
  checkIntegrity(report);
}
