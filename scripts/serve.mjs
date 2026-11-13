import { createServer } from 'node:http';
import { realpath, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function isPublicFile(path) {
  if (path.split('/').some(part => !part || part.startsWith('.'))) return false;
  if (/[\\:\0]/u.test(path)) return false;
  return path === 'index.html' || path === 'styles.css' ||
    path.startsWith('src/') || path.startsWith('assets/');
}

function sendStatus(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendStatus(response, 405, 'Method not allowed');
    return;
  }

  let path;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    path = pathname === '/' ? 'index.html' : pathname.slice(1);
  } catch {
    sendStatus(response, 400, 'Invalid URL');
    return;
  }
  if (!isPublicFile(path)) {
    sendStatus(response, 404, 'File not found');
    return;
  }

  try {
    const file = await realpath(resolve(root, path));
    const canonical = relative(root, file).split(sep).join('/');
    if (!isPublicFile(canonical)) {
      sendStatus(response, 404, 'File not found');
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) { sendStatus(response, 404, 'File not found'); return; }
    const size=info.size;
    let start=0, end=size-1, status=200;
    const headers={
      'Content-Type': mime[extname(canonical).toLowerCase()] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    };
    // PDF and video viewers request slices while paging or seeking.
    const range=request.method==='GET' && request.headers.range;
    if (range) {
      const m=/^bytes=(\d*)-(\d*)$/.exec(range);
      if (m && (m[1] || m[2])) {
        if (m[1]) { start=Number(m[1]); end=m[2] ? Math.min(end,Number(m[2])) : end; }
        else start=Math.max(0,size-Number(m[2]));
        if (start>end || start>=size || !Number.isSafeInteger(start)) {
          response.setHeader('Content-Range','bytes */'+size);
          sendStatus(response,416,'Range not satisfiable'); return;
        }
        status=206; headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
      }
    }
    headers['Content-Length']=Math.max(0,end-start+1);
    response.writeHead(status,headers);
    if (request.method==='HEAD' || size===0) { response.end(); return; }
    await pipeline(createReadStream(file,{start,end}), response);
  } catch (error) {
    if (response.headersSent || response.destroyed) return;
    const missing = ['ENOENT', 'ENOTDIR', 'EISDIR', 'EACCES', 'EPERM'].includes(error.code);
    sendStatus(response, missing ? 404 : 500, missing ? 'File not found' : 'File read error');
  }
});

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT는 0에서 65535 사이의 정수여야 합니다.');
}
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `포트 ${port}을(를) 사용 중입니다. PORT 환경 변수로 다른 포트를 지정하세요.`
    : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`HLB 유니버스  http://${host}:${server.address().port}/`);
});
