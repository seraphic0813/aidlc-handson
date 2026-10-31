import { createServer, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { AppError, assignees, categories, statuses } from '../shared/types.js';
import { object } from '../shared/input-policy.js';
import type { InquiryService } from './inquiry-service.js';
import type { LocalLogger } from './logger.js';
import { validateRequest, readJson } from './request-policy.js';
import { staticFile } from './static-files.js';
export function httpServer(
  service: InquiryService,
  publicRoot: string,
  logger: LocalLogger,
  bodyTimeoutMs = 5000,
) {
  const server = createServer(
    {
      maxHeaderSize: 16384,
      requestTimeout: 5000,
      headersTimeout: 5000,
      connectionsCheckingInterval: 1000,
    },
    async (request, response) => {
      const id = randomUUID();
      const start = performance.now();
      const address = server.address();
      const origin = `http://127.0.0.1:${address && typeof address === 'object' ? address.port : 3000}`;
      const send = (status: number, data: unknown) => {
        response.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
        });
        response.end(JSON.stringify({ ...(data as object), requestId: id }));
      };
      securityHeaders(response);
      response.setHeader('X-Request-Id', id);
      let operation = 'request';
      try {
        validateRequest(request, origin);
        const url = new URL(request.url ?? '/', origin);
        const path = url.pathname;
        if (path.startsWith('/api/')) {
          operation =
            path === '/api/health'
              ? 'health'
              : request.method === 'GET'
                ? 'read'
                : 'save';
          response.setHeader('Cache-Control', 'no-store');
          if (request.method === 'GET' && path === '/api/health') {
            service.repository.db
              .prepare('SELECT count(*) FROM initialization_checkpoints')
              .get();
            send(200, { status: 'ok' });
          } else if (request.method === 'GET' && path === '/api/options')
            send(200, { categories, assignees, statuses });
          else if (request.method === 'GET' && path === '/api/inquiries')
            send(200, {
              data: service.search(
                url.searchParams.get('query') ?? '',
                url.searchParams.get('status') ?? 'all',
                Number(url.searchParams.get('page') ?? 1),
              ),
            });
          else if (
            request.method === 'GET' &&
            /^\/api\/inquiries\/DF-\d+$/.test(path)
          )
            send(200, { data: service.get(path.split('/').at(-1)) });
          else if (request.method === 'POST') {
            const body = await readJson(request, bodyTimeoutMs);
            if (path === '/api/inquiries') {
              const input = object(body, ['submissionKey', 'input']);
              const result = service.register(input.input, input.submissionKey);
              send(result.replayed ? 200 : 201, { data: result });
            } else if (
              /^\/api\/inquiries\/DF-\d+\/(response|reopen)$/.test(path)
            ) {
              const parts = path.split('/');
              const isReopen = parts.at(-1) === 'reopen';
              const input = object(
                body,
                isReopen ? ['expectedVersion'] : ['expectedVersion', 'input'],
              );
              send(200, {
                data: isReopen
                  ? service.reopen(parts[3], input.expectedVersion)
                  : service.save(parts[3], input.expectedVersion, input.input),
              });
            } else
              throw new AppError('NOT_FOUND', '操作が見つかりません。', 404);
          } else throw new AppError('NOT_FOUND', '操作が見つかりません。', 404);
        } else if (request.method === 'GET') {
          const file = staticFile(
            publicRoot,
            (request.url ?? '/').split('?')[0],
          );
          response.writeHead(200, {
            'Content-Type': file.type,
            'Cache-Control': 'no-cache',
          });
          response.end(file.body);
        } else throw new AppError('NOT_FOUND', '操作が見つかりません。', 404);
        logger.log({
          operation,
          result: 'success',
          correlationId: id,
          durationMs: performance.now() - start,
        });
      } catch (error) {
        const known =
          error instanceof AppError
            ? error
            : new AppError(
                'STORAGE_UNAVAILABLE',
                '保存先または処理を確認できません。入力を保って再試行してください。',
                503,
              );
        if (!response.headersSent && !response.destroyed) {
          response.setHeader('Connection', 'close');
          send(known.status, {
            error: {
              code: known.code,
              message: known.message,
              fields: known.fields,
            },
          });
        }
        logger.log({
          operation,
          result: 'failed',
          code: known.code,
          correlationId: id,
          durationMs: performance.now() - start,
        });
      }
    },
  );
  return server;
}
function securityHeaders(response: ServerResponse): void {
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; connect-src 'self'",
  );
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
}
