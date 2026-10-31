import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { InquiryRepository } from '../../src/server/repository.js';
import {
  openDatabase,
  inspectDatabase,
  transaction,
} from '../../src/server/database.js';
import { initialInquiries } from '../../src/server/seed.js';
import { temporaryDirectory, removeTemporaryDirectory } from '../helpers.js';
const directories: string[] = [];
function path() {
  const dir = temporaryDirectory();
  directories.push(dir);
  return join(dir, 'db.sqlite');
}
afterEach(() => {
  for (const dir of directories.splice(0)) removeTemporaryDirectory(dir);
});
describe('保存形式と初期化', () => {
  it('架空10件と3状態、有効な完了回答を投入する', () => {
    const db = openDatabase(path());
    expect(inspectDatabase(db)).toBe(10);
    expect(
      db.prepare('SELECT DISTINCT status FROM inquiries').all(),
    ).toHaveLength(3);
    expect(
      db
        .prepare(
          "SELECT * FROM inquiries WHERE status='completed' AND answer='' ",
        )
        .all(),
    ).toHaveLength(0);
    db.close();
  });
  it('再オープンで初期データを再投入しない', () => {
    const file = path();
    openDatabase(file).close();
    const db = openDatabase(file);
    expect(inspectDatabase(db)).toBe(10);
    db.close();
  });
  it('保存設定を適用する', () => {
    const db = openDatabase(path());
    expect(db.prepare('PRAGMA synchronous').get()?.synchronous).toBe(2);
    expect(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys).toBe(1);
    expect(db.prepare('PRAGMA busy_timeout').get()?.timeout).toBe(500);
    expect(db.prepare('PRAGMA journal_mode').get()?.journal_mode).toBe(
      'delete',
    );
    db.close();
  });
  it('初回投入が失敗すると部分データと完了記録を残さない', () => {
    const file = path();
    const bad = initialInquiries();
    bad[1].ticketNumber = bad[0].ticketNumber;
    expect(() => openDatabase(file, bad)).toThrow();
    const db = new DatabaseSync(file);
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
    ).toHaveLength(0);
    db.close();
  });
  it('不明なschema版を拒否する', () => {
    const file = path();
    const db = openDatabase(file);
    db.exec('PRAGMA user_version=2');
    db.close();
    expect(() => openDatabase(file)).toThrow('版');
  });
  it('初期化記録を失っても再投入で上書きしない', () => {
    const file = path();
    const db = openDatabase(file);
    db.exec('DELETE FROM initialization_checkpoints');
    db.close();
    expect(() => openDatabase(file)).toThrow('初期化');
  });
  it('既存の空ファイルを新規保存先とみなさない', () => {
    const file = path();
    new DatabaseSync(file).close();
    expect(() => openDatabase(file)).toThrow('版');
  });
  it('実2接続の書込ロックを1秒以内に拒否し、解除後の明示操作だけ保存する', () => {
    const file = path();
    const holder = openDatabase(file);
    const writer = openDatabase(file);
    const repository = new InquiryRepository(writer);
    const input = {
      requesterName: '演習社員',
      subject: 'ロック回帰',
      description: '専用検証データ',
      categoryCode: null,
    };
    try {
      holder.exec('BEGIN IMMEDIATE');
      const started = performance.now();
      expect(() => repository.register(input, 'locked-registration')).toThrow(
        /locked|busy/i,
      );
      const elapsed = performance.now() - started;
      console.info(
        `SQLite書込ロック拒否: ${elapsed.toFixed(1)}ms / 上限1000ms`,
      );
      expect(elapsed).toBeLessThanOrEqual(1000);
      expect(writer.isTransaction).toBe(false);
      expect(inspectDatabase(writer)).toBe(10);
      expect(
        writer
          .prepare('SELECT count(*) AS count FROM submission_receipts')
          .get()?.count,
      ).toBe(0);
      holder.exec('ROLLBACK');
      const saved = repository.register(input, 'locked-registration');
      expect(saved.inquiry.ticketNumber).toBe('DF-000011');
      expect(inspectDatabase(writer)).toBe(11);
      expect(
        writer
          .prepare(
            'SELECT ticketNumber FROM submission_receipts WHERE submissionKey=?',
          )
          .get('locked-registration')?.ticketNumber,
      ).toBe(saved.inquiry.ticketNumber);
    } finally {
      if (holder.isTransaction) holder.exec('ROLLBACK');
      writer.close();
      holder.close();
    }
  });
  it('途中例外でトランザクション全体を取り消す', () => {
    const db = openDatabase(path());
    expect(() =>
      transaction(db, () => {
        db.exec(
          "UPDATE inquiries SET answer='試験' WHERE ticketNumber='DF-000001'",
        );
        throw new Error('中断');
      }),
    ).toThrow('中断');
    expect(
      db
        .prepare("SELECT answer FROM inquiries WHERE ticketNumber='DF-000001'")
        .get()?.answer,
    ).toBe('');
    db.close();
  });
});
