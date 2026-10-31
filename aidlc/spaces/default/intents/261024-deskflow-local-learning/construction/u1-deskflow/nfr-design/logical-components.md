# DeskFlow：非機能の責任と障害範囲

## Sources

- [既存の論理コンポーネント](../../../inception/domain-design/components.md)。
- [採用技術](../nfr-requirements/tech-stack-decisions.md)、[機能仕様](../functional-design/functional-spec.md)。
- 本工程の[性能](performance-design.md)、[安全性](security-design.md)、[容量](scalability-design.md)、[保存・復旧](reliability-design.md)、[ログ](observability-design.md)。

## L1：論理的な実行境界

| 境界 | 内部の責任 | 共有資源・障害の影響 |
|---|---|---|
| DeskFlowInterface / BrowserRuntime | Reactの4画面、HTML/CSS/TypeScript、Atomic Design、入力・遷移・処理結果 | 1タブの未保存入力は他タブと共有しない。画面読込・描画障害はその画面操作を妨げるが保存の正本を変えない |
| InquiryManagement / Node | HTTP受付、正式検証、業務処理、SQLite受渡し、結果分類 | 1プロセスの停止は全画面の正式取得・保存に影響。静的配信とAPIは同じ起動単位 |
| InquiryManagement内部のSQLite接続 | Inquiry、SubmissionReceipt、InitializationCheckpointの保存 | DB障害は登録・更新・検索・初期化に影響。キャッシュから成功を偽装しない |
| ローカルログ出力 | 安全な構造化ログ、ターミナルと容量制限付きファイル | ファイルログ障害は診断を制限するが、保存済み業務データを無効にしない |
| 停止後の保守処理 | 排他、コピー、整合性確認、原本保全 | 実施中はアプリ再起動を拒否。復旧先切替は本人判断後 |

これは実装内部の責任を整理した表であり、Domain Designの2コンポーネントや実装単位U1を分割したものではない。LocalPersistenceはSQLiteファイルとして具体化し、ブラウザーへ所有を移さない。

## L2：Atomic Designの責任と状態

atomsは基本要素と表示状態を受け取り操作イベントを返す。moleculesはラベル・説明・エラーと複数の基本要素を組み合わせる。organismsは登録フォーム、問い合わせ表、対応編集などのまとまり。templatesは見出し・ナビゲーション・内容配置。pagesはW0〜W3と画面の取得状態・未保存値・遷移を調整する。

propsで表示値・無効状態・エラーと操作ハンドラーを渡し、SQLite接続や業務上の許可判定をatoms/moleculesへ渡さない。画面の編集値、取得した正式値、期待版、処理中、競合の最新値を分ける。入力状態を持つorganismの責任は明示し、同じ値をpagesとorganismsの両方で独立に更新しない。大域的な状態ライブラリは追加せず、ページと必要な共有状態で4画面を扱う。

## L3：テストと依存方向

NFR5.1〜NFR5.3を実現する。問い合わせ業務はHTTPやReactを介さず単体確認でき、保存境界は一時SQLiteで結合確認できる設計にする。HTTPと静的配信は実際の要求で境界を確認し、Reactは利用者に見える役割・ラベルから操作する。ログ・保守・起動コードもテスト可能な責任へ分けるが、汎用基盤のための過剰な抽象化は作らない。

手書きTS/TSX全体をV8の行カバレッジ80%以上の対象にし、未実行ファイルも母数へ含める。除外は依存物・生成物・テスト自身・型宣言だけのファイル・ビルド/検証設定で、理由を記録する。HTML/CSSはキーボード・拡大・表示で検証する。型チェック、lint、整形、ビルド、単体・主要境界の結合、カバレッジは実装後に再実行する。

## L4：環境設計への引き継ぎ

ソースはdeskflow/。次工程で、公開ビルド、Node実行物、DB、世代ログ、日時付きバックアップ、排他記録、テスト用一時保存先の具体的な配置を決める。公開ルートと保存先を分け、開発用設定と通常起動を混同しない。保守排他の異常終了時の確認、ポート競合、依存導入と検証コマンド、起動・停止手順も具体化する。

アプリのコード・実行設定・依存の導入はこの設計書の作成では行わず、実装前のコード計画に渡す。

## Assumptions & Open Questions

None. 本表は既存所有境界に沿った技術上の具体化。
