import { cp, lstat, mkdir, realpath, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const dist = join(root, 'dist');
const output = join(dist, 'site');

// Only clear the dedicated site directory, even when a local path is a junction.
for (const directory of [dist, output]) {
  await mkdir(directory, { recursive: true });
  if (await realpath(directory) !== directory) {
    throw new Error(`출력 폴더가 다른 경로를 가리킵니다: ${directory}`);
  }
}
await rm(output, { recursive: true });
await mkdir(output);

for (const entry of ['index.html', 'styles.css', 'src', 'assets']) {
  await cp(join(root, entry), join(output, entry), {
    recursive: true,
    filter: async (source) => {
      if (basename(source).startsWith('.')) return false;
      if ((await lstat(source)).isSymbolicLink()) {
        throw new Error(`공개 파일은 프로젝트 안에 있어야 합니다: ${source}`);
      }
      return true;
    }
  });
}

console.log('배포 파일을 dist/site에 생성했습니다.');
