import type { IncomingMessage } from 'node:http';
import { AppError } from '../shared/types.js';
import { MAX_BODY_BYTES } from '../shared/input-policy.js';
export function validateRequest(
  request: IncomingMessage,
  origin: string,
): void {
  if (request.headers.host !== new URL(origin).host)
    throw new AppError('INVALID_HOST', '許可されていない接続先です。', 403);
  if (request.method === 'POST') {
    if (
      request.headers.origin !== origin ||
      request.headers['x-deskflow-request'] !== '1' ||
      request.headers['sec-fetch-site'] === 'cross-site'
    )
      throw new AppError(
        'INVALID_ORIGIN',
        '同じ画面から操作をやり直してください。',
        403,
      );
    if (
      request.headers['content-type']?.split(';')[0].trim() !==
      'application/json'
    )
      throw new AppError(
        'INVALID_CONTENT_TYPE',
        'JSON形式で送信してください。',
        415,
      );
  }
}
export function readJson(
  request: IncomingMessage,
  timeoutMs = 5000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    let settled = false;
    const fail = (error: Error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    };
    const timer = setTimeout(
      () =>
        fail(
          new AppError(
            'REQUEST_TIMEOUT',
            '受信を完了できませんでした。入力を保って再試行してください。',
            408,
          ),
        ),
      timeoutMs,
    );
    request.on('data', (chunk: Buffer) => {
      if (settled) return;
      length += chunk.byteLength;
      if (length > MAX_BODY_BYTES) {
        fail(
          new AppError(
            'BODY_TOO_LARGE',
            '送信データ量が64KiBの上限を超えています。',
            413,
          ),
        );
        return;
      }
      chunks.push(chunk);
    });
    request.once('end', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        resolve(
          JSON.parse(
            new TextDecoder('utf-8', { fatal: true }).decode(
              Buffer.concat(chunks),
            ),
          ),
        );
      } catch {
        reject(
          new AppError('INVALID_JSON', '送信内容を読み取れませんでした。'),
        );
      }
    });
    request.once('error', () =>
      fail(
        new AppError(
          'REQUEST_ABORTED',
          '送信が中断されました。結果を確認してください。',
          400,
        ),
      ),
    );
    request.once('aborted', () =>
      fail(
        new AppError(
          'REQUEST_ABORTED',
          '送信が中断されました。結果を確認してください。',
          400,
        ),
      ),
    );
  });
}
