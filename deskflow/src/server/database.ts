import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initialInquiries } from './seed.js';
import type { Inquiry } from '../shared/types.js';

export const insertInquirySql = `INSERT INTO inquiries (ticketNumber,requesterName,subject,description,categoryCode,assigneeCode,status,answer,createdAt,updatedAt,version) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
export function insertInquiry(db: DatabaseSync, value: Inquiry): void {
  db.prepare(insertInquirySql).run(
    value.ticketNumber,
    value.requesterName,
    value.subject,
    value.description,
    value.categoryCode,
    value.assigneeCode,
    value.status,
    value.answer,
    value.createdAt,
    value.updatedAt,
    value.version,
  );
}
export function transaction<T>(db: DatabaseSync, action: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = action();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      if (db.isTransaction) db.exec('ROLLBACK');
    } catch {
      db.close();
    }
    throw error;
  }
}
export function inspectDatabase(db: DatabaseSync): number {
  const version = db.prepare('PRAGMA user_version').get()?.user_version;
  if (version !== 1)
    throw new Error('保存形式の版が不明です。保存先を確認してください。');
  if (
    db.prepare('PRAGMA quick_check').get()?.quick_check !== 'ok' ||
    db.prepare('PRAGMA foreign_key_check').all().length
  )
    throw new Error('保存先の整合性検査に失敗しました。');
  if (
    !db
      .prepare(
        'SELECT checkpointKey FROM initialization_checkpoints WHERE checkpointKey=?',
      )
      .get('deskflow_initial_seed')
  )
    throw new Error('初期化完了記録がありません。自動投入は行いません。');
  const invalid = db
    .prepare(
      `SELECT ticketNumber FROM inquiries WHERE status='completed' AND length(trim(answer))=0 LIMIT 1`,
    )
    .get();
  if (invalid) throw new Error('完了データの回答が不正です。');
  return Number(
    db.prepare('SELECT count(*) AS count FROM inquiries').get()?.count,
  );
}
export function openDatabase(
  path: string,
  seeds: Inquiry[] = initialInquiries(),
): DatabaseSync {
  const fresh = path === ':memory:' || !existsSync(path);
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path, {
    // ネイティブ待機の超過分も含め、実経過1秒以内に拒否する余裕を残す。
    timeout: 500,
    enableForeignKeyConstraints: true,
    allowExtension: false,
  });
  try {
    db.exec(
      'PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON',
    );
    if (
      db.prepare('PRAGMA journal_mode').get()?.journal_mode !==
        (path === ':memory:' ? 'memory' : 'delete') ||
      db.prepare('PRAGMA synchronous').get()?.synchronous !== 2 ||
      db.prepare('PRAGMA foreign_keys').get()?.foreign_keys !== 1
    )
      throw new Error('保存設定を確認できません。');
    if (fresh)
      transaction(db, () => {
        db.exec(`CREATE TABLE inquiries (
        ticketNumber TEXT PRIMARY KEY, requesterName TEXT NOT NULL, subject TEXT NOT NULL, description TEXT NOT NULL,
        categoryCode TEXT CHECK(categoryCode IS NULL OR categoryCode IN ('pc','software','connection','other')),
        assigneeCode TEXT CHECK(assigneeCode IS NULL OR assigneeCode IN ('desk_a','desk_b','desk_c')),
        status TEXT NOT NULL CHECK(status IN ('open','in_progress','completed')), answer TEXT NOT NULL,
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL CHECK(version>=1),
        CHECK(status!='completed' OR length(trim(answer))>0));
        CREATE TABLE submission_receipts (submissionKey TEXT PRIMARY KEY, payloadFingerprint TEXT NOT NULL, ticketNumber TEXT NOT NULL UNIQUE REFERENCES inquiries(ticketNumber), acceptedAt TEXT NOT NULL);
        CREATE TABLE initialization_checkpoints (checkpointKey TEXT PRIMARY KEY, seedRevision TEXT NOT NULL, initializedAt TEXT NOT NULL);
        PRAGMA user_version=1;`);
        for (const inquiry of seeds) insertInquiry(db, inquiry);
        db.prepare('INSERT INTO initialization_checkpoints VALUES (?,?,?)').run(
          'deskflow_initial_seed',
          'seed_v1',
          new Date().toISOString(),
        );
      });
    inspectDatabase(db);
    return db;
  } catch (error) {
    if (db.isOpen) db.close();
    throw error;
  }
}
