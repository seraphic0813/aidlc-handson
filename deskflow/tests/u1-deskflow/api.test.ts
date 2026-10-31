import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../src/client/api.js';
const input = {
  requesterName: '社員',
  subject: '相談',
  description: '本文',
  categoryCode: null,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('ブラウザー通信境界', () => {
  it('同一オリジンJSONと独自ヘッダーで登録する', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { replayed: true } }));
    vi.stubGlobal('fetch', fetcher);
    expect(await api.register(input, 'key')).toEqual({ replayed: true });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/inquiries',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DeskFlow-Request': '1',
        },
        body: JSON.stringify({ input, submissionKey: 'key' }),
      }),
    );
  });
  it('検索条件をURLへ安全に符号化する', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { items: [] } }));
    vi.stubGlobal('fetch', fetcher);
    await api.search({ query: '& + 日本語', status: 'completed', page: 2 });
    expect(
      new URL(fetcher.mock.calls[0][0], 'http://127.0.0.1').searchParams.get(
        'query',
      ),
    ).toBe('& + 日本語');
    expect(fetcher.mock.calls[0][1].method).toBe('GET');
  });
  it('詳細・対応・再開の期待版を送る', async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async () => Response.json({ data: {} }));
    vi.stubGlobal('fetch', fetcher);
    await api.detail('DF-000001');
    await api.save('DF-000001', 2, {
      answer: '回答',
      assigneeCode: null,
      status: 'completed',
    });
    await api.reopen('DF-000001', 3);
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
      '/api/inquiries/DF-000001',
      '/api/inquiries/DF-000001/response',
      '/api/inquiries/DF-000001/reopen',
    ]);
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({
      expectedVersion: 3,
    });
  });
  it('競合コードと項目情報を保持する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: 'VERSION_CONFLICT',
              message: '他のタブ',
              fields: { answer: '確認' },
            },
          },
          { status: 409 },
        ),
      ),
    );
    await expect(api.register(input, 'key')).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      status: 409,
      fields: { answer: '確認' },
    });
  });
  it('非JSONと壊れたJSONは結果不明にする', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>'))
      .mockResolvedValueOnce(
        new Response('{', { headers: { 'Content-Type': 'application/json' } }),
      );
    vi.stubGlobal('fetch', fetcher);
    await expect(api.detail('DF-000001')).rejects.toMatchObject({
      code: 'RESULT_UNKNOWN',
    });
    await expect(api.detail('DF-000001')).rejects.toMatchObject({
      code: 'RESULT_UNKNOWN',
    });
  });
  it('10秒で通信を中断し結果不明を返す', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_path, options) =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener('abort', () =>
              reject(new Error('abort')),
            ),
          ),
      ),
    );
    const pending = expect(api.register(input, 'key')).rejects.toMatchObject({
      code: 'RESULT_UNKNOWN',
    });
    await vi.advanceTimersByTimeAsync(10000);
    await pending;
  });
  it('64KiB超過はfetchせず拒否する', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(
      api.register(
        { ...input, description: 'a' + '\u0301'.repeat(40000) },
        'key',
      ),
    ).rejects.toMatchObject({ status: 413 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
