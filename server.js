import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiConfig } from './src/ai.js';
import { DIFFICULTIES, SUBJECTS } from './src/curriculum.js';
import { generateQuiz, InputError } from './src/generate.js';

const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));
const MAX_BODY_BYTES = 10_000;
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function send(res, status, contentType, body) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'",
  });
  res.end(body);
}

const sendJson = (res, status, data) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(data));

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new InputError('요청이 너무 큽니다.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new InputError('요청 형식이 올바르지 않습니다.');
  }
}

async function serveStatic(pathname, res) {
  let file;
  try {
    file = resolve(PUBLIC_DIR, `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`);
  } catch {
    file = '';
  }
  // public 폴더 밖의 파일은 내주지 않는다.
  if (file.startsWith(PUBLIC_DIR + sep)) {
    try {
      return send(res, 200, CONTENT_TYPES[extname(file)] ?? 'application/octet-stream', await readFile(file));
    } catch {
      // 없는 파일은 아래에서 404 로 처리한다.
    }
  }
  return send(res, 404, 'text/plain; charset=utf-8', '찾을 수 없는 페이지입니다.');
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/api/meta' && req.method === 'GET') {
    return sendJson(res, 200, { subjects: SUBJECTS, difficulties: DIFFICULTIES, aiEnabled: aiConfig() !== null });
  }
  if (pathname === '/api/quiz' && req.method === 'POST') {
    return sendJson(res, 200, await generateQuiz(await readJson(req)));
  }
  if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: '지원하지 않는 요청입니다.' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: '지원하지 않는 요청입니다.' });
  return serveStatic(pathname, res);
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    if (error instanceof InputError) return sendJson(res, 400, { error: error.message });
    console.error(error);
    return sendJson(res, 500, { error: '문제를 만드는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  });
});

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT) || 3000;

server.listen(port, host, () => {
  console.log(`퀴즈 생성기 실행 중: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  console.log(aiConfig() ? `문항 출처: AI (${aiConfig().model})` : '문항 출처: 내장 문제은행 (AI 키 미설정)');
});
