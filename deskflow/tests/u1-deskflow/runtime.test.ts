import { afterEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { configuration, appRoot } from '../../src/server/config.js';
import { acquireLock, startRuntime } from '../../src/server/lifecycle.js';
import { LocalLogger } from '../../src/server/logger.js';
import {
  backup,
  inspectBackup,
  restore,
} from '../../src/server/maintenance.js';
import { maintenanceCommand } from '../../src/server/maintenance-cli.js';
import { InquiryRepository } from '../../src/server/repository.js';
import { temporaryDirectory, removeTemporaryDirectory } from '../helpers.js';
const roots: string[] = [];
function setup() {
  const root = temporaryDirectory();
  roots.push(root);
  return configuration({}, root);
}
function runtime(config: ReturnType<typeof setup>) {
  return startRuntime(config, new LocalLogger(config.logs, () => {}));
}
afterEach(() => {
  for (const root of roots.splice(0)) removeTemporaryDirectory(root);
});
describe('起動・保守・ログ', () => {
  it('ポートとエントリー基準のルートを解決する', () => {
    const c = setup();
    expect(c.port).toBe(3000);
    expect(configuration({ DESKFLOW_PORT: '4001' }, c.root).port).toBe(4001);
    for (const value of ['0', 'abc', '65536'])
      expect(() => configuration({ DESKFLOW_PORT: value }, c.root)).toThrow(
        'DESKFLOW_PORT',
      );
    expect(appRoot()).toContain('deskflow');
  });
  it('排他記録を所有者だけが解放する', () => {
    const c = setup();
    const release = acquireLock(c, 'test');
    expect(() => acquireLock(c, 'second')).toThrow('排他');
    release();
    expect(existsSync(join(c.state, 'operation.lock'))).toBe(false);
  });
  it('所有者が変わった記録は消さない', () => {
    const c = setup();
    const release = acquireLock(c, 'test');
    writeFileSync(join(c.state, 'operation.lock'), '{}');
    expect(release).toThrow('所有者');
  });
  it('正常停止を記録し再起動で同じデータを保つ', () => {
    const c = setup();
    const r = runtime(c);
    expect(() => backup(c)).toThrow('排他');
    r.stop();
    r.stop();
    expect(existsSync(join(c.state, 'stopped.json'))).toBe(true);
    const next = runtime(c);
    expect(next.db.prepare('SELECT count(*) n FROM inquiries').get()?.n).toBe(
      10,
    );
    next.stop();
  });
  it('起動失敗時は排他を残さず案内する', () => {
    const c = setup();
    const r = runtime(c);
    r.db.exec('PRAGMA user_version=2');
    r.stop();
    expect(() => runtime(c)).toThrow('版');
    expect(existsSync(join(c.state, 'operation.lock'))).toBe(false);
  });
  it('正常停止後に新規コピーを検査し既存コピーを上書きしない', () => {
    const c = setup();
    runtime(c).stop();
    const first = backup(c);
    const second = backup(c);
    expect(first.path).not.toBe(second.path);
    expect(first.count).toBe(10);
    expect(inspectBackup(c, first.path.split(/[\\/]/).at(-1)!).count).toBe(10);
    expect(existsSync(first.path + '.json')).toBe(true);
  });
  it('停止確認なしや残存ジャーナルではコピーしない', () => {
    const c = setup();
    runtime(c).stop();
    writeFileSync(c.data + '-journal', 'pending');
    expect(() => backup(c)).toThrow('正常停止');
    unlinkSync(c.data + '-journal');
    unlinkSync(join(c.state, 'stopped.json'));
    expect(() => backup(c)).toThrow();
  });
  it('検査不良のコピー・フォルダー外を拒否する', () => {
    const c = setup();
    runtime(c).stop();
    backup(c);
    writeFileSync(join(c.backups, 'bad.sqlite'), 'broken');
    expect(() => inspectBackup(c, 'bad.sqlite')).toThrow();
    expect(() => inspectBackup(c, '../outside.sqlite')).toThrow('ファイル名');
  });
  it('復旧には明示確認を要求し原本を保全する', () => {
    const c = setup();
    runtime(c).stop();
    const copy = backup(c);
    const name = copy.path.split(/[\\/]/).at(-1)!;
    const r = runtime(c);
    new InquiryRepository(r.db).register(
      {
        requesterName: '社員',
        subject: '追加',
        description: '本文',
        categoryCode: null,
      },
      'new',
    );
    r.stop();
    expect(() => restore(c, name, false)).toThrow('本人判断');
    const result = restore(c, name, true);
    expect(existsSync(result.preserved)).toBe(true);
    const current = runtime(c);
    expect(
      current.db.prepare('SELECT count(*) n FROM inquiries').get()?.n,
    ).toBe(10);
    current.stop();
  });
  it('ログは指定された安全な情報だけを記録する', () => {
    const c = setup();
    const lines: string[] = [];
    const log = new LocalLogger(c.logs, (line) => lines.push(line));
    log.log({
      operation: 'save',
      result: 'failed',
      code: 'WRITE_FAILED',
      ...{ description: '秘密目印', answer: '回答目印' },
    });
    expect(lines.join()).not.toContain('目印');
    expect(readFileSync(join(c.logs, 'deskflow.log'), 'utf8')).not.toContain(
      '目印',
    );
  });
  it('容量で最大4世代へ切り替え大きすぎる管理情報を縮約する', () => {
    const c = setup();
    const log = new LocalLogger(c.logs, () => {}, 200);
    for (let i = 0; i < 20; i++)
      log.log({ operation: 'save', result: 'success' });
    expect(readdirSync(c.logs)).toHaveLength(4);
    log.log({ operation: 'x'.repeat(5000), result: 'success' });
    expect(readFileSync(join(c.logs, 'deskflow.log'), 'utf8')).toContain(
      'metadata_too_large',
    );
  });
  it('ファイルログ失敗はターミナルに一度案内し業務結果を壊さない', () => {
    const c = setup();
    runtime(c).stop();
    writeFileSync(join(c.local, 'not-directory'), 'x');
    const lines: string[] = [];
    const log = new LocalLogger(join(c.local, 'not-directory', 'log'), (line) =>
      lines.push(line),
    );
    expect(() => {
      log.log({ operation: 'save', result: 'success' });
      log.log({ operation: 'save', result: 'success' });
    }).not.toThrow();
    expect(lines.filter((x) => x.includes('file_unavailable'))).toHaveLength(1);
  });
  it('ターミナル自体が失敗しても再帰的に記録しない', () => {
    const c = setup();
    expect(() =>
      new LocalLogger(c.logs, () => {
        throw new Error('出力不能');
      }).log({ operation: 'save', result: 'success' }),
    ).not.toThrow();
  });
  it('保守CLIは不正操作を終了コードで伝える', () => {
    const out: string[] = [];
    expect(maintenanceCommand(['unknown'], (value) => out.push(value))).toBe(1);
    expect(out[0]).toContain('指定');
  });
});
