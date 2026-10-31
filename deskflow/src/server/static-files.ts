import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { AppError } from '../shared/types.js';
export function staticFile(
  publicRoot: string,
  rawPath: string,
): { body: Buffer; type: string } {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    throw new AppError('INVALID_PATH', 'URLが正しくありません。');
  }
  if (
    decoded.includes('\\') ||
    decoded.includes('\0') ||
    decoded.split('/').some((part) => part === '..' || part.startsWith('.'))
  )
    throw new AppError('INVALID_PATH', 'このファイルは公開していません。', 404);
  const root = realpathSync(publicRoot);
  const candidate = resolve(
    root,
    '.' + (decoded === '/' ? '/index.html' : decoded),
  );
  if (!candidate.startsWith(root + sep))
    throw new AppError('NOT_FOUND', 'ファイルが見つかりません。', 404);
  let file: string;
  try {
    file = realpathSync(candidate);
    if (!statSync(file).isFile()) throw new Error('not file');
  } catch {
    throw new AppError('NOT_FOUND', 'ファイルが見つかりません。', 404);
  }
  if (!file.startsWith(root + sep))
    throw new AppError('NOT_FOUND', 'このファイルは公開していません。', 404);
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  const type = types[extname(file)];
  if (!type)
    throw new AppError('NOT_FOUND', 'このファイルは公開していません。', 404);
  return { body: readFileSync(file), type };
}
