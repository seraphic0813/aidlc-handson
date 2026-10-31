# DeskFlow：結合と画面確認の手順

## Sources

- [コード計画とTesting Contract](../u1-deskflow/code-generation/code-generation-plan.md)、[単位テスト指示](../u1-deskflow/code-generation/unit-test-instructions.md)、[実装結果](../u1-deskflow/code-generation/code-summary.md)。
- [性能・操作性](../u1-deskflow/nfr-requirements/performance-requirements.md)、[保存・復旧](../u1-deskflow/nfr-requirements/reliability-requirements.md)、[安全性](../u1-deskflow/nfr-requirements/security-requirements.md)、[容量](../u1-deskflow/nfr-requirements/scalability-requirements.md)、[ログ](../u1-deskflow/nfr-requirements/observability-requirements.md)、[テスト可能性](../u1-deskflow/nfr-requirements/tech-stack-decisions.md)。
- [非機能設計](../u1-deskflow/nfr-design/logical-components.md)、[本人回答](build-and-test-questions.md)。

## Automated Boundaries

既存Vitestのu1-deskflowプロジェクトで、実SQLiteの不可分保存・版競合・再送、HTTPの登録・更新・再開・配信・不正要求、再オープン後の保持を確認する。全体実行はbuild-instructions.mdの2コマンドを使う。同じ91例の再実行を異なる例として足さない。

DB、ログ、保守コピーはdeskflow/.local/verification/の実行ごとの領域だけを使い、試験の後始末は試験が所有するデータに限る。通常DBは初期化しない。別Unit間結合はUnitが1つのため存在せず、Browser/Node/SQLiteの境界を対象にする。

## Real Browser and Acceptance

補足の実行可能な境界確認は `node aidlc/spaces/default/intents/261024-deskflow-local-learning/.aidlc-engine/verify-build-runtime.mjs`。既存のビルド済みサーバーと画面ファイル、独立した100件のDBを使い、ループバック配信、5ページ目、同キー並行登録、同版並行更新、SQL記号の値保持、実DBロック待ち、アプリの正常停止と再起動保持、構造化ログを検証する。専用データは検証の証拠として残し、通常の10件DBには触れない。ブラウザーや通常起動のCtrl+Cを検証するものではない。

WindowsのChromeまたはEdgeで入口→登録→一覧検索→詳細→担当・状態保存→回答と完了→再開を行う。2タブ競合で最新状態が完了になった分岐も含める。Tab/Shift+Tab/Enterで完走し、ラベル・文字通知・フォーカスを記録する。200%で4画面と上限長入力を確認する。

この実行のブラウザー操作接続2方式はどちらもNode runtimeのパス不在で起動不能。DOMテストは実ブラウザーでのキーボード・拡大確認を代替しない。現時点では未実施。画面経由の登録・更新も行っていない。

## Known Accepted Findings

コード生成の未解決R-01（競合後の再開で未保存入力消失）、R-02（登録確認項目不足）、R-03（画面の相関ID不足）はUnit承認で受入済み。解消済み・要件達成済みとはせず、結果表では該当条件をNot Metとする。

