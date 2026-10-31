# DeskFlow：コード生成計画 — u1-deskflow

## Summary

- Builds: 既存DeskFlowを保持し、DBロック時の実経過1秒以内という目標に合わせてSQLiteの内部待機予算を1000msから500msへ短縮する。
- Touches: deskflow/src/server/database.ts、tests/u1-deskflow/database.test.ts、必要な手順説明と成果記録。専用検証データだけを用い、通常DBと残存排他は変更しない。
- Tests: 実DBのロックを使う1秒以内の回帰検査を追加し、既存91例・型/lint/整形/ビルド・全実装行カバレッジ80%以上と補足検査を再確認する。

## Sources

- [Build and TestのBT-01とLoop-back 1](../../build-and-test/test-results.md)：busy_timeout=1000に対し実経過1169ms/1160ms。本人はRetry with fixを選択した。今回の修正範囲と根拠はこの記録と以下のRepair Scopeで定義する。

- [要件](../../../inception/requirements-analysis/requirements.md)：下位FR23件、NFR7件と本人が採用した64KiB追加受入条件。
- [実装単位](../../../inception/units-generation/unit-of-work.md)、[要件割当](../../../inception/units-generation/unit-of-work-story-map.md)：U1のソースはdeskflow/。User Stories工程は省略され、FRで追跡する。
- [機能仕様](../functional-design/functional-spec.md)、[業務ルール](../functional-design/rules.md)、[データ形状](../functional-design/entities.md)。
- [採用技術](../nfr-requirements/tech-stack-decisions.md)、[非機能設計](../nfr-design/logical-components.md)、[安全性](../nfr-design/security-design.md)、[保存・復旧](../nfr-design/reliability-design.md)。
- [環境仕様](../infrastructure-design/infrastructure-specification.md)、[検証・起動手順](../infrastructure-design/cicd-pipeline.md)、[本工程前の本人回答](../infrastructure-design/infrastructure-design-questions.md)。

## Scope and Constraints

現在のブランチでdeskflow/の既存実装を修正する。初回実装と依存導入、通常起動の試行は完了済みで、今回の修正コードはまだ変更していない。以下の初回17手順は完了履歴として保持し、新しい修正はRepair ScopeとStep 18以降に従う。既存のAI-DLC設定や他のアプリを変更しない。コミット・プッシュ・マージ・AWS配備・外部公開を実施しない。

正式起動はNode1プロセスが127.0.0.1:3000でReact配信物とAPIを提供する。ポートだけ変更可。SQLiteは管理側だけが所有する。初回10件、再起動保持、連番、再送受付、版競合、完了と再開、文字比較、20件ページと検索条件復元を実装する。64KiBは変更要求JSON全体の実際のUTF-8サイズで65536バイトを許可、65537バイト以上を拒否し、入力を保持する。

## Files and Responsibilities

| 対象 | 新規作成する主なファイル | 責任 |
|---|---|---|
| プロジェクト設定 | deskflow/package.json、package-lock.json、.gitignore、tsconfig.json、tsconfig.server.json、vite.config.ts、vitest.config.ts、eslint.config.js、.prettierrc.json、.prettierignore、index.html | 版固定、ブラウザー/Nodeの型、ビルド・検証、生成物と.localの除外 |
| 共通定義 | src/shared/types.ts、input-policy.ts | 固定コード、型、前後空白・書記素・比較・送信バイト境界。正式検証はNode側でも実施 |
| 保存 | src/server/database.ts、seed.ts、repository.ts | schema版、3エンティティ、初回10件、受付キー、トランザクション、版照合と再取得 |
| 業務 | src/server/inquiry-service.ts | 登録・担当・状態・回答・再開・一覧検索の判断と結果分類 |
| 実行と保守 | src/server/config.ts、logger.ts、lifecycle.ts、maintenance.ts、main.ts、maintenance-cli.ts | 保存パス・排他・起動停止、世代ログ、停止後コピー・検査・復旧前保全 |
| HTTP | src/server/http-server.ts、request-policy.ts、static-files.ts | ループバック、Host/Origin/本文検証、操作ルート、ヘルス、配信ルート境界 |
| 画面調整 | src/client/main.tsx、App.tsx、api.ts、styles.css、hooks/useNavigation.ts | 同一オリジン通信、画面移動、検索状態、未保存確認、古い応答の抑制 |
| atoms | src/client/components/atoms/Button.tsx、TextInput.tsx、TextArea.tsx、Select.tsx、Label.tsx、StatusText.tsx | 意味のあるHTML、表示値・disabled・操作イベント・フォーカス |
| molecules | src/client/components/molecules/FormField.tsx、SearchControls.tsx、Pagination.tsx、Feedback.tsx | ラベル・入力説明・エラー、検索・ページ・結果通知の組合せ |
| organisms | src/client/components/organisms/InquiryForm.tsx、InquiryTable.tsx、InquiryDetails.tsx、ResponseEditor.tsx | 登録、一覧、問い合わせ参照、対応編集のまとまり |
| templates / pages | src/client/components/templates/PageLayout.tsx、src/client/pages/EntryPage.tsx、RegisterPage.tsx、ListPage.tsx、DetailPage.tsx | 配置とW0〜W3の調整。取得正式値と編集値・期待版を分離 |
| テスト | tests/u1-deskflow/database.test.ts、repository.test.ts、service.test.ts、input-policy.test.ts、runtime.test.ts、http.test.ts、ui.test.tsx、workflow.test.ts、tests/setup-dom.ts | 下記の単体・結合・UI操作の確認。設定ファイルは実装カバレッジから除外 |
| 手順 | deskflow/README.md | 導入、検証、起動停止、バックアップ復旧、データ位置、64KiBとNode APIの制約 |

