import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import {setTimeout as delay} from "node:timers/promises";
import {pathToFileURL} from "node:url";
import "../src/release-info.js";

export async function localRelease() {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  if (globalThis.HLBRelease.version !== pkg.version) {
    throw new Error("도움말과 package.json의 버전 번호를 일치시켜 주세요.");
  }
  let commit = null;
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: new URL("../", import.meta.url), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    if (process.env.GITHUB_ACTIONS) throw error;
  }
  return {version: pkg.version, commit};
}

export async function matchesPublished(base, expected, fetcher = fetch) {
  const url = new URL("release.json", base.replace(/\/?$/, "/"));
  url.searchParams.set("check", String(Date.now()));
  try {
    const response = await fetcher(url, {cache: "no-store", signal: AbortSignal.timeout(10000)});
    if (!response.ok) return false;
    const actual = await response.json();
    return Boolean(expected.commit && actual.commit === expected.commit && actual.version === expected.version);
  } catch {
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, base] = process.argv.slice(2);
  const expected = await localRelease();
  if (command === "matches") {
    console.log(await matchesPublished(base, expected) ? "true" : "false");
  } else if (command === "verify") {
    let matches = false;
    for (let attempt = 1; attempt <= 12; attempt++) {
      if (await matchesPublished(base, expected)) { matches = true; break; }
      if (attempt < 12) await delay(10000);
    }
    if (!matches) throw new Error(`공개 사이트의 버전과 커밋을 확인하지 못했습니다: v${expected.version} / ${expected.commit}`);
    console.log(`공개 확인: v${expected.version} / ${expected.commit}`);
  } else {
    throw new Error("사용법: node scripts/release.mjs matches|verify <사이트 주소>");
  }
}
