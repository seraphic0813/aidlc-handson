import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
export interface Configuration {
  root: string;
  local: string;
  data: string;
  logs: string;
  backups: string;
  state: string;
  publicRoot: string;
  port: number;
}
export function appRoot(url = import.meta.url): string {
  return fileURLToPath(
    new URL(url.includes('/dist/server/') ? '../../../' : '../../', url),
  );
}
export function configuration(
  env: NodeJS.ProcessEnv = process.env,
  root = appRoot(),
): Configuration {
  const raw = env.DESKFLOW_PORT ?? '3000';
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 65535)
    throw new Error('DESKFLOW_PORTは1〜65535の整数で指定してください。');
  const local = resolve(root, '.local');
  return {
    root,
    local,
    data: join(local, 'data', 'deskflow.sqlite'),
    logs: join(local, 'logs'),
    backups: join(local, 'backups'),
    state: join(local, 'state'),
    publicRoot: join(root, 'dist', 'client'),
    port: Number(raw),
  };
}