上記の相対src/・tests/はdeskflow/内。原則はこの一覧に沿い、機能を増やさず必要な小さな同責任ファイル分割だけを許容する。全作成・変更パスは実装後のsource-manifest.jsonで記録する。UIを別プロジェクトや別起動単位へ分割しない。

## Dependencies and Runtime

| 依存 | 用途 | 導入範囲 |
|---|---|---|
| react、react-dom | 4画面とAtomic DesignのReact部品 | アプリの実行依存 |
| typescript、@types/node、@types/react、@types/react-dom | 型チェックとNodeのコンパイル | 開発依存 |
| vite、@vitejs/plugin-react | React/TypeScriptとCSSのビルド | 開発依存 |
| vitest、@vitest/coverage-v8 | 有限時間の単体・結合・カバレッジ | 開発依存 |
| @testing-library/react、@testing-library/dom、@testing-library/user-event、@testing-library/jest-dom、jsdom | 利用者に見えるReact操作とDOMの確認 | 開発依存 |
| eslint、@eslint/js、typescript-eslint、eslint-plugin-react-hooks、eslint-plugin-react-refresh、globals、prettier | TS/Reactの静的確認・整形 | 開発依存 |
| node:http、node:sqliteと他のNode標準機能 | HTTP・SQLite・ファイル・暗号学的識別子 | Node組込。SQLiteサーバーやネイティブアドオンは追加しない |

導入前に用途を説明する。現在確認済みのNodeはv24.14.0で、node:sqliteは開発中APIである。導入時にそのNodeと互換な各パッケージの公開版を確認して具体的な版へ固定し、lockfileを記録する。無条件のlatest追従やグローバル追加、Nodeの無断更新はしない。互換性に問題があれば内容を説明して計画を見直す。追加のUI/状態管理/DB/サーバー用フレームワーク、クラウドの依存は導入しない。

## Ordered Implementation Steps

