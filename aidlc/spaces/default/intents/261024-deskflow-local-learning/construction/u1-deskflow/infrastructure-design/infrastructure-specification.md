# DeskFlow：ローカル実行環境の設計

## Sources

- [本工程の回答](infrastructure-design-questions.md)：Q1=A、Q2=A。
- [論理構成](../nfr-design/logical-components.md)、[保存・停止・復旧](../nfr-design/reliability-design.md)、[安全性](../nfr-design/security-design.md)。
- [所有境界](../../../inception/domain-design/components.md)、[実装単位](../../../inception/units-generation/unit-of-work.md)、[機能仕様](../functional-design/functional-spec.md)。

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| 実行モデル | WindowsのNode.js v24.14.0、1プロセス。Reactの静的画面とAPIを同じアプリから提供 | 既存実行環境と単独アプリの方針。コンテナー・常駐サービスは追加しない |
| ネットワーク | 127.0.0.1:3000を既定。ポートのみ設定可能、ホストは固定 | 外部公開を防ぎ、同一オリジンに統一。ポート使用中は失敗を説明し他プロセスを停止しない |
| 入出力 | 通常操作は同じローカルオリジンへのHTTPだけ | 実行時にCDN、外部API、外部フォント、メールを必要としない |
| 保存戦略 | プロジェクト内deskflow/.local/にSQLite・ログ・バックアップ・排他状態を分離 | 本人Q1=A。Git・静的配信から除外する |
| 環境 | ローカル演習用と独立したローカル検証用の保存先 | テストや性能の基準データで演習データを上書きしない。staging/prodは作らない |
| 構成管理 | package.json、lockfile、TypeScript/Vite/検証設定とREADME | ローカル再現用。クラウドIaCやAWS設定は作らない |
| 規模 | 1人、100件で性能・境界を検証。1ページ20件 | 100件は検証規模であり登録拒否の業務上限ではない |
| 費用 | 既存PCと無料ソフトを使用。外部の課金資源は0件 | 追加の有料サービスを契約せず、既存PC・通信・電力の費用まで無料とは主張しない |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| Node HTTP | compute / ingress | ループバック、固定Host検査、同一Origin、JSON変更要求、独自ヘッダー、本文64KiB、受信5秒 | 本文上限はQ2=Aで採用。詳細はsecurity-design.mdを適用 |
| SQLite | database | node:sqlite、接続1本、DELETEジャーナル、synchronous=FULL、外部キー有効、ロック待ち1000ms | 起動時に設定を読み返す。業務所有はInquiryManagement |
| Reactビルド | static assets | Vite＋React＋TypeScript、HTML/CSS、配信先dist/clientのみ | Atomic Designの5層を画面側へ適用。任意のフォルダーを配信しない |
| ファイルログ | local diagnostics | JSON行、1MiBで切替、現行1＋過去3、1行4KiB以下 | DBの成否とログの成否を分ける。入力本文等を記録しない |
| 手動バックアップ | backup | 正常停止・排他・新規コピー・読取専用の検査 | 演習終了時と保存先を変える保守前。既存コピーを上書きしない |
| キャッシュ・キュー・CDN・LB・外部DNS | 対象外 | 配置しない | 1人のローカル演習に不要。問い合わせの別正本を作らない |

## File Layout

以下はコード計画へ渡す配置案。現時点でアプリ用ファイルやフォルダーを作成したという意味ではない。

