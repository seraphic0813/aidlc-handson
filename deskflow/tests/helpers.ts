import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  unlinkSync,
  rmdirSync,
  lstatSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
export function temporaryDirectory(): string {
  const base = resolve('.local/verification');
  mkdirSync(base, { recursive: true });
  return mkdtempSync(join(base, 'test-'));
}
export function removeTemporaryDirectory(path: string): void {
  const root = resolve('.local/verification');
  const target = resolve(path);
  if (!target.startsWith(root + '\\') && !target.startsWith(root + '/'))
    throw new Error('テスト領域外は削除しません。');
  for (const name of readdirSync(target)) {
    const entry = join(target, name);
    if (lstatSync(entry).isDirectory()) removeTemporaryDirectory(entry);
    else unlinkSync(entry);
  }
  rmdirSync(target);
}
