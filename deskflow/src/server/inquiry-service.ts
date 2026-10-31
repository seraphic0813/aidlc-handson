import {
  AppError,
  assignees,
  statuses,
  type Inquiry,
  type SearchResult,
  type SaveResult,
} from '../shared/types.js';
import {
  registration,
  responseInput,
  version,
  ticket,
  submissionKey,
  searchText,
  normalizeSearch,
} from '../shared/input-policy.js';
import { InquiryRepository } from './repository.js';
export class InquiryService {
  constructor(public readonly repository: InquiryRepository) {}
  get(id: unknown): Inquiry {
    return this.repository.get(ticket(id));
  }
  register(input: unknown, key: unknown): SaveResult {
    return this.repository.register(registration(input), submissionKey(key));
  }
  save(id: unknown, expected: unknown, input: unknown): SaveResult {
    return this.repository.change(ticket(id), version(expected), (current) => {
      if (current.status === 'completed')
        throw new AppError(
          'READ_ONLY',
          '完了中は編集できません。対応中へ再開してください。',
          409,
        );
      const next = responseInput(input);
      if (
        next.status !== current.status &&
        !(
          (current.status === 'open' && next.status === 'in_progress') ||
          (current.status === 'in_progress' && next.status === 'completed')
        )
      )
        throw new AppError(
          'INVALID_TRANSITION',
          'この状況への変更はできません。',
          400,
          { status: '許可された次の状況を選んでください。' },
        );
      if (next.status === 'completed' && !next.answer)
        throw new AppError('ANSWER_REQUIRED', '完了には回答が必要です。', 400, {
          answer: '完了には回答を入力してください。',
        });
      return { ...current, ...next };
    });
  }
  reopen(id: unknown, expected: unknown): SaveResult {
    return this.repository.change(ticket(id), version(expected), (current) => {
      if (current.status !== 'completed')
        throw new AppError(
          'INVALID_TRANSITION',
          '完了した問い合わせだけを再開できます。',
          409,
        );
      return { ...current, status: 'in_progress' };
    });
  }
  search(
    queryValue: unknown = '',
    statusValue: unknown = 'all',
    pageValue: unknown = 1,
  ): SearchResult {
    const query = searchText(queryValue);
    if (
      typeof statusValue !== 'string' ||
      (statusValue !== 'all' && !Object.hasOwn(statuses, statusValue))
    )
      throw new AppError('INVALID_INPUT', '検索する状況を選び直してください。');
    if (
      typeof pageValue !== 'number' ||
      !Number.isSafeInteger(pageValue) ||
      pageValue < 1
    )
      throw new AppError('INVALID_INPUT', 'ページ番号が正しくありません。');
    const rows = this.repository.all();
    const normalized = normalizeSearch(query);
    const matched = rows.filter(
      (row) =>
        (statusValue === 'all' || row.status === statusValue) &&
        (!normalized ||
          [
            row.subject,
            row.description,
            row.answer,
            row.requesterName,
            row.assigneeCode ? assignees[row.assigneeCode] : '未割当',
          ].some((value) => normalizeSearch(value).includes(normalized))),
    );
    matched.sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) ||
        Number(b.ticketNumber.slice(3)) - Number(a.ticketNumber.slice(3)),
    );
    const pages = Math.max(1, Math.ceil(matched.length / 20));
    const page = Math.min(pageValue, pages);
    return {
      items: matched.slice((page - 1) * 20, page * 20),
      total: matched.length,
      allTotal: rows.length,
      page,
      pages,
      conditions: {
        query,
        status: statusValue as SearchResult['conditions']['status'],
        page,
      },
    };
  }
}
