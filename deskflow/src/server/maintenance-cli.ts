import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { configuration, type Configuration } from './config.js';
import { backup, inspectBackup, restore } from './maintenance.js';
export function maintenanceCommand(
  args: string[],
  output: (value: string) => void = console.log,
  config: Configuration = configuration(),
): number {
  try {
    const [command, name, ...flags] = args;
    if (command === 'backup' && !name) output(JSON.stringify(backup(config)));
    else if (command === 'inspect' && name)
      output(JSON.stringify(inspectBackup(config, name)));
    else if (command === 'restore' && name)
      output(
        JSON.stringify(
          restore(config, name, flags.length === 1 && flags[0] === '--confirm'),
        ),
      );
    else
      throw new Error(
        'backup、inspect ファイル名、restore ファイル名 --confirm のいずれかを指定してください。',
      );
    return 0;
  } catch (error) {
    output(error instanceof Error ? error.message : '保守処理に失敗しました。');
    return 1;
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  process.exitCode = maintenanceCommand(process.argv.slice(2));
