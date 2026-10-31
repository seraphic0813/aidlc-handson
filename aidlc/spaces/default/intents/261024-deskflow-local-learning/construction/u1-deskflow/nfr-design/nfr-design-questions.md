# DeskFlow：非機能設計の質問

## Sources

- [採用技術](../nfr-requirements/tech-stack-decisions.md)：本人指定のReact＋SQLite、HTML/CSS＋TypeScript、Atomic Design。
- [保存・復旧の要件](../nfr-requirements/reliability-requirements.md)：通常保存とバックアップの区別、実施タイミング、復旧の本人判断。
- [性能](../nfr-requirements/performance-requirements.md)、[安全性](../nfr-requirements/security-requirements.md)、[容量](../nfr-requirements/scalability-requirements.md)、[ログ](../nfr-requirements/observability-requirements.md)。
- [機能仕様](../functional-design/functional-spec.md)。
- [Node.js 24.14.0の公式バックアップ機能](https://nodejs.org/download/release/v24.14.0/docs/api/sqlite.html#sqlitebackupsourceDb-path-options)。

## 引き継ぐ設計条件

Reactの表示側とNodeの管理側を同じアプリに含め、SQLiteの正式記録は管理側だけが扱う。Atomic Designは画面側の構成へ反映する。単独起動、ループバック限定、全26項目の品質条件を維持する。

1人・100件の範囲では分散キャッシュ・外部監視・自動水平拡張を追加せず、短い保存処理、版照合、処理結果に応じた画面状態、容量上限付きログで具体化する。技術上の詳細は設計として記録し、本人回答と区別する。

## Q1：バックアップ時にアプリを停止する進め方でよいですか？

バックアップのタイミングは演習終了時・保存先に影響する保守作業前と決定済みです。整合性のあるコピーを作るための操作を決めます。どちらも既存のコピーを無断で上書きせず、復旧の実施は本人判断を待ちます。

A. アプリを正常停止し、保存接続が閉じたことを確認してから日時付きのコピーを作る（推奨）。演習は一時停止するが、コピー時点を確認しやすい。未完了の停止や整合性未確認のコピーを成功扱いしない。
B. アプリを起動したまま、SQLiteの専用バックアップ機能で整合したコピーを作る。単純なファイルコピーでは行わず、完了・失敗と作成先を確認する保守処理を用意する。
X. Other (please specify)

[Answer]:A

## 回答後の具体化

回答を受け、保存のトランザクション境界、同一オリジンの通信と検証、ReactのAtomic Designによる画面責任、キャッシュを持たない読取、競合・タイムアウト回復、ログ切替と障害時の振る舞いを設計文書にまとめる。アプリの実装、パッケージ追加、バックアップ実操作はこの質問への回答だけで実施しない。

各 `[Answer]:` にA/B、またはXと希望内容を記入し、会話で「完了」と伝えてください。
