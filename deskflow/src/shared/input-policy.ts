import {
  AppError,
  assignees,
  categories,
  statuses,
  type Registration,
  type ResponseInput,
} from './types.js';
export const MAX_BODY_BYTES = 65536;
const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
export function graphemeCount(value: string): number {
  return Array.from(segmenter.segment(value)).length;
}
export function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
export function checkBodySize(value: unknown): void {
  if (jsonBytes(value) > MAX_BODY_BYTES)
    throw new AppError(
      'BODY_TOO_LARGE',
      '送信データ量が64KiBの上限を超えています。入力を短くしてください。',
      413,
    );
}
export function object(
  value: unknown,
  allowed: string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key))
  )
    throw new AppError('INVALID_INPUT', '入力形式が正しくありません。');
  return value as Record<string, unknown>;
}
function text(
  value: unknown,
  name: string,
  label: string,
  min: number,
  max: number,
): string {
  if (typeof value !== 'string')
    throw new AppError('INVALID_INPUT', `${label}を入力してください。`, 400, {
      [name]: `${label}を入力してください。`,
    });
  const trimmed = value.trim();
  const length = graphemeCount(trimmed);
  if (length < min || length > max)
    throw new AppError(
      'INVALID_INPUT',
      `${label}は${min}〜${max}文字で入力してください。`,
      400,
      { [name]: `${min}〜${max}文字で入力してください。` },
    );
  return trimmed;
}
export function registration(value: unknown): Registration {
  const input = object(value, [
    'requesterName',
    'subject',
    'description',
    'categoryCode',
  ]);
  const category = input.categoryCode ?? null;
  if (
    category !== null &&
    (typeof category !== 'string' || !Object.hasOwn(categories, category))
  )
    throw new AppError('INVALID_INPUT', '分類を選び直してください。', 400, {
      categoryCode: '定義された分類を選んでください。',
    });
  return {
    requesterName: text(
      input.requesterName,
      'requesterName',
      '申請者名',
      1,
      50,
    ),
    subject: text(input.subject, 'subject', '件名', 1, 100),
    description: text(
      input.description,
      'description',
      '問い合わせ内容',
      1,
      2000,
    ),
    categoryCode: category as Registration['categoryCode'],
  };
}
export function responseInput(value: unknown): ResponseInput {
  const input = object(value, ['assigneeCode', 'status', 'answer']);
  const assignee = input.assigneeCode ?? null;
  if (
    assignee !== null &&
    (typeof assignee !== 'string' || !Object.hasOwn(assignees, assignee))
  )
    throw new AppError('INVALID_INPUT', '担当者を選び直してください。', 400, {
      assigneeCode: '定義された担当者を選んでください。',
    });
  if (
    typeof input.status !== 'string' ||
    !Object.hasOwn(statuses, input.status)
  )
    throw new AppError('INVALID_INPUT', '状況を選び直してください。', 400, {
      status: '定義された状況を選んでください。',
    });
  return {
    assigneeCode: assignee as ResponseInput['assigneeCode'],
    status: input.status as ResponseInput['status'],
    answer: text(input.answer, 'answer', '回答', 0, 2000),
  };
}
export function version(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new AppError(
      'INVALID_INPUT',
      '更新版が正しくありません。再読込してください。',
    );
  return value;
}
export function ticket(value: unknown): string {
  if (typeof value !== 'string' || !/^DF-\d{6,15}$/.test(value))
    throw new AppError('INVALID_INPUT', '受付番号が正しくありません。');
  return value;
}
export function submissionKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value))
    throw new AppError(
      'INVALID_INPUT',
      '登録操作の識別情報が正しくありません。',
    );
  return value;
}
export function searchText(value: unknown): string {
  return text(value, 'query', '検索語', 0, 100);
}
export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}
