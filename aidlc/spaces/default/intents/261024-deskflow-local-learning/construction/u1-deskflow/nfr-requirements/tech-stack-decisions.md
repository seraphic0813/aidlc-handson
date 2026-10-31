# DeskFlow：採用技術と品質確認の判断

## Sources

- [本工程の回答](nfr-requirements-questions.md)：Q1「X React+SQLiteを使う。画面はhtml/cssとtypescript、アトミックデザインを採用。」、Q2=A、Q3=A。
- [実装単位](../../../inception/units-generation/unit-of-work.md)、[機能仕様](../functional-design/functional-spec.md)。
- [React公式：構成を自分で作る場合](https://react.dev/learn/build-a-react-app-from-scratch)、[Vite公式](https://vite.dev/guide/)。
- [Node.js 24.14.0 SQLite公式](https://nodejs.org/download/release/v24.14.0/docs/api/sqlite.html)。
- [Atomic Design原典](https://atomicdesign.bradfrost.com/chapter-2/)。
- [Vitestカバレッジ](https://vitest.dev/guide/coverage.html)、[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)。

## Selected Stack

| 対象 | 採用・設計判断 | 根拠・制約 |
|---|---|---|
| 画面 | React、TypeScriptのTSX、HTMLの意味構造、通常のCSS | 本人Q1。Python・Flask案を採用したとは扱わない |
| UI構成 | Atomic Designのatoms・molecules・organisms・templates・pages | 本人Q1。既存W0〜W3と画面側の所有責任を維持し、業務判定はサーバー側に置く |
| ビルド | ViteのReact/TypeScript構成 | React公式が案内する構成の1つ。ビルド済み静的画面を同じローカルアプリから配信する |
| ローカル管理側 | Node.js＋TypeScript、Node標準HTTP機能 | ブラウザーからSQLiteを直接操作せず、正式保存と業務ルールを同じ言語で実装。現在確認した実行環境はNode v24.14.0 |
| 保存 | Nodeのnode:sqliteを使うローカルSQLiteファイル | 別DBサーバーとネイティブアドオンの追加を避ける。24.14.0公式ではStability 1.1の開発中API。製品として安定済みとは扱わず、実行版固定と境界テストで確認する |
| 文字 | JavaScriptのIntl.Segmenterで書記素数、NFKCと大小文字を区別しない比較 | 承認済みの文字規則をブラウザーとNodeで一致させる。入力比較の境界例を両側でテストする |
| 検証 | Vitest＋V8カバレッジ、React Testing LibraryとDOM環境、TypeScriptの型チェック、ESLintとPrettier | 業務・保存境界・Reactの操作を検証。必要なパッケージはコード計画で具体化し導入前に目的を説明する |

新規依存は未導入。実装時にReact・Vite・検証ツールの互換バージョンを確認し、package.jsonとlockfileへ固定する。既存Nodeを無断で更新しない。node:sqliteの採用はこの演習規模の判断であり、大規模運用の推奨を意味しない。正式起動ではNode1プロセスが静的画面と内部の同一オリジンHTTP操作を提供する。Vite開発サーバーを別に使う場合は開発専用で、通常起動を2プロセス必須に変えない。

## Atomic Design Mapping

| 層 | 例と責任 |
|---|---|
| atoms | Button、Input、Label、StatusText。意味のあるHTML要素とフォーカス・無効状態を扱う |
| molecules | FormField、SearchControls、Pagination。ラベル・エラー・操作を組み合わせる |
| organisms | InquiryForm、InquiryTable、ResponseEditor。画面のまとまった入力・結果を表示する |
| templates | 共通ページ枠、一覧・詳細の配置。業務データを直接保存しない |
| pages | W0入口、W1登録、W2一覧検索、W3詳細。取得・遷移・未保存状態・結果の調整を行う |

この表は次の技術設計でReact構成へ落とす対応であり、機能設計の画面と業務ルールを変更しない。小さい部品すべてに不要なラッパーを増やさず、層は責任で分類する。Atomsから業務APIやSQLiteを呼ばない。

## Testability Requirements

| ID | 要件と達成条件 | 確認方法 |
|---|---|---|
| NFR5.1 | test-afterで各層の実装後に単体・主要境界の結合テストを行う。両コンポーネントに正常系と2つ以上の異常・境界例を含める | 入力・状態・文字比較・再送・競合・初期化・保存中断・画面の入力保持を対応するテストで確認 |
| NFR5.2 | アプリの全手書き実装コードについて行カバレッジ80%以上を満たす | フロントと管理側のTS/TSX、起動・配信・ログ・保守の実装も含める。未実行の実装ファイルも母数に含む。部品の見た目だけのテストや常に成功するテストで代用しない |
| NFR5.3 | 型チェック・lint・整形確認・ビルド・テスト・カバレッジをローカルで再実行できる | ソースdeskflow/のコード計画で実際のコマンドを定義。クリーンな依存導入から再現する |

カバレッジ除外は依存物、生成したdist、テスト自身、型宣言のみのファイル、ビルド・検証ツールの設定に限定し理由を記録する。HTML/CSSは行カバレッジの計算対象外とし、画面確認で補う。業務ロジック・配信経路・保守コードを通過目的で除外しない。ブラウザーでのキーボード・拡大・操作時間の確認も別途行い、カバレッジ数値だけで受入済みとしない。

## Alternatives and Consequences

本人指定に従いReact＋SQLiteを採用し、Flaskによるサーバー描画案は採用しない。SPAのビルドと同一オリジンの操作境界が必要になるが、正式起動は1アプリのままとする。ブラウザー内SQLiteのみの案は、保存側の検証・再起動保持・バックアップを中央で担う既存設計に合わないため採用しない。外部DB・認証基盤・UIライブラリ・クラウドは今回追加しない。

## Assumptions & Open Questions

None. Node標準HTTP・Vite・検証ツール・node:sqliteは本人の指定を実現するための設計選択。本人の直接回答とは区別し、実装前のコード計画で具体化する。
