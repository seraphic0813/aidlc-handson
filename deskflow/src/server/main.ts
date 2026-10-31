import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { configuration, type Configuration } from './config.js';
import { startRuntime } from './lifecycle.js';
import { LocalLogger } from './logger.js';
import { InquiryRepository } from './repository.js';
import { InquiryService } from './inquiry-service.js';
import { httpServer } from './http-server.js';
export async function startApplication(
  config: Configuration = configuration(),
  logger = new LocalLogger(config.logs),
) {
  if (!existsSync(join(config.publicRoot, 'index.html')))
    throw new Error(
      '画面のビルドがありません。npm --prefix deskflow run buildを実行してください。',
    );
  const runtime = startRuntime(config, logger);
  const server = httpServer(
    new InquiryService(new InquiryRepository(runtime.db)),
    config.publicRoot,
    logger,
  );
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, '127.0.0.1', resolve);
    });
  } catch (error) {
    runtime.stop();
    throw error;
  }
  let stopping = false;
  return {
    server,
    async stop() {
      if (stopping) return;
      stopping = true;
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      runtime.stop();
    },
  };
}
export async function runMain(
  output: (message: string) => void = console.log,
  boot: () => Promise<{ stop: () => Promise<void> }> = () => startApplication(),
): Promise<number> {
  try {
    const app = await boot();
    output('DeskFlowをループバックで起動しました。停止はCtrl+Cです。');
    const stop = () => {
      void app.stop().catch(() => {
        process.exitCode = 1;
        output(
          '停止を完了できませんでした。コピーを取らず状態を確認してください。',
        );
      });
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    return 0;
  } catch (error) {
    output(
      error instanceof Error && 'code' in error && error.code === 'EADDRINUSE'
        ? 'ポートが使用中です。DESKFLOW_PORTを変更してください。他のプロセスは停止しません。'
        : error instanceof Error
          ? error.message
          : '起動に失敗しました。',
    );
    return 1;
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  void runMain().then((code) => {
    process.exitCode = code;
  });
