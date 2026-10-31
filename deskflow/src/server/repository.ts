import type { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  AppError,
  type Inquiry,
  type Registration,
  type SaveResult,
} from '../shared/types.js';
import { insertInquiry, transaction } from './database.js';
export class InquiryRepository {
  constructor(
    public readonly db: DatabaseSync,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}
  get(ticket: string): Inquiry {
    const row = this.db
      .prepare('SELECT * FROM inquiries WHERE ticketNumber=?')
      .get(ticket);
    if (!row)
      throw new AppError('NOT_FOUND', '問い合わせが見つかりません。', 404);
    return { ...row } as unknown as Inquiry;
  }
  all(): Inquiry[] {
    return this.db
      .prepare('SELECT * FROM inquiries')
      .all()
      .map((row) => ({ ...row }) as unknown as Inquiry);
  }
  register(input: Registration, submissionKey: string): SaveResult {
    return transaction(this.db, () => {
      const fingerprint = createHash('sha256')
        .update(
          JSON.stringify([
            input.requesterName,
            input.subject,
            input.description,
            input.categoryCode,
          ]),
        )
        .digest('hex');
      const receipt = this.db
        .prepare('SELECT * FROM submission_receipts WHERE submissionKey=?')
        .get(submissionKey);
      if (receipt) {
        if (receipt.payloadFingerprint !== fingerprint)
          throw new AppError(
            'KEY_CONFLICT',
            '同じ登録操作で異なる内容が送られました。受付結果を確認してください。',
            409,
          );
        return {
          inquiry: this.get(String(receipt.ticketNumber)),
          replayed: true,
        };
      }
      const sequence = Number(
        this.db
          .prepare(
            'SELECT COALESCE(MAX(CAST(substr(ticketNumber,4) AS INTEGER)),0)+1 AS next FROM inquiries',
          )
          .get()?.next,
      );
      const date = this.now();
      const inquiry: Inquiry = {
        ...input,
        ticketNumber: `DF-${String(sequence).padStart(6, '0')}`,
        assigneeCode: null,
        status: 'open',
        answer: '',
        createdAt: date,
        updatedAt: date,
        version: 1,
      };
      insertInquiry(this.db, inquiry);
      this.db
        .prepare('INSERT INTO submission_receipts VALUES (?,?,?,?)')
        .run(submissionKey, fingerprint, inquiry.ticketNumber, date);
      return { inquiry };
    });
  }
  change(
    ticket: string,
    expectedVersion: number,
    modify: (current: Inquiry) => Inquiry,
  ): SaveResult {
    return transaction(this.db, () => {
      const current = this.get(ticket);
      if (current.version !== expectedVersion)
        throw new AppError(
          'VERSION_CONFLICT',
          '他のタブで更新されています。入力を保って最新内容を確認してください。',
          409,
        );
      const next = modify(current);
      if (
        next.assigneeCode === current.assigneeCode &&
        next.status === current.status &&
        next.answer === current.answer
      )
        return { inquiry: current, unchanged: true };
      const date = this.now();
      const update = this.db
        .prepare(
          'UPDATE inquiries SET assigneeCode=?,status=?,answer=?,updatedAt=?,version=version+1 WHERE ticketNumber=? AND version=?',
        )
        .run(
          next.assigneeCode,
          next.status,
          next.answer,
          date,
          ticket,
          expectedVersion,
        );
      if (update.changes !== 1)
        throw new AppError(
          'VERSION_CONFLICT',
          '更新が競合しました。最新内容を確認してください。',
          409,
        );
      return { inquiry: this.get(ticket) };
    });
  }
}
