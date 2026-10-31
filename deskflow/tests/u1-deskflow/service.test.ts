import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/server/database.js';
import { InquiryRepository } from '../../src/server/repository.js';
import { InquiryService } from '../../src/server/inquiry-service.js';
import type { DatabaseSync } from 'node:sqlite';
const connections: DatabaseSync[] = [];
function setup() {
  const db = openDatabase(':memory:');
  connections.push(db);
  return new InquiryService(
    new InquiryRepository(db, () => '2026-10-25T01:00:00Z'),
  );
}
afterEach(() => {
  for (const db of connections.splice(0)) db.close();
});
describe('問い合わせ業務', () => {
  it('登録は未対応・未割当・回答空になる', () => {
    const s = setup();
    expect(
      s.register(
        { requesterName: '社員', subject: '題', description: '文' },
        'new',
      ).inquiry,
    ).toMatchObject({
      status: 'open',
      assigneeCode: null,
      answer: '',
      version: 1,
    });
  });
  it('担当・状態と回答を保存する', () => {
    const s = setup();
    expect(
      s.save('DF-000001', 1, {
        assigneeCode: 'desk_a',
        status: 'in_progress',
        answer: '下書き',
      }).inquiry,
    ).toMatchObject({
      assigneeCode: 'desk_a',
      status: 'in_progress',
      answer: '下書き',
      version: 2,
    });
  });
  it('飛ばした完了・逆戻りを拒否する', () => {
    const s = setup();
    expect(() =>
      s.save('DF-000001', 1, {
        assigneeCode: null,
        status: 'completed',
        answer: '回答',
      }),
    ).toThrow('状況');
    expect(() =>
      s.save('DF-000005', 1, {
        assigneeCode: null,
        status: 'open',
        answer: '',
      }),
    ).toThrow('状況');
  });
  it('空回答での完了を拒否する', () => {
    const s = setup();
    expect(() =>
      s.save('DF-000005', 1, {
        assigneeCode: null,
        status: 'completed',
        answer: '　',
      }),
    ).toThrow('回答');
  });
  it('未割当でも有効回答で完了する', () => {
    const s = setup();
    expect(
      s.save('DF-000005', 1, {
        assigneeCode: null,
        status: 'completed',
        answer: '解決',
      }).inquiry.status,
    ).toBe('completed');
  });
  it('完了中の直接編集を拒否する', () => {
    const s = setup();
    expect(() =>
      s.save('DF-000008', 1, {
        assigneeCode: null,
        status: 'completed',
        answer: '変更',
      }),
    ).toThrow('編集');
  });
  it('再開は既存担当と回答を保つ', () => {
    const s = setup();
    const before = s.get('DF-000008');
    const after = s.reopen(before.ticketNumber, 1).inquiry;
    expect(after).toMatchObject({
      status: 'in_progress',
      answer: before.answer,
      assigneeCode: before.assigneeCode,
    });
  });
  it('未完了は再開できない', () => {
    const s = setup();
    expect(() => s.reopen('DF-000001', 1)).toThrow('完了');
  });
  it('同じ編集値では版と更新時刻を変えない', () => {
    const s = setup();
    const before = s.get('DF-000001');
    expect(
      s.save(before.ticketNumber, 1, {
        assigneeCode: before.assigneeCode,
        status: before.status,
        answer: before.answer,
      }).unchanged,
    ).toBe(true);
    expect(s.get(before.ticketNumber)).toEqual(before);
  });
  it('古い版は変更なしより先に競合とする', () => {
    const s = setup();
    s.save('DF-000001', 1, {
      assigneeCode: null,
      status: 'open',
      answer: '新',
    });
    expect(() =>
      s.save('DF-000001', 1, {
        assigneeCode: null,
        status: 'open',
        answer: '新',
      }),
    ).toThrow('他のタブ');
  });
  it('検索5項目と大小全半角を比較し状態も併用する', () => {
    const s = setup();
    s.register(
      {
        requesterName: 'OnlyRequester',
        subject: 'ＡＢＣ',
        description: 'OnlyDescription',
      },
      'search',
    );
    const added = s.search('abc').items[0];
    s.save(added.ticketNumber, 1, {
      status: 'in_progress',
      assigneeCode: 'desk_b',
      answer: 'OnlyAnswer',
    });
    for (const term of [
      'onlyrequester',
      'abc',
      'onlydescription',
      'onlyanswer',
      '窓口担当B',
    ])
      expect(
        s
          .search(term, 'in_progress')
          .items.some((x) => x.ticketNumber === added.ticketNumber),
      ).toBe(true);
    expect(s.search('abc', 'completed').total).toBe(0);
  });
  it('21件を20件と1件に分け、同時刻の順序を固定する', () => {
    const s = setup();
    for (let i = 0; i < 11; i++)
      s.register(
        { requesterName: '社員', subject: '同時', description: '本文' },
        `page${i}`,
      );
    expect(s.search().items).toHaveLength(20);
    expect(s.search('', 'all', 2).items).toHaveLength(1);
    expect(s.search().items[0].ticketNumber).toBe('DF-000021');
    expect(s.search('', 'all', 9).page).toBe(2);
  });
  it('0件と条件不正を区別する', () => {
    const s = setup();
    expect(s.search('存在しない語').total).toBe(0);
    expect(() => s.search('', 'bad')).toThrow();
    expect(() => s.search('', 'all', 0)).toThrow();
  });
});
