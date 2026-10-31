# DeskFlow：u1-deskflowのテスト指示

## Scope and Ordering

### Loop-back 1の修正検証

今回追加する対象はBT-01のDB待機予算と実測回帰検査だけ。既存runnerと初回91例を保持し、database.tsを修正してからdatabase.test.tsへ実2接続ロックの検査を追加する。SQLite内部予算を500msにしても、実経過の合格条件は1秒以内のまま維持する。ロック中に部分保存しないこと、解除後の明示操作が成功することも確認する。

実行は下表のDB層コマンド、`npm --prefix deskflow run verify`、`node aidlc/spaces/default/intents/261024-deskflow-local-learning/.aidlc-engine/verify-build-runtime.mjs`。補足処理は設定期待値を500msへ合わせるが、実測1000ms以下という条件は変えない。通常DB/残存排他は変更せず、既存レビュー3件とブラウザー未確認は未解決として残す。

以下は初回実装時の計画・コマンドの記録。依存とソースは現在存在し、本修正で再作成しない。

対象はdeskflow/のu1-deskflowだけ。test-afterで各層の実装後にその層のテストを書き実行する。runnerと設定は計画Step 2で先に用意する。まだ依存・ソース・テストは未作成で、以下は実装時に成立させるコマンドの契約である。

Vitestの名前付きプロジェクトu1-deskflowはtests/u1-deskflow/のテストだけをincludeする。Node環境を既定とし、ui.test.tsxだけファイル単位のDOM環境を指定する。テストはウォッチではなくrunで終了し、子プロセス・HTTP接続・SQLite接続・タイマーを後始末する。

## Exact Unit Commands

ワークスペースのルートで実行する。npmスクリプトtest:unitはvitest run、test:coverageはvitest run --coverageを予定し、すべて次の単位フィルターを付ける。

| タイミング | 正確なコマンド |
|---|---|
| 全単位テスト | npm --prefix deskflow run test:unit -- --project u1-deskflow |
| DB層 | npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/database.test.ts |
| 保存層 | npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/repository.test.ts |
| 業務と共通入力 | npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/service.test.ts tests/u1-deskflow/input-policy.test.ts |
| 実行・保守・ログ | npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/runtime.test.ts |
| HTTP・配信 | npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/http.test.ts |
| React | npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/ui.test.tsx |
| 一貫経路 | npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/workflow.test.ts |
| カバレッジ | npm --prefix deskflow run test:coverage -- --project u1-deskflow |
| 型確認 | npm --prefix deskflow run typecheck |
| 静的確認 | npm --prefix deskflow run lint |
| 整形確認 | npm --prefix deskflow run format:check |
| ビルド | npm --prefix deskflow run build |

型・lint・整形・ビルドのコマンドもdeskflowというこの単位のパッケージだけを対象とする。テストのない時点のrunner確認は実行環境の確認であり、要件テスト成功とは数えない。fail-no-testsの設定を下げて実装検証を成功扱いしない。

## Test Cases and Traceability

| ファイル | 主なケース | 対応 |
|---|---|---|
| database.test.ts | 初回10件と3状態、有効な完了回答、再投入なし、11件と更新保持、初期化途中失敗、不明schema・不整合、設定と再オープン | FR6・FR7.1、NFR2・NFR6 |
| repository.test.ts | 同キー同内容、同キー異内容、新キー同内容、採番、同版の2要求、失敗取消、確定済み再読込 | FR1.3・FR1.4・FR7 |
| input-policy.test.ts | 必須空白、最大長と1文字超過、結合文字・絵文字、改行保持、固定値、不正型、NFKCと大小文字、JSON全体バイトサイズ | FR1.1・FR1.2・FR3.2・FR5.1、64KiB条件 |
| service.test.ts | 登録初期値、担当変更、禁止遷移、有効/空回答、未割当完了、完了編集拒否、再開保持、変更なしと古い版、5項目検索と条件併用、同時刻・20件ページ | FR1〜FR5・FR7 |
| runtime.test.ts | 設定不備、排他と残存記録、停止後コピー、コピー先衝突・失敗・検査、復旧前原本保全、ログ容量・秘匿・書込失敗 | NFR3・NFR6・NFR7 |
| http.test.ts | 正常要求、Host/Origin/ヘッダー/型不正、64KiB境界、DB失敗・ヘルス、ルート脱出と私有ファイル非公開、受信待機上限 | FR7・FR8、NFR3・NFR2.5 |
| ui.test.tsx | 入口分岐、ラベルからの登録、成功後空フォーム、保存不備と通信失敗で入力保持、0件と失敗、検索条件とページ復元、完了・再開、競合表示、未保存の移動、サイズ超過案内 | FR1〜FR5・FR8、NFR4 |
| workflow.test.ts | 登録→担当・状態更新→回答・完了→検索・詳細→再開→再起動参照、初回投入の再実行なし | 成功条件S1〜S3、全主要経路 |

約50〜70例を見込み、2つの論理コンポーネントそれぞれに正常系と2つ以上の異常/境界例、5〜8例以上を含める。行カバレッジと受入条件に不足があれば例を追加し、計画の目安を理由に打ち切らない。

## Mocking and Data Management

業務単体では保存境界を必要に応じて差し替えるが、SQLiteの一意性・取消・版競合は実際の一時DBで確認する。HTTPはループバックの一時ポートで起動し、DOM試験ではapi.tsの境界を差し替えて失敗・遅延を再現する。単体の差替えだけで保存やHTTP境界の成功を主張しない。

一時DB・排他・ログ・コピーはdeskflow/.local/verification/内の実行ごとに分離した領域を使う。通常の.local/dataや既存backupsへ書かない。テスト自身が作成したファイルだけを後始末し、利用者ファイルを列挙・削除しない。時刻・識別子・失敗注入を制御可能にし、Node同期SQLiteを扱う試験間でDBを共有しない。

65536/65537バイトの境界は文字列だけでなく実際のJSON本文を構成して合わせる。書記素数内の結合文字、付帯項目、JSONエスケープ、Content-Lengthに依存しない実受信量も確認する。画面は実送信と同じJSON表現を計測する。

## Coverage and Completion

V8カバレッジはsrc/**/*.ts・src/**/*.tsxの手書き実装全体を対象にし、未実行ファイルを母数から落とさない。行80%以上が必須。依存物・生成dist・テスト自身・型宣言のみ・ビルド/検証設定は除外理由を明記し、業務・配信・起動・ログ・保守の実装は除外しない。

実行コマンド、合否、件数、カバレッジと未解決点を記録する。通常起動後の実ブラウザーでの性能・キーボード・200%拡大、停止後の実際のコピーと復旧は別途本人判断を経た確認とする。DOMテストやサーバー時間だけで、それらの実地確認を完了扱いしない。
