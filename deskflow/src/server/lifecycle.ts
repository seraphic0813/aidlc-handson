import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase } from './database.js';
import type { Configuration } from './config.js';
import { LocalLogger } from './logger.js';
export function acquireLock(
  config: Configuration,
  operation: string,
): () => void {
  mkdirSync(config.state, { recursive: true });
  const file = join(config.state, 'operation.lock');
  const id = randomUUID();
  let handle: number;
  try {
    handle = openSync(file, 'wx');
  } catch {
    throw new Error(
      '起動または保守の排他記録があります。対象プロセスを確認してください。',
    );
  }
  try {
    writeFileSync(
      handle,
      JSON.stringify({
        id,
        operation,
        pid: process.pid,
        startedAt: new Date().toISOString(),
      }),
    );
  } finally {
    closeSync(handle);
  }
  return () => {
    const record = JSON.parse(readFileSync(file, 'utf8')) as { id: string };
    if (record.id !== id)
      throw new Error('排他記録の所有者が変わっています。確認してください。');
    unlinkSync(file);
  };
}
export function startRuntime(
  config: Configuration,
  logger = new LocalLogger(config.logs),
) {
  const release = acquireLock(config, 'application');
  const stopped = join(config.state, 'stopped.json');
  try {
    if (existsSync(stopped)) unlinkSync(stopped);
    const db = openDatabase(config.data);
    let closed = false;
    logger.log({ operation: 'startup', result: 'success' });
    return {
      db,
      logger,
      stop() {
        if (closed) return;
        db.close();
        closed = true;
        writeFileSync(
          stopped,
          JSON.stringify({
            stoppedAt: new Date().toISOString(),
            data: config.data,
          }),
        );
        logger.log({ operation: 'shutdown', result: 'success' });
        release();
      },
    };
  } catch (error) {
    release();
    logger.log({
      operation: 'startup',
      result: 'failed',
      code: 'STARTUP_FAILED',
    });
    throw error;
  }
}
