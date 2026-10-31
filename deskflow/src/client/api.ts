import {
  AppError,
  type Registration,
  type ResponseInput,
  type Search,
  type SearchResult,
  type Inquiry,
  type SaveResult,
} from '../shared/types.js';
import { checkBodySize } from '../shared/input-policy.js';
async function request<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    if (body !== undefined) checkBodySize(body);
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers:
        body === undefined
          ? {}
          : { 'Content-Type': 'application/json', 'X-DeskFlow-Request': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new AppError(
        'RESULT_UNKNOWN',
        '結果を確認できませんでした。入力を保って受付結果を確認してください。',
        0,
      );
    const payload = (await response.json()) as {
      data: T;
      error?: { code: string; message: string; fields: Record<string, string> };
      requestId?: string;
    };
    if (!response.ok)
      throw new AppError(
        payload.error?.code ?? 'REQUEST_FAILED',
        payload.error?.message ?? '処理に失敗しました。再試行してください。',
        response.status,
        payload.error?.fields ?? {},
      );
    return payload.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'RESULT_UNKNOWN',
      '結果を確認できませんでした。入力を保って再試行してください。',
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}
export const api = {
  register: (input: Registration, submissionKey: string) =>
    request<SaveResult>('/api/inquiries', { input, submissionKey }),
  detail: (ticket: string) =>
    request<Inquiry>(`/api/inquiries/${encodeURIComponent(ticket)}`),
  save: (ticket: string, expectedVersion: number, input: ResponseInput) =>
    request<SaveResult>(
      `/api/inquiries/${encodeURIComponent(ticket)}/response`,
      { expectedVersion, input },
    ),
  reopen: (ticket: string, expectedVersion: number) =>
    request<SaveResult>(`/api/inquiries/${encodeURIComponent(ticket)}/reopen`, {
      expectedVersion,
    }),
  search: (conditions: Search) =>
    request<SearchResult>(
      '/api/inquiries?' +
        new URLSearchParams({
          query: conditions.query,
          status: conditions.status,
          page: String(conditions.page),
        }),
    ),
};
