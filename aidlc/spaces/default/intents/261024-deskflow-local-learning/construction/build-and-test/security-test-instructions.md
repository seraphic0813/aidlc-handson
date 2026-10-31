# DeskFlow：ローカル安全性の確認手順

## Sources

- [コード計画とTesting Contract](../u1-deskflow/code-generation/code-generation-plan.md)、[単位テスト指示](../u1-deskflow/code-generation/unit-test-instructions.md)、[実装結果](../u1-deskflow/code-generation/code-summary.md)。
- [性能・操作性](../u1-deskflow/nfr-requirements/performance-requirements.md)、[保存・復旧](../u1-deskflow/nfr-requirements/reliability-requirements.md)、[安全性](../u1-deskflow/nfr-requirements/security-requirements.md)、[容量](../u1-deskflow/nfr-requirements/scalability-requirements.md)、[ログ](../u1-deskflow/nfr-requirements/observability-requirements.md)、[テスト可能性](../u1-deskflow/nfr-requirements/tech-stack-decisions.md)。
- [非機能設計](../u1-deskflow/nfr-design/logical-components.md)、[本人回答](build-and-test-questions.md)。

## Automated Checks

既存http/input-policy/database/repository/runtimeテストをbuild-instructions.mdの全体コマンドで実行する。不正Host/Origin/Content-Type/独自ヘッダー、過大JSON、未知項目、状態・版、静的ルート外と.localの拒否、ログへの入力目印漏出を確認する。65536バイト許可・65537拒否は実JSON要求で確認する。

CSP等のヘッダーと配信対象はhttp.test.tsで確認する。Reactテキスト描画とSQLパラメーターはソースでも確認するが、悪意文字列の実ブラウザー表示まで実施したとは扱わない。認証・TLS・クラウドDAST・実データの試験は追加しない。

## Environment and Operational Safety

通常起動の待受はGet-NetTCPConnectionで127.0.0.1:3000を確認。通常DBは読取専用でintegrity_checkとforeign_key_check、件数のみ確認する。相関IDはヘルス応答にあるが、画面までの伝播は未達R-03。

依存は導入時に監査0件の記録がある。新しい監査結果が必要な場合は `npm --prefix deskflow audit --json` を実行し、その実行時点の結果として別記する。本工程で未実行の監査を新たに成功したと記録しない。

通常DBのコピーと復旧は別の本人判断まで実施しない。残存排他記録を保全する。専用データを使う既存保守試験の成功を、通常DBの復旧完了に読み替えない。