| Path | 内容 | 管理・公開範囲 |
|---|---|---|
| deskflow/src/client/ | Reactのatoms、molecules、organisms、templates、pagesと画面調整 | ソースをGit管理。部品から直接SQLiteへアクセスしない |
| deskflow/src/server/ | Node受付、業務処理、保存境界、起動・停止・保守・ログ | ソースをGit管理。管理側が正式検証とデータを所有 |
| deskflow/src/shared/ | 文字数・送信上限等の純粋な共通定義 | 実行時はサーバーでも必ず再検証。DBや秘密設定を混ぜない |
| deskflow/dist/client/ | 配信用HTML/CSS/JS | 生成物、Git対象外。通常起動の唯一の静的配信ルート |
| deskflow/dist/server/ | 管理側のコンパイル結果 | 生成物、静的配信対象外。コード計画で起動エントリーを確定 |
| deskflow/.local/data/deskflow.sqlite | 演習用の正本 | Git・静的配信対象外。通常起動以外で無断で変更しない |
| deskflow/.local/logs/ | アプリの現行・過去3世代ログ | Git・静的配信対象外。自分の世代ログだけを容量管理 |
| deskflow/.local/backups/ | 日時付きコピーとその検査結果 | Git・静的配信対象外。自動の削除や上書きをしない |
| deskflow/.local/state/ | 起動・保守の排他記録 | Git・静的配信対象外。異常終了の残存記録を自動削除しない |
| deskflow/.local/verification/ | 性能・復旧確認の専用データ | Git・静的配信対象外。通常演習用を再利用しない |
| deskflow/tests/とcoverage/ | テストと生成カバレッジ | テストはGit管理、coverage生成物は対象外 |

同じディスク内のバックアップは、そのディスク全体の故障に備える保証ではない。DBとログとバックアップは別の管理対象で、ログ世代切替がバックアップを削除することはない。

## Startup and Configuration

| 項目 | 優先順位・検証 | 失敗時 |
|---|---|---|
| アプリルート | エントリーファイル基準でdeskflowを解決し、起動したシェルの場所に依存させない | 配信物やDBの解決先を誤って別の空DBへ置換しない |
| ポート | DESKFLOW_PORTがあれば整数1〜65535、なければ3000。待受Hostは常に127.0.0.1 | 無効値・競合はキーと修正方法を案内して終了 |
| 保存ルート | 通常起動はdeskflow/.local固定 | 別保存先への変更・データ移動は今回の通常操作へ自動追加しない |
| 配信物 | dist/clientの存在と起動エントリーを確認 | ビルドが必要と案内し、別のディレクトリを代わりに公開しない |
| Nodeと依存 | 確認したNode版とlockfileの互換性をコード生成時に検証して固定 | 実行環境を無断で更新しない。対応版と導入手順を案内 |
| DB | 新規と既存を区別。設定・schema version・初期化記録・参照を検査 | 破損・不明な版・不整合は待受開始前に停止。再投入で隠さない |

アプリ起動と保守は、保存ルートに対応する単一の排他記録を排他的作成で獲得してから処理する。記録には所有操作、PID、開始時刻、実行ごとの識別値を残す。起動中とコピー中の並行操作を拒否し、完了時は自分が所有する記録だけを解放する。例外や異常終了で残った記録は、PIDの再利用や別操作との混同を避けるため自動解除しない。状態・対象・プロセスを確認して本人判断で解除する保守手順を用意する。テストには演習と異なる排他記録を使う。

## Local Lifecycle and Recovery

| 操作 | 手順の責任 | 判断点 |
|---|---|---|
| 初回起動 | 排他、配信物確認、DB準備、初期10件＋完了記録を不可分保存、HTTP待受 | テスト結果説明後に本人の起動判断を待つ |
| 停止 | 新規受付停止、進行中処理の完了/取消、DB・ログ終了、自分の排他解放 | 正常終了が確認できなければコピーしない |
| 再起動 | 同じ保存先で起動し、件数と保存値を確認 | 初期10件を再投入しない |
| バックアップ | 停止確認、保守排他、衝突しない日時付きコピー、整合性・外部キー・件数検査 | 完了前や検査失敗を正常バックアップと表示しない |
| 復旧 | 原本保全、別の保存先でコピー検査、巻戻り説明、本人判断後の切替 | 自動復旧や無断上書きを行わない |

## Requirement Mapping and Open Items

全26件の具体的な対応はtraceability.json。HTML/CSS・キーボード確認の要件は実行ブラウザーと検証手順にも割り当てる。追加の64KiB受入条件は本工程Q2=Aに基づき、上位要件・BR1.1/BR3.2・機能仕様・画面案内と境界確認へ反映した。具体的な実装ファイル・依存バージョン・npmスクリプトはコード計画の承認対象。

## Assumptions & Open Questions

None. ポートと排他方式は選択されたローカル運用を具体化する設計。保存先は本人Q1=A。
