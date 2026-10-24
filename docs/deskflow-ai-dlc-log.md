# DeskFlow AI-DLC体験記録

更新日: 2026-10-24

この文書は、AI-DLC導入後のDeskFlow体験で実際に行った操作、選択した理由、得られた結果を時系列で記録する。導入と初期設定は [AI-DLC導入ハンズオン手順書](ai-dlc-setup-handson.md) を参照する。AI-DLCが生成する正式な工程記録は `aidlc/spaces/default/intents/` にある。

## 現在地

- 作業リポジトリ: `C:\Users\temp_admin\.vscode\aidlc-handson`
- ブランチ: `feat/deskflow`（`main` から作成。今回の記録時点で未プッシュ）
- 計画: `deskflow-local-learning`。`classic` を基盤とするDeskFlow専用計画
- AI-DLCの状態ファイルで確認できた進捗: 初期準備3工程は完了、企画フェーズの `intent-capture` が進行中。アプリの実装・起動・テストは未実施
- `aidlc/spaces/default/intents/` にAI-DLCの未追跡ファイルがある。作業中の生成物なので、この記録のために変更・削除していない

## 2026-10-24: 作業ブランチの作成

作業前に `git status --short --branch` で `main` が `origin/main` に追従し、未コミット変更がないことを確認した。続いて次を実行した。

```powershell
git switch -c feat/deskflow
git status --short --branch
```

結果は `## feat/deskflow`。DeskFlowの企画・設計・コードを初期設定済みの `main` から分けて記録するためのブランチで、作成時点ではコミットもプッシュもしていない。

## 2026-10-24: ワークフロー計画の提案と調整

ユーザーがCodex CLIでDeskFlowの企画からローカル運用までを一工程ずつ体験したいと入力した。条件は架空データのみ、AWSへのデプロイと外部公開なし、各承認点で説明を受けて判断すること。AI-DLCは既定プロファイルをそのまま選ばず、専用計画の作成を提案した。ユーザーは専用計画を選択した。

初回案は `deskflow-local-learning`、`classic` 基盤、16ステージと16工程承認点、Depth `standard`、Test Strategy `standard`、レビュー `adversarial`。5時間の利用枠が残り5%未満になったため、計画をすぐに開始せず、枠の更新を待った。モデルはユーザーが GPT-6.1 Sol / Medium に変更した。

更新後、ユーザーは計画の編集を依頼し、レビューを `advisory` に変更した。`advisory` は対象工程で1回レビューし、指摘を人間の承認点に提示する。自動の修正・再レビューの反復はしない。各工程の承認、実装前のコード計画承認、企画からローカル運用までの工程は維持した。

変更後の計画は以下の内容で再提示され、整合性が再検証された。

| 項目 | 適用した計画 |
| --- | --- |
| 基盤と経路 | `classic` 基盤のカスタム計画、初期準備3工程＋体験16ステージ |
| Depth | `standard` |
| Test Strategy | `standard` |
| レビュー | `advisory` |
| 実装前のコード計画承認 | `on` |
| Guard Policy | `off`。各工程の承認待ちは維持 |
| その他 | sensors `on`、learnings `on`、summary confirmation `off`、collaborators `off` |

体験ステージは `intent-capture` → `scope-definition` → `rough-mockups` → `approval-handoff` → `practices-discovery` → `requirements-analysis` → `domain-design` → `units-generation` → `functional-design` → `nfr-requirements` → `nfr-design` → `infrastructure-design` → `code-generation` → `build-and-test` → `observability-setup` → `incident-response`。市場調査、AWS環境構築、デプロイ、公開用パイプラインなどは計画から省いた。

計画選択後に生成された `aidlc-state.md` には `Plan: deskflow-local-learning`、Depth/Test Strategy `Standard`、初期準備3工程完了、`intent-capture` 実行中と記録されている。したがって計画の適用とワークフロー開始は確認できる。ただし、この作業日誌からはユーザーが画面で選んだ承認番号と、モデル変更の具体的な操作時刻までは確認していない。

## 2026-10-24: 目的・利用者の質問と回答方法の選択待ち

`intent-capture` 工程で `intent-capture-questions.md` が作成された。目的、優先する利用者、成功の確認方法、関係者、最初の版で対象外にする機能などを決めるための質問である。Codex画面では、回答方法として `Guide me`、質問ファイルを自分で編集、`Chat`、その他が提示されている。現時点では回答方法も質問への回答も未確定であり、工程承認はまだ行っていない。

一問ずつ意味を理解しながら進める今回の目的には `Guide me` が合う。質問ファイルの内容はAI-DLC側が管理しているので、この作業日誌では直接編集しない。

## 2026-10-24: `intent-capture` の成果物とレビュー

ユーザーは `Guide me` 方式で目的・利用者などの5問に回答した。AI-DLCは `intent-capture-questions.md` に回答を記録し、`intent-statement.md`（目的、優先利用者、成功条件、初期範囲）と `stakeholder-map.md`（関係者）を作成した。

確認できた決定は、過去の問い合わせと回答が点在して同じ質問が繰り返される問題を扱うこと、優先利用者は社内窓口担当者であること、架空データによる3つの成功条件（未対応と担当者の特定、受付から完了までの確認、過去の回答の検索）を置くこと。最初の版では既存アカウントによるログインと社内認証基盤との接続を対象外にした。システムはローカルで体験し、外部公開やAWSへのデプロイはしない。

独立レビューの記録 `reviews/review-01.md` は `READY`、指摘事項なし。Codex画面では、この目的と成功条件を承認して次の `scope-definition` に進むか、修正を依頼するかを尋ねている。この記録時点では承認待ちであり、次工程には進んでいない。

## 次に記録すること

2026-10-24、題材を家の資産管理システムへ変更する可能性を相談したが、ユーザーは社内問い合わせシステムを続けると決めた。既存のDeskFlow計画で質問への回答を進めた。

`intent-capture` の承認判断と次工程の成果を確認したら追記する。以後も各工程で「操作・意味・成果物・確認結果・未決事項」を短く記録する。AI-DLCの `memory.md` や状態ファイルはエンジン管理のため、この日誌から直接編集しない。
