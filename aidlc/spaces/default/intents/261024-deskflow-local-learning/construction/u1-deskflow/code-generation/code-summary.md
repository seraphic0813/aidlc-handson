# DeskFlow：コード生成の結果

## Loop-back 1 — BT-01修正と再検証

2026-10-25の承認済み修正計画に従い、`deskflow/src/server/database.ts`のSQLite内部待機予算を1000msから500msへ変更した。実経過1秒以内というNFR2.5の合格条件は維持し、schema・トランザクション・自動再試行は変更していない。短い競合でも従来より早く保存失敗になる可能性があり、OSの長時間停止まで絶対保証するものではない。旧設計の1000ms設定に対する今回の承認済み例外はコード計画のRepair Scopeに記録されている。

実装変更後に`deskflow/tests/u1-deskflow/database.test.ts`へ実2接続の登録ロック回帰1例を追加した。別接続のBEGIN IMMEDIATE中に登録が実経過1000ms以内で失敗し、問い合わせ10件・受付0件のままで、未確定トランザクションも残らないことを確認する。ロック解除後は同じ受付キーによる明示登録がDF-000011として成功し、受付と問い合わせが保存される。PRAGMA期待値は500ms。既存91例は削除せず、計92例となった。

| 正確な実行コマンド | 今回の結果 |
|---|---|
| npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/database.test.ts | 終了0、DB層9例成功（既存8＋追加1） |
| npm --prefix deskflow run verify | 終了0、型・lint・整形・build・9ファイル92例成功、failed 0・skipped 0 |
| node aidlc/spaces/default/intents/261024-deskflow-local-learning/.aidlc-engine/verify-build-runtime.mjs | 終了0、5検査群すべて成功、実ロック632ms ≤ 1000ms |

今回のV8結果も行92.08%（582/632）、statements91.10%（604/663）、branches85.46%（447/523）、functions87.79%（151/172）。全手書きTS/TSX、未実行client/main.tsx、起動・CLI・配信・保守・ログを含む母数と80%閾値を維持した。依存追加・runner変更はない。整形は変更したDBソースと回帰試験に限定した。

補足検査は`deskflow/.local/verification/build-runtime-XZI5pz`の専用データで、100件・5ページ目20件、同キー並行登録201/200で同一DF-000101、同版並行更新200/409、停止/再起動で101件・版2保持、停止記録と排他解除、構造化ログ12行と入力漏出なしも確認した。HTTPサーバーとDBは終了済み。補足5群をVitest92例へ加算しない。補足helperの設定期待値だけ500msへ合わせ、実測1000ms以下の判定は変更していない。

通常のDB・残存operation.lock・既存バックアップには触れていない。Build and Testで通常起動とGET /・healthは確認済みだが、中断終了時の正常停止記録がなく、通常データの残存排他は保全中。今回の専用app.stop成功は通常CLI停止の証明ではない。ブラウザー接続不具合、実キーボード・200%拡大・画面全体2秒の測定、利用者データでの実コピー/復旧は未確認のまま。他タブ完了後の再開で未保存担当/回答を置換すること、登録成功表示が番号/件名のみであること、画面に相関IDがないことも、今回のDB修正では変更していない。

以下は初回実装の履歴であり、今回の変更したアプリファイルはsource-manifest.jsonに明示した2ファイルのみである。

## Sources

- [承認済みの計画](code-generation-plan.md)、[テスト指示](unit-test-instructions.md)。
- [実装と手順](../../../../../../../../deskflow/README.md)、[依存と実行コマンド](../../../../../../../../deskflow/package.json)。
- [V8カバレッジ概要](../../../../../../../../deskflow/coverage/coverage-summary.json)、[HTMLレポート](../../../../../../../../deskflow/coverage/index.html)。
- 実装担当の実行結果報告、および主担当が実行したUIテスト15例の結果。

## Implementation

deskflow/にReact＋TypeScriptの4画面とAtomic Designの5層、Node標準HTTP＋SQLiteの管理側を実装した。ソース・テスト・構成・READMEはsource-manifest.jsonの単位ディレクトリに含む。

