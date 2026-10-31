import { afterEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { openDatabase } from '../../src/server/database.js';
import { InquiryRepository } from '../../src/server/repository.js';
import { temporaryDirectory, removeTemporaryDirectory } from '../helpers.js';
const roots: string[] = [];
function setup() {
  const root = temporaryDirectory();
  roots.push(root);
  const file = join(root, 'db.sqlite');
  const db = openDatabase(file);
  const repo = new InquiryRepository(db, () => '2026-10-25T01:00:00Z');
  return { db, repo, file };
}
const input = {
  requesterName: '架空社員',
  subject: '問い合わせ',
  description: '本文',
  categoryCode: null,
};
afterEach(() => {
  for (const root of roots.splice(0)) removeTemporaryDirectory(root);
});
describe('保存境界', () => {
  it('同じ操作の再送は同じ受付を返す', () => {
    const { db, repo } = setup();
    const a = repo.register(input, 'key1');
    const b = repo.register(input, 'key1');
    expect(b.inquiry.ticketNumber).toBe(a.inquiry.ticketNumber);
    expect(b.replayed).toBe(true);
    expect(repo.all()).toHaveLength(11);
    db.close();
  });
  it('同じキーの異内容は拒否する', () => {
    const { db, repo } = setup();
    repo.register(input, 'key1');
    expect(() => repo.register({ ...input, subject: '別件' }, 'key1')).toThrow(
      '異なる内容',
    );
    expect(repo.all()).toHaveLength(11);
    db.close();
  });
  it('別の操作なら同内容も別件になる', () => {
    const { db, repo } = setup();
    expect(repo.register(input, 'key1').inquiry.ticketNumber).toBe('DF-000011');
    expect(repo.register(input, 'key2').inquiry.ticketNumber).toBe('DF-000012');
    db.close();
  });
  it('同じ版の後続更新は競合になる', () => {
    const { db, repo } = setup();
    repo.change('DF-000001', 1, (c) => ({ ...c, answer: '変更' }));
    expect(() => repo.change('DF-000001', 1, (c) => c)).toThrow('他のタブ');
    expect(repo.get('DF-000001').answer).toBe('変更');
    db.close();
  });
  it('変更なしでは時刻と版を変えない', () => {
    const { db, repo } = setup();
    const before = repo.get('DF-000001');
    expect(repo.change(before.ticketNumber, 1, (c) => c).unchanged).toBe(true);
    expect(repo.get(before.ticketNumber)).toEqual(before);
    db.close();
  });
  it('更新例外では既存値を保つ', () => {
    const { db, repo } = setup();
    const before = repo.get('DF-000001');
    expect(() =>
      repo.change(before.ticketNumber, 1, () => {
        throw new Error('中断');
      }),
    ).toThrow('中断');
    expect(repo.get(before.ticketNumber)).toEqual(before);
    db.close();
  });
  it('受付保存失敗時は問い合わせも取り消す', () => {
    const { db, repo } = setup();
    db.exec(
      "CREATE TRIGGER fail_receipt BEFORE INSERT ON submission_receipts BEGIN SELECT RAISE(ABORT,'失敗'); END",
    );
    expect(() => repo.register(input, 'key1')).toThrow();
    expect(repo.all()).toHaveLength(10);
    db.close();
  });
  it('再起動で登録と更新を保持する', () => {
    const { db, repo, file } = setup();
    const added = repo.register(input, 'key1').inquiry;
    repo.change(added.ticketNumber, 1, (c) => ({ ...c, answer: '保存済み' }));
    db.close();
    const reopened = openDatabase(file);
    const again = new InquiryRepository(reopened);
    expect(again.all()).toHaveLength(11);
    expect(again.get(added.ticketNumber).answer).toBe('保存済み');
    expect(again.register(input, 'key1').replayed).toBe(true);
    reopened.close();
  });
  it('存在しない受付を区別する', () => {
    const { db, repo } = setup();
    expect(() => repo.get('DF-999999')).toThrow('見つかりません');
    db.close();
  });
});
