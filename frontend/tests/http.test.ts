import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ApiError, createHttpClient, toQuery } from '../src/services/http';

function start(handler: Parameters<typeof createServer>[1]) {
  return new Promise<{ url: string; close: () => Promise<void> }>(resolve => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise(r => { server.closeAllConnections(); server.close(() => r()); }) });
    });
  });
}

test('toQuery bỏ giá trị rỗng và mã hoá ký tự đặc biệt', () => {
  assert.equal(toQuery({ q: 'chạy bộ', type: '', _page: 1, x: undefined }), '?q=ch%E1%BA%A1y%20b%E1%BB%99&_page=1');
  assert.equal(toQuery({}), '');
});

test('GET thành công, đọc X-Total-Count; DELETE body rỗng không lỗi', async () => {
  const s = await start((req, res) => {
    if (req.method === 'DELETE') { res.writeHead(200); return res.end('{}'); }
    res.writeHead(200, { 'Content-Type': 'application/json', 'X-Total-Count': '42' });
    res.end(JSON.stringify([{ id: 'a' }]));
  });
  const c = createHttpClient({ baseUrl: s.url });
  const r = await c.get<{ id: string }[]>('/workouts');
  assert.equal(r.total, 42);
  assert.equal(r.data[0].id, 'a');
  await c.del('/workouts/a');
  await s.close();
});

test('lỗi HTTP 404/500 trả ApiError kind=http, không giả vờ thành công', async () => {
  const s = await start((req, res) => { res.writeHead(req.url === '/missing' ? 404 : 500); res.end('nope'); });
  const c = createHttpClient({ baseUrl: s.url });
  await assert.rejects(c.get('/missing'), (e: unknown) => e instanceof ApiError && e.kind === 'http' && e.status === 404);
  await assert.rejects(c.post('/workouts', { a: 1 }), (e: unknown) => e instanceof ApiError && e.kind === 'http' && e.status === 500);
  await s.close();
});

test('JSON hỏng => kind=parse', async () => {
  const s = await start((_req, res) => { res.writeHead(200); res.end('<html>not json'); });
  const c = createHttpClient({ baseUrl: s.url });
  await assert.rejects(c.get('/x'), (e: unknown) => e instanceof ApiError && e.kind === 'parse');
  await s.close();
});

test('server tắt => kind=network', async () => {
  const s = await start((_q, res) => res.end('{}'));
  const url = s.url;
  await s.close();
  const c = createHttpClient({ baseUrl: url, timeoutMs: 2000 });
  await assert.rejects(c.get('/x'), (e: unknown) => e instanceof ApiError && e.kind === 'network');
});

test('server không phản hồi => kind=timeout', async () => {
  const s = await start(() => { /* không trả lời */ });
  const c = createHttpClient({ baseUrl: s.url, timeoutMs: 150 });
  await assert.rejects(c.get('/x'), (e: unknown) => e instanceof ApiError && e.kind === 'timeout');
  await s.close();
});

test('POST gửi đúng method, header và body', async () => {
  let seen = { method: '', ct: '', body: '' };
  const s = await start((req, res) => {
    let b = '';
    req.on('data', d => (b += d));
    req.on('end', () => { seen = { method: req.method ?? '', ct: String(req.headers['content-type']), body: b }; res.writeHead(201); res.end('{"id":"n1"}'); });
  });
  const c = createHttpClient({ baseUrl: s.url + '/' });
  const r = await c.put<{ id: string }>('/workouts/n1', { title: 't', calories: undefined });
  assert.equal(r.data.id, 'n1');
  assert.deepEqual(seen, { method: 'PUT', ct: 'application/json', body: '{"title":"t"}' });
  await s.close();
});