| 対象 | 主なファイル | 実装内容 |
|---|---|---|
| 共通 | src/shared/types.ts、input-policy.ts | 固定値、文字数・比較、JSONの送信サイズ検査 |
| 保存と業務 | src/server/database.ts、seed.ts、repository.ts、inquiry-service.ts | 初期10件、一括保存、受付再送、版競合、担当・完了・再開、検索とページ |
| HTTPと配信 | src/server/http-server.ts、request-policy.ts、static-files.ts | 同一Host/Origin、JSONと64KiB上限、受信期限、安全な配信、ヘルス |
| 実行と保守 | src/server/config.ts、lifecycle.ts、main.ts、maintenance.ts、maintenance-cli.ts、logger.ts | 固定保存先、排他、停止、コピー検査・原本保全、容量制限付きログ |
| 画面 | src/client/App.tsx、api.ts、hooks/、components/、pages/、styles.css | 4画面、入力保持、結果不明の再送、競合比較、未保存移動、検索条件復元 |
| 検証 | tests/u1-deskflow/の9ファイル、tests/setup-dom.ts、tests/helpers.ts | 単体、実SQLite・HTTP結合、React操作、通信境界 |
| 構成・文書 | package.json、lockfile、TypeScript/Vite/Vitest/ESLint/Prettier設定、README | 再現導入、型・静的・整形・ビルド・カバレッジ、起動・保守手順 |

## Validation Results

| 実行内容 | 結果 |
|---|---|
| npm --prefix deskflow run typecheck | 成功 |
| npm --prefix deskflow run lint | 成功 |
| npm --prefix deskflow run format:check | 成功 |
| npm --prefix deskflow run build | 成功 |
| npm --prefix deskflow run test:coverage -- --project u1-deskflow | 9ファイル、91例すべて成功 |
| 依存導入時のnpm audit | vulnerabilities 0件 |

| 試験ファイル | 例数 |
|---|---|
| database.test.ts | 8 |
| repository.test.ts | 9 |
| service.test.ts | 13 |
| input-policy.test.ts | 11 |
| runtime.test.ts | 14 |
| http.test.ts | 12 |
| ui.test.tsx | 15 |
| workflow.test.ts | 2 |
| api.test.ts | 7 |

最終V8レポートの行カバレッジは**92.08%（582/632）**、statements 91.10%、branches 85.46%、functions 87.79%。全手書きTS/TSXを母数に含め、未実行のclient/main.tsxも除外していない。起動・CLI・配信・保守・ログも対象。CSS/HTMLは実地の表示・操作確認へ引き継ぐ。

UI試験の初回は画面の「申請者名」「問い合わせ内容」とテストの検索ラベルが不一致で4例失敗した。主担当が仕様に合うラベル指定へ修正し、同じ15例が成功した。その修正後の全カバレッジ試験も成功している。

## Decisions and Deviations

- Node v24.14.0に対応する公開版を確認して具体的に固定した。jsdomは新しい版のNode要件に合わせて環境を更新せず、対応する26.1.0を採用した。TypeScriptは5.9.3、Reactは19.3.1、Viteは8.3.5、Vitestは5.0.5。
- 計画の約50〜70例は目安であり、必要な境界確認を追加して91例とした。目標や母数は減らしていない。
- 承認済みの一覧に加え、依存解決用の.npmrc、テスト共通処理tests/helpers.ts、通信境界のtests/u1-deskflow/api.test.tsを作成した。同じ責任の具体化で、追加の業務機能や外部基盤はない。
- Vitestとビルドは制限環境で子プロセス起動がEPERMとなり、権限付きで実行した。応答が長く返らない呼出しは中断して状態を確認し、二重起動を避けて再開した。失敗や未確認を成功件数へ数えていない。
- 最終の文書確認で、READMEの申請者名の表記とログの現行1＋過去3世代を仕様に合わせた。アプリの動作変更はない。

## Not Executed and Remaining Verification

通常演習用アプリの起動、実ブラウザーでのキーボード・200%拡大・主要操作全体の2秒目標、利用者の演習データを用いた実コピー・復旧は未実施。計画どおり検証結果を説明して本人の判断を待つためである。自動テストの一時ループバックサーバーと専用SQLite・コピー検証を、通常起動や実地確認の完了とは扱わない。

作成した自動テストで未実行のスイートはない。全体92.08%は全機能・全分岐の完全な検証を意味せず、未実行行と実地確認を明示したうえで後工程へ渡す。node:sqliteは記録した実行版で開発中APIであり、異なるNode版での動作を未検証で保証しない。
