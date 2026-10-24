# DeskFlow：実装単位の定義

## Sources

- [要件](../requirements-analysis/requirements.md)：FRの下位23件、NFR1〜NFR7。
- [コンポーネント](../domain-design/components.md)と[設計判断](../domain-design/decisions.md)：画面と問い合わせ管理の責任・所有境界。
- [本工程の回答](units-generation-questions.md)：Q1=A、Q2=A。分割計画は本人がApprove Planを選択。
- [開発方針](../practices-discovery/team-practices.md)：各工程とコード計画の承認、test-after、ローカル運用。

## Unit Definitions

| Unit ID | Directory | Name | Kind | Deployment Model | Complexity |
|---|---|---|---|---|---|
| U1 | u1-deskflow | DeskFlowローカルWebアプリ | service | standalone | M |

U1は単独で起動できる1つのローカルWebアプリである。同じアプリが4画面と問い合わせ管理を提供する。`service`は実行可能なアプリという分類であり、外部公開やAWS上のサービスを意味しない。画面だけを別の起動単位にしない。

`u1-deskflow`は工程文書の単位名で、後続の設計文書は本記録の`construction/u1-deskflow/`に置く。アプリのソース・テスト・起動設定はワークスペースの`deskflow/`に置く。両者を同じディレクトリとは扱わない。具体的なファイル構成は実装前のコード計画で承認を得る。

## Responsibilities and Boundaries

| Component | U1内の責任 | 所有境界 |
|---|---|---|
| DeskFlowInterface | 入口・登録・一覧検索・詳細対応、入力中の状態、結果表示、未保存の案内、キーボード操作 | 問い合わせの正本を持たずInquiryManagementへ同期的に処理を依頼する |
| InquiryManagement | 登録・担当・状態・回答・検索、入力検証、重複送信・競合・初回投入・保存の整合性 | Inquiry、SubmissionReceipt、InitializationCheckpointを唯一の所有者として管理する |

全FRとNFRをU1が実現する。分類・担当者は管理側の固定参照データであり、利用者アカウントや追加管理画面を作らない。LocalPersistenceは管理側の内部実装から利用する論理的保存先、BrowserRuntimeは利用者が操作するブラウザーであり、別の実装単位には数えない。

## Deployment Model

ローカルで1つのアプリを起動・停止する構成とする。アプリの待受先はループバックに限定する。保存成功した内容を再起動後も保持する。ローカル保存の形式・保存先とバックアップ復旧の具体的方式は後の設計で定める。復旧操作と初回のローカル起動は、説明後に本人の判断を待つ。

## Complexity Rationale

相対規模はMとする。単位間連携はないが、4画面に加え、文字数・検索比較、状態遷移、重複送信防止、競合判定、初期化、永続化失敗を含むためSとはしない。これは工数や納期の見積もりではない。

## Implementation Notes and Constraints

- 全23件のFRの受入条件を後続の機能設計へ引き継ぐ。対応表は[要件割当](unit-of-work-story-map.md)に示す。
- 内部の画面責任と管理責任を維持し、画面から正式な保存内容を直接更新する経路を作らない。
- 各層の実装後に単体・主要境界の結合テストを行う。行カバレッジ80%以上とし、対象除外理由を後続設計で明記する。
- WindowsのChromeまたはEdge、1人、100件、1ページ20件の条件を維持する。主要操作2秒以内の目標は実測で確認する。
- 架空データだけを利用し、外部公開・AWS配備・外部メール・外部連携を追加しない。初回10件だけを投入し、再起動で再投入しない。
- 言語、フレームワーク、保存製品、通信形式、具体的コマンドは後続の設計で選定する。追加の無料ソフトは目的と導入内容を説明してから扱う。
- 工程ごとの承認、実装前のコード計画承認、テスト結果の説明後の起動判断を維持する。単位内でも工程をまとめて飛ばさない。
- 別の先行最小版を設けず、現在のブランチで小さく進める。コミット等は明示依頼時だけ行う。

## Assumptions & Open Questions

None. 技術や具体的なファイル構成は後続工程の設計事項として引き継ぐ。