- [x] Step 1: プロジェクト設定と共通型の足場を作り、用途を説明して必要な依存をプロジェクト内へ導入する。ルート.gitignoreは変更せずdeskflow/.gitignoreで.local・dist・coverage・node_modulesを除外する。対象：設定、types.ts。根拠：U1、NFR3・NFR5。
- [x] Step 2: Vitestのu1-deskflowという名前のプロジェクト、tests/u1-deskflow/だけのinclude、Node標準環境とUIファイルのDOM環境、V8カバレッジ、テスト設定を用意する。最初の層テスト前にrunnerが実行可能であることを確認する。根拠：NFR5.1〜NFR5.3。
- [x] Step 3: database.ts・seed.tsを実装する。schema版、3エンティティ、制約、DELETE/FULL・外部キー・1000ms待ち、初期10件と完了記録、起動時整合性を扱う。根拠：FR1.3・FR6・FR7、NFR2。
- [x] Step 4: 実装後にdatabase.test.tsを書いて実行する。新規10件、再投入なし、初期化失敗、不明版、設定・参照検査と再オープンを確認する。根拠：FR6・FR7.1、NFR2・NFR6。
- [x] Step 5: repository.tsを実装する。受付キーと内容指紋、番号採番、問い合わせと受付の一括保存、期待版付き更新、整合した読取を扱う。根拠：FR1.4・FR4・FR7。
- [x] Step 6: 実装後にrepository.test.tsを書いて実行する。同じキー再送・異内容キー競合・別キー同内容・版競合・一括取消・再起動の値を確認する。根拠：FR1.4・FR7.1〜FR7.3。
- [x] Step 7: input-policy.ts・inquiry-service.tsを実装する。文字数と比較・固定値、状態遷移、未割当完了、再開保持、変更なし、検索・安定ソート・ページを扱う。根拠：FR1〜FR5、BR1.1〜BR5.2。
- [x] Step 8: 実装後にservice.test.ts・input-policy.test.tsを書いて実行する。正常系に加え空白・長さ・結合文字・禁止遷移・完了編集・検索5項目と状態条件・0/20/21件を確認する。根拠：FR1〜FR5・FR7、NFR3。
- [x] Step 9: config.ts・logger.ts・lifecycle.ts・maintenance.ts・CLIを実装する。固定保存先、保守排他、正常停止後コピー、新規コピー検査、原本保全、限定世代ログと失敗の分離を扱う。根拠：NFR6・NFR7。
- [x] Step 10: 実装後にruntime.test.tsを書いて実行する。排他衝突、無効設定、停止未完了、コピー衝突/失敗・検査、原本保全、ログ安全性・容量・書込失敗を一時保存先で確認する。根拠：NFR3・NFR6・NFR7。
- [x] Step 11: request-policy.ts・http-server.ts・static-files.ts・main.tsを実装する。JSON操作と読取、同一Origin/Host/独自ヘッダー、65536バイト上限、5秒受信、配信ルート、ヘルスを扱う。根拠：FR全操作、NFR3・NFR2.5。
- [x] Step 12: 実装後にhttp.test.tsを書いて実行する。正常操作、不正入力・外部Origin・過大本文・65536/65537境界・パス脱出・DB障害・応答不明を確認する。根拠：FR7・FR8、NFR3。
- [x] Step 13: Reactの5層と4画面、api.ts・画面調整・CSSを実装する。登録結果と別件空フォーム、検索条件保持、対応・完了・再開、入力保持、競合比較、未保存移動、10秒待機、文字通知・キーボード・拡大を扱う。インタラクティブ要素にdata-testidを付ける。根拠：FR1〜FR5・FR8、NFR4。
- [x] Step 14: 実装後にui.test.tsxを書いて実行する。2コンポーネントそれぞれに5〜8例を最低の目安とし、重要な分岐は追加する。ラベルから操作し成功・入力不備・通信失敗・競合・0件・未保存・再開と画面の送信サイズ検査を確認する。根拠：FR8と主要操作、NFR4・NFR5。
- [x] Step 15: workflow.test.tsで登録→対応→完了→検索→再起動・参照の管理側一貫経路と主要HTTP境界を確認する。Reactとの境界はUI試験とブラウザー確認で補う。独立100件の性能検証データの準備方法を用意する。根拠：全FR、NFR1・NFR2。
- [x] Step 16: 型・lint・整形・ビルド・テスト・カバレッジの予定スクリプトを完成させ、unit-test-instructions.mdの正確なコマンドで有限時間の検証を実行する。全手書き実装TS/TSXの行80%以上を満たし、不足はテスト追加で解消する。根拠：NFR5。
- [x] Step 17: READMEに導入・検証・起動・停止・再起動・保存先・コピー検査・本人判断後の復旧と制約を記載する。code-summary.md、traceability.json、source-manifest.jsonを実際の実装・実行結果に基づき作成し、本計画の完了した手順だけをチェックする。根拠：全FR・NFR、後工程への引き継ぎ。

通常起動と実際のバックアップ・復旧は、テスト結果を説明した後の本人判断を待つ。自動テストが使う一時サーバーはループバックかつ専用データで終了する検証処理であり、演習アプリの常時起動は行わない。

## Test and Acceptance Boundaries

## Repair Scope — Loop-back 1

今回の変更はBT-01だけ。NFR2.5のDBロック待ち上限は1秒のまま維持し、SQLiteネイティブの待機予算を500msにして実行時の余裕を確保する。500msは内部実装の予算であり、品質目標の緩和や新たな成功条件ではない。OSの長い停止まで絶対保証するものではなく、実際の経過時間を計測して1秒超過は未達と報告する。短時間の競合でも従来より早く再試行案内になる可能性がある。

