import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
type LogData = {
  operation: string;
  result: string;
  correlationId?: string;
  ticketNumber?: string;
  code?: string;
  durationMs?: number;
};
export class LocalLogger {
  private warned = false;
  constructor(
    private readonly directory: string,
    private readonly output: (line: string) => void = (line) =>
      process.stdout.write(line + '\n'),
    private readonly maxBytes = 1024 * 1024,
  ) {}
  log(data: LogData): void {
    // 明示した管理情報だけを出力し、Errorや要求本文を丸ごと記録しない。
    const safe = {
      time: new Date().toISOString(),
      operation: data.operation,
      result: data.result,
      correlationId: data.correlationId,
      ticketNumber: data.ticketNumber,
      code: data.code,
      durationMs: data.durationMs,
    };
    let line = JSON.stringify(safe);
    if (Buffer.byteLength(line) > 4096)
      line = JSON.stringify({
        time: safe.time,
        operation: 'log',
        result: 'metadata_too_large',
      });
    try {
      this.output(line);
    } catch {
      /* ターミナル障害を再帰的にログへ送らない。 */
    }
    try {
      mkdirSync(this.directory, { recursive: true });
      const file = join(this.directory, 'deskflow.log');
      if (
        existsSync(file) &&
        statSync(file).size + Buffer.byteLength(line + '\n') > this.maxBytes
      ) {
        const oldest = join(this.directory, 'deskflow.log.3');
        if (existsSync(oldest)) unlinkSync(oldest);
        for (let i = 2; i >= 1; i--) {
          const from = join(this.directory, `deskflow.log.${i}`);
          if (existsSync(from))
            renameSync(from, join(this.directory, `deskflow.log.${i + 1}`));
        }
        renameSync(file, join(this.directory, 'deskflow.log.1'));
      }
      appendFileSync(file, line + '\n', 'utf8');
      this.warned = false;
    } catch {
      if (!this.warned) {
        this.warned = true;
        try {
          this.output(
            JSON.stringify({
              operation: 'log',
              result: 'file_unavailable',
              message:
                'ファイルログを書けません。保存結果とは別に確認してください。',
            }),
          );
        } catch {
          /* 診断先も使用不能な場合は再試行しない。 */
        }
      }
    }
  }
}
