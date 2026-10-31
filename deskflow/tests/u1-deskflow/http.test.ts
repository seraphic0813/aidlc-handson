import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { request } from 'node:http';
import { openDatabase } from '../../src/server/database.js';
import { InquiryRepository } from '../../src/server/repository.js';
import { InquiryService } from '../../src/server/inquiry-service.js';
import { LocalLogger } from '../../src/server/logger.js';
import { httpServer } from '../../src/server/http-server.js';
import { startApplication, runMain } from '../../src/server/main.js';
import { configuration } from '../../src/server/config.js';
import { temporaryDirectory, removeTemporaryDirectory } from '../helpers.js';
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});
async function setup() {
  const root = temporaryDirectory();
  const publicRoot = join(root, 'public');
  mkdirSync(publicRoot);
  writeFileSync(join(publicRoot, 'index.html'), '<html>DeskFlow</html>');
  writeFileSync(join(publicRoot, 'plain.txt'), 'private');
  const db = openDatabase(join(root, 'db.sqlite'));
  const server = httpServer(
    new InquiryService(new InquiryRepository(db)),
    publicRoot,
    new LocalLogger(join(root, 'logs'), () => {}),
    50,
  );
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('address');
  const origin = `http://127.0.0.1:${address.port}`;
  cleanups.push(async () => {
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
    db.close();
    removeTemporaryDirectory(root);
  });
  return {
    root,
    db,
    server,
    origin,
    post: (
      path: string,
      value: unknown,
      headers: Record<string, string> = {},
    ) =>
      fetch(origin + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          'X-DeskFlow-Request': '1',
          ...headers,
        },
        body: JSON.stringify(value),
      }),
  };
}
const body = {
  submissionKey: 'key-1',
  input: {
    requesterName: '社員',
    subject: '件名',
    description: '本文',
    categoryCode: null,
  },
};
describe('HTTPと配信', () => {
  it('一覧・詳細・固定選択肢・ヘルスを取得する', async () => {
    const s = await setup();
    for (const path of [
      '/api/inquiries',
      '/api/inquiries/DF-000001',
      '/api/options',
      '/api/health',
    ])
      expect((await fetch(s.origin + path)).status).toBe(200);
  });
  it('登録、再送、対応保存、再開の経路を提供する', async () => {
    const s = await setup();
    expect((await s.post('/api/inquiries', body)).status).toBe(201);
    expect((await s.post('/api/inquiries', body)).status).toBe(200);
    expect(
      (
        await s.post('/api/inquiries/DF-000011/response', {
          expectedVersion: 1,
          input: {
            assigneeCode: null,
            status: 'in_progress',
            answer: '下書き',
          },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await s.post('/api/inquiries/DF-000011/response', {
          expectedVersion: 2,
          input: { assigneeCode: null, status: 'completed', answer: '解決' },
        })
      ).status,
    ).toBe(200);
    expect(
      (await s.post('/api/inquiries/DF-000011/reopen', { expectedVersion: 3 }))
        .status,
    ).toBe(200);
  });
  it('同じオリジンと独自ヘッダーを要求する', async () => {
    const s = await setup();
    expect(
      (await s.post('/api/inquiries', body, { Origin: 'https://example.com' }))
        .status,
    ).toBe(403);
    expect(
      (await s.post('/api/inquiries', body, { 'X-DeskFlow-Request': '0' }))
        .status,
    ).toBe(403);
    expect(
      (await s.post('/api/inquiries', body, { 'Sec-Fetch-Site': 'cross-site' }))
        .status,
    ).toBe(403);
  });
  it('HostとJSON形式を検証する', async () => {
    const s = await setup();
    const status = await new Promise<number>((done, reject) => {
      const req = request(
        s.origin + '/api/inquiries',
        { headers: { Host: 'evil.local' } },
        (res) => {
          res.resume();
          done(res.statusCode ?? 0);
        },
      );
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(403);
    expect(
      (await s.post('/api/inquiries', body, { 'Content-Type': 'text/plain' }))
        .status,
    ).toBe(415);
  });
  it('不正JSONと入力で保存しない', async () => {
    const s = await setup();
    const bad = await fetch(s.origin + '/api/inquiries', {
      method: 'POST',
      headers: {
        Origin: s.origin,
        'Content-Type': 'application/json',
        'X-DeskFlow-Request': '1',
      },
      body: '{',
    });
    expect(bad.status).toBe(400);
    expect((await s.post('/api/inquiries', { ...body, extra: 1 })).status).toBe(
      400,
    );
    expect(
      Number(s.db.prepare('SELECT count(*) n FROM inquiries').get()?.n),
    ).toBe(10);
  });
  it('実際のJSON本文が65536バイトなら許可し65537を拒否する', async () => {
    const s = await setup();
    const exact = structuredClone(body);
    const overhead = Buffer.byteLength(JSON.stringify(exact));
    exact.input.description =
      'a' + '\u0301'.repeat(Math.floor((65536 - overhead - 1) / 2));
    let text = JSON.stringify(exact);
    text = text + ' '.repeat(65536 - Buffer.byteLength(text));
    const send = (data: string) =>
      fetch(s.origin + '/api/inquiries', {
        method: 'POST',
        headers: {
          Origin: s.origin,
          'Content-Type': 'application/json',
          'X-DeskFlow-Request': '1',
        },
        body: data,
      });
    expect(Buffer.byteLength(text)).toBe(65536);
    expect((await send(text)).status).toBe(201);
    expect((await send(text + ' ')).status).toBe(413);
  });
  it('DB失敗を0件や成功にしない', async () => {
    const s = await setup();
    s.db.exec('DROP TABLE initialization_checkpoints');
    expect((await fetch(s.origin + '/api/health')).status).toBe(503);
  });
  it('存在しない詳細とAPI、禁止メソッドを拒否する', async () => {
    const s = await setup();
    expect((await fetch(s.origin + '/api/inquiries/DF-999999')).status).toBe(
      404,
    );
    expect((await s.post('/api/unknown', {})).status).toBe(404);
    expect(
      (await fetch(s.origin + '/api/inquiries', { method: 'DELETE' })).status,
    ).toBe(404);
  });
  it('静的画面だけを配信し安全なヘッダーを付ける', async () => {
    const s = await setup();
    const result = await fetch(s.origin + '/');
    expect(result.status).toBe(200);
    expect(result.headers.get('content-security-policy')).toContain(
      "object-src 'none'",
    );
    expect(result.headers.get('x-content-type-options')).toBe('nosniff');
    for (const path of [
      '/.local/data/deskflow.sqlite',
      '/plain.txt',
      '/%2e%2e%2fdb.sqlite',
      '/%invalid',
    ])
      expect((await fetch(s.origin + path)).status).toBeGreaterThanOrEqual(400);
  });
  it('受信が完了しない要求を待ち続けない', async () => {
    const s = await setup();
    const status = await new Promise<number>((done, reject) => {
      const req = request(
        s.origin + '/api/inquiries',
        {
          method: 'POST',
          headers: {
            Origin: s.origin,
            'Content-Type': 'application/json',
            'X-DeskFlow-Request': '1',
            'Content-Length': '100',
          },
        },
        (res) => {
          res.resume();
          done(res.statusCode ?? 0);
          req.destroy();
        },
      );
      req.on('error', (error) => {
        if (!String(error).includes('socket hang up')) reject(error);
      });
      req.write('{');
    });
    expect(status).toBe(408);
  });
  it('通常アプリのテスト起動は不足ビルドを検出し、専用データで正常停止できる', async () => {
    const root = temporaryDirectory();
    const c = configuration({}, root);
    await expect(startApplication(c)).rejects.toThrow('ビルド');
    mkdirSync(c.publicRoot, { recursive: true });
    writeFileSync(join(c.publicRoot, 'index.html'), '<html>test</html>');
    const app = await startApplication(
      { ...c, port: 0 },
      new LocalLogger(c.logs, () => {}),
    );
    expect(app.server.address()).not.toBeNull();
    await app.stop();
    await app.stop();
    removeTemporaryDirectory(root);
  });
  it('入口の起動失敗とポート競合を説明する', async () => {
    const output: string[] = [];
    expect(
      await runMain(
        (value) => output.push(value),
        async () => {
          throw Object.assign(new Error('occupied'), { code: 'EADDRINUSE' });
        },
      ),
    ).toBe(1);
    expect(output[0]).toContain('ポート');
    expect(
      await runMain(
        () => {},
        async () => {
          throw new Error('起動失敗');
        },
      ),
    ).toBe(1);
  });
});