新規依存は導入せず、既存runnerでtest-afterを維持する。再試行の自動追加、保存成功の偽装、SQLの途中保存は行わない。通常データのoperation.lock、既存DB、バックアップは変更しない。受入済みR-01〜R-03とブラウザー接続の不具合は今回の修正対象に含めない。見積は実装・検証・再レビュー30〜60分程度、追加費用0。

- [x] Step 18: 既存実装・テスト・目標を読み、database.tsの内部待機予算を500msへ変更する。削除・schema変更・トランザクション方式の変更はしない。根拠：BT-01、NFR2.5。
- [x] Step 19: 実装後にdatabase.test.tsへ実際の2接続のロック回帰検査を加える。1接続が書込ロックを保持し、他方の書込が1秒以内に拒否され、部分保存がなく、解除後の明示操作が成功することを確認する。単に設定値だけを検査せず、実経過時間を測る。根拠：NFR2.3・NFR2.5。
- [x] Step 20: 単位全体のテスト・V8カバレッジと型/lint/整形/ビルドを実行し、既存91例を維持する。行80%以上の対象と母数を狭めない。補足の実DBロック計測も更新し、1秒を超えれば失敗のまま報告する。根拠：NFR5、BT-01。
- [x] Step 21: unit-test-instructions.md、READMEの必要な説明、code-summary.md、traceability.json、source-manifest.jsonを実際の変更・検証に合わせる。初回91例と今回追加例、通常データと専用データ、未実施のブラウザー/保守を区別する。根拠：変更の追跡と手順の再現。
- [x] Step 22: 現在の修正結果を新たにレビューへ渡す。対象Unitの検証・完了承認後にBuild and Testへ戻り、結果と38目標表を更新する。Loop-Back Logは追記履歴のまま保持する。根拠：今回の修正と再検証。

## Repair Verification Commands

- DB層：`npm --prefix deskflow run test:unit -- --project u1-deskflow tests/u1-deskflow/database.test.ts`
- 一括：`npm --prefix deskflow run verify`
- 補足：`node aidlc/spaces/default/intents/261024-deskflow-local-learning/.aidlc-engine/verify-build-runtime.mjs`

補足処理の旧1000ms設定を期待する設定検査は500msへ合わせるが、実経過時間の合格条件は1000ms以下のまま変更しない。通常の保存先には触れず、実行ごとの専用保存先を使う。

テストは先に計画・runnerを準備し、各層を実装した後にその層のテストを書いて実行する。詳細なケースと正確なコマンドは[unit-test-instructions.md](unit-test-instructions.md)。約50〜70例は計画時の目安であり、実装とカバレッジを確認して必要な例を増やす。目標や対象範囲を減らして通過させない。

NFR4の実ブラウザーのキーボード・200%拡大、NFR1の画面全体2秒目標、通常起動と停止後バックアップ復旧の実地確認は別の証跡として後続で確認する。自動テスト成功だけで実施済みとみなさない。64KiB追加受入条件は本人指示により関連仕様へ反映済みで、旧レビューの文書を現在の仕様と取り違えない。

## Assumptions & Open Questions

None. 選択済みの仕様をこの順序で実装する。依存の具体的な版は互換性確認後に固定し、設定の差が必要なら本人に説明する。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "私たちは各テスト可能な層を実装してから、その層のテストを書いて実行する。",
  "scope": "classic",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: 本工程Q3で本人がAを選び、各層を実装してからその層のテストを書いて実行する方法を選択した。\n- **Ordering**: 私たちは各テスト可能な層を実装してから、その層のテストを書いて実行する。\n- Test Strategyは承認済みのStandardを維持し、単体テストと主要な境界の結合テストを扱う。\n- classicに適用される行カバレッジ80%以上の下限を維持する。目標を満たすために適切なテストを追加し、通過させるための目標引き下げは行わない。\n- 統合前の自動検証と、構成に応じた整形・静的チェックを維持する。今回は独立したホスト型CI構築が対象外のため、ローカルで再実行できる検証コマンドを設計する。マージを実施する場合は、その前に必要な検証を通す。\n- テストの具体的な道具・コマンド・対象コードは、技術構成と要件が決まってから定義する。既存のアプリ用テスト基盤があるとは扱わない。\n- 根拠：[本工程Q3：A](practices-discovery-questions.md)、`aidlc/spaces/default/memory/org.md#Testing Posture`、選択中の計画・状態。"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:d53ca8f07a66d85c837a2a009c4d01daf783d207d462873b9e2da1d062673dfa",
  "contract_sha256": "sha256:a8197c8fec5ab244ec585b95af014030db73c4b8aded6f6c7187d3f2c3b3e067"
}
```
