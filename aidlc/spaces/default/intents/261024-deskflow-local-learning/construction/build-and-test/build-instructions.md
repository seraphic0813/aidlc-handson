# DeskFlow：ビルドと検証の手順

## Sources

- [コード計画とTesting Contract](../u1-deskflow/code-generation/code-generation-plan.md)、[単位テスト指示](../u1-deskflow/code-generation/unit-test-instructions.md)、[実装結果](../u1-deskflow/code-generation/code-summary.md)。
- [性能・操作性](../u1-deskflow/nfr-requirements/performance-requirements.md)、[保存・復旧](../u1-deskflow/nfr-requirements/reliability-requirements.md)、[安全性](../u1-deskflow/nfr-requirements/security-requirements.md)、[容量](../u1-deskflow/nfr-requirements/scalability-requirements.md)、[ログ](../u1-deskflow/nfr-requirements/observability-requirements.md)、[テスト可能性](../u1-deskflow/nfr-requirements/tech-stack-decisions.md)。
- [非機能設計](../u1-deskflow/nfr-design/logical-components.md)、[本人回答](build-and-test-questions.md)。

## Environment

Windows、Node v24.14.0、npm 11.9.0。依存はdeskflow/package-lock.jsonの固定版。外部DBや環境変数は不要。以下はワークスペースルートで実行する。通常起動のポートだけDESKFLOW_PORTで変更可能。

## Commands

再導入が必要な場合は `npm --prefix deskflow ci`。依存を変更せずlockfileから復元する。

本工程の一括検証は `npm --prefix deskflow run verify`。型チェック、lint、整形確認、Vite/TypeScriptビルド、全単位のカバレッジ試験を順に実行する。追加の単体実行は `npm --prefix deskflow run test:unit -- --project u1-deskflow`。層ごとの開発時コマンドは上流の単位テスト指示を参照するが、同じ試験を結果件数へ重複計上しない。

ビルド出力はdeskflow/dist/client/とdeskflow/dist/server/。起動は `npm --prefix deskflow start`、URLはhttp://127.0.0.1:3000。初回10件とログ・排他記録をdeskflow/.local/へ作る。

## Verification and Troubleshooting

終了コード0、dist/client/index.htmlとNodeエントリーの存在、全9テストファイルの成功、V8行80%以上を確認する。ポート競合は他プロセスを終了せずDESKFLOW_PORTで回避する。EPERMは必要な実行権限を得て同じコマンドを再実行する。

通常起動の停止はCtrl+C後にshutdownログ、stopped.json、排他解除を確認する。本実行ではコマンド実行セッションの中断で正常停止記録が作られなかった。operation.lockは保全し、通常データを再起動・コピーしない。所有プロセスの不存在とDB検査だけで、本人の判断を省いて残存記録を消さない。

