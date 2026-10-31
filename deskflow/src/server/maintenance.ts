import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Configuration } from './config.js';
import { inspectDatabase } from './database.js';
import { acquireLock } from './lifecycle.js';
function inspectFile(file: string): number {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return inspectDatabase(db);
  } finally {
    db.close();
  }
}
function assertStopped(config: Configuration) {
  const marker = JSON.parse(
    readFileSync(join(config.state, 'stopped.json'), 'utf8'),
  ) as { data: string };
  if (marker.data !== config.data || existsSync(config.data + '-journal'))
    throw new Error(
      '正常停止と接続終了を確認できません。起動して正常停止してから再試行してください。',
    );
}
export function backup(config: Configuration): { path: string; count: number } {
  const release = acquireLock(config, 'backup');
  try {
    assertStopped(config);
    mkdirSync(config.backups, { recursive: true });
    const file = join(
      config.backups,
      `deskflow-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.sqlite`,
    );
    copyFileSync(config.data, file, constants.COPYFILE_EXCL);
    const count = inspectFile(file);
    writeFileSync(
      file + '.json',
      JSON.stringify({
        createdAt: new Date().toISOString(),
        count,
        validated: true,
      }),
      { flag: 'wx' },
    );
    return { path: file, count };
  } finally {
    release();
  }
}
function backupPath(config: Configuration, name: string): string {
  if (name !== basename(name) || !name.endsWith('.sqlite'))
    throw new Error('バックアップフォルダー内のファイル名を指定してください。');
  const file = resolve(config.backups, name);
  if (!file.startsWith(resolve(config.backups) + sep))
    throw new Error('保存先の外にはアクセスしません。');
  return file;
}
export function inspectBackup(
  config: Configuration,
  name: string,
): { path: string; count: number } {
  const path = backupPath(config, name);
  return { path, count: inspectFile(path) };
}
export function restore(
  config: Configuration,
  name: string,
  confirmed: boolean,
): { preserved: string; count: number } {
  if (!confirmed)
    throw new Error(
      '復旧対象と巻戻り範囲を確認し、本人判断後に--confirmを指定してください。',
    );
  const release = acquireLock(config, 'restore');
  let staged: string | undefined;
  try {
    assertStopped(config);
    const candidate = inspectBackup(config, name);
    staged = join(config.state, `restore-${randomUUID()}.sqlite`);
    copyFileSync(candidate.path, staged, constants.COPYFILE_EXCL);
    inspectFile(staged);
    const preserved = join(config.backups, `preserved-${randomUUID()}.sqlite`);
    copyFileSync(config.data, preserved, constants.COPYFILE_EXCL);
    // 原本を保全してから同一ボリュームで検査済みコピーへ切り替える。
    renameSync(staged, config.data);
    staged = undefined;
    writeFileSync(
      join(config.state, 'stopped.json'),
      JSON.stringify({
        stoppedAt: new Date().toISOString(),
        data: config.data,
      }),
    );
    return { preserved, count: candidate.count };
  } finally {
    if (staged && existsSync(staged)) unlinkSync(staged);
    release();
  }
}
