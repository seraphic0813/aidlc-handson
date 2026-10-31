# DeskFlow：性能・操作性の確認手順

## Sources

- [コード計画とTesting Contract](../u1-deskflow/code-generation/code-generation-plan.md)、[単位テスト指示](../u1-deskflow/code-generation/unit-test-instructions.md)、[実装結果](../u1-deskflow/code-generation/code-summary.md)。
- [性能・操作性](../u1-deskflow/nfr-requirements/performance-requirements.md)、[保存・復旧](../u1-deskflow/nfr-requirements/reliability-requirements.md)、[安全性](../u1-deskflow/nfr-requirements/security-requirements.md)、[容量](../u1-deskflow/nfr-requirements/scalability-requirements.md)、[ログ](../u1-deskflow/nfr-requirements/observability-requirements.md)、[テスト可能性](../u1-deskflow/nfr-requirements/tech-stack-decisions.md)。
- [非機能設計](../u1-deskflow/nfr-design/logical-components.md)、[本人回答](build-and-test-questions.md)。

## Measurement

NFR1.1の条件はWindows Chrome/Edge、1人、架空100件、操作開始から結果表示まで2秒以内。一覧・検索・登録・更新を各5回、全20回の個別値と最大値を記録する。起動時間・ビルド時間・サーバー時間だけの値は対象外。

通常の初回10件は置き換えない。deskflow/.local/verification/配下の専用rootをconfigurationへ渡し、同じstartApplicationと既存dist/clientを使う。基準100件に3状態・検索一致例・未割当/担当ありを含める。登録・更新の各回前に専用の基準状態へ戻す。通常データの削除や上書きはしない。

## Commands and Evidence

`npm --prefix deskflow run test:unit -- --project u1-deskflow` はworkflow.test.tsの100件と20件ページを検証する。これは画面全体の性能測定ではない。ブラウザーの操作イベントからDOM反映まで測定し、OS/ブラウザー/Node版、件数、操作、各値をtest-results.mdへ記録する。

本実行はブラウザー操作接続が起動不能で、20回の測定は未実施。性能検証の後続工程は計画にないため、将来実施予定という理由で達成扱い・成功した延期扱いにしない。NFR1.1はUnverifiedとする。数値目標を下げない。

