import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { openDatabase } from '../../src/server/database.js';
import { InquiryRepository } from '../../src/server/repository.js';
import { InquiryService } from '../../src/server/inquiry-service.js';
import { temporaryDirectory, removeTemporaryDirectory } from '../helpers.js';
describe('管理側の一貫経路', () => {
  it('登録→対応→完了→検索→再開を再起動後も保持する', () => {
    const root = temporaryDirectory();
    const file = join(root, 'workflow.sqlite');
    let db = openDatabase(file);
    try {
      let service = new InquiryService(new InquiryRepository(db));
      const registered = service.register(
        {
          requesterName: '演習社員',
          subject: '接続の確認',
          description: '社内の接続を確認したい',
          categoryCode: 'connection',
        },
        'workflow-key',
      );
      expect(registered.inquiry.ticketNumber).toBe('DF-000011');
      const working = service.save(registered.inquiry.ticketNumber, 1, {
        status: 'in_progress',
        assigneeCode: 'desk_b',
        answer: '確認中',
      });
      const completed = service.save(working.inquiry.ticketNumber, 2, {
        status: 'completed',
        assigneeCode: 'desk_b',
        answer: '接続設定を修正しました',
      });
      expect(service.search('接続設定', 'completed').items).toEqual([
        completed.inquiry,
      ]);
      const reopened = service.reopen(completed.inquiry.ticketNumber, 3);
      db.close();
      db = openDatabase(file);
      service = new InquiryService(new InquiryRepository(db));
      expect(service.get(reopened.inquiry.ticketNumber)).toEqual(
        reopened.inquiry,
      );
      expect(service.search().allTotal).toBe(11);
      expect(
        service.register(
          {
            requesterName: '演習社員',
            subject: '接続の確認',
            description: '社内の接続を確認したい',
            categoryCode: 'connection',
          },
          'workflow-key',
        ).replayed,
      ).toBe(true);
    } finally {
      db.close();
      removeTemporaryDirectory(root);
    }
  });
  it('独立した100件を準備でき、20件ページと安定した検索が成立する', () => {
    const db = openDatabase(':memory:', []);
    try {
      const service = new InquiryService(
        new InquiryRepository(db, () => '2026-10-25T00:00:00Z'),
      );
      for (let i = 1; i <= 100; i++)
        service.register(
          {
            requesterName: `演習${i}`,
            subject: `性能確認${i}`,
            description: '独立した検証用データ',
            categoryCode: null,
          },
          `performance-${i}`,
        );
      expect(service.search('性能確認').total).toBe(100);
      expect(service.search('', 'all', 5).items).toHaveLength(20);
      expect(service.search().items[0].ticketNumber).toBe('DF-000100');
    } finally {
      db.close();
    }
  });
});
