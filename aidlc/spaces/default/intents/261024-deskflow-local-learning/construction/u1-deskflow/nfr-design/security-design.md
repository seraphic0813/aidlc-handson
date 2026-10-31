# DeskFlow：安全性の設計

## Sources

- [安全性の要件](../nfr-requirements/security-requirements.md)：NFR3.1〜NFR3.6。
- [機能仕様](../functional-design/functional-spec.md)、[採用技術](../nfr-requirements/tech-stack-decisions.md)。
- [Node HTTP公式](https://nodejs.org/download/release/v24.14.0/docs/api/http.html)、[Node SQLite公式](https://nodejs.org/download/release/v24.14.0/docs/api/sqlite.html)。

## S1：同一オリジンと要求の入口

本文上限は[ローカル実行環境Q2=A](../infrastructure-design/infrastructure-design-questions.md)で本人が採用した追加受入条件。JSON本文全体の実際のUTF-8表現を数え、65536バイトちょうどを許可し、65537バイト以上を拒否する。文字数条件内でも拒否される例外を要件・BR1.1/BR3.2・機能仕様・画面案内・境界テストへ反映する。

NFR3.1・NFR3.4を実現する。Nodeは127.0.0.1だけで待ち受け、Reactのビルド済み画面と内部APIを同じホスト・ポートから提供する。Hostは設定した127.0.0.1とポートの組だけを許可し、任意のHostや転送ヘッダーから公開先を決めない。

変更要求はPOSTのJSONとして受け、Content-Type、同一Origin、独自ヘッダーX-DeskFlow-Request: 1を必須とする。Origin欠落・不一致も拒否し、GETは読取専用とする。CORSの許可ヘッダーを出さず、別サイトからのプリフライトを許可しない。Fetch Metadataがある場合はcross-siteも拒否する。これは本人認証ではなく、外部ページからの意図しない書込を抑える境界である。テスト用の直接要求も同じ検証を通す。

ヘッダー読込と本文受信の上限をそれぞれ5秒に設定し、JSON本文はUTF-8で64KiBを上限とする。ヘッダー総量16KiB、受付番号・状態・操作キー等は書式と長さを検証する。64KiBは書記素上限と別の安全上限として扱い、超過は黙って切らず入力保持と案内を行う。最大書記素内でも異常に多い結合文字等で上限に達し得ることを入力エラーで説明する。

## S2：正式検証と保存

NFR3.2・NFR3.3を実現する。TypeScriptの型だけで実行時入力を信用せず、管理側の境界でJSONの形、許可した項目、文字列の型、固定値、期待版、キーを検証する。前後空白除去・Intl.Segmenterによる書記素数・状態遷移・完了条件は同じ業務関数に集約する。ブラウザーは入力補助で同じ比較仕様を使うが、判定の正本は管理側とする。

SQLの値はパラメーター付きの文に渡す。テーブル名・列名・並び順を入力から連結しない。SQLite拡張のロードは許可せず、外部ファイルの取り込み機能は設けない。Nodeの組込APIは実行版に固定し、業務処理から薄い保存境界を介して呼ぶ。

## S3：表示・配信・データ配置

NFR3.3・NFR3.5を実現する。Reactのテキスト描画を用い、dangerouslySetInnerHTMLや入力由来のHTML構築を行わない。通常起動では外部CDN・外部フォント・インラインスクリプトを使わず、Content-Security-Policyでdefault-srcをself、object-srcとframe-ancestorsをnone、base-uriをnone、connect-srcをselfに限定する。X-Content-Type-Options: nosniff、Referrer-Policy: no-referrerも設定する。動的インラインstyleに依存しないCSSを用いる。

静的配信はビルド済みの公開ディレクトリだけを対象とし、正規化したパスと実体パスの双方が配信ルート内にあることを検証する。URLデコード失敗、親ディレクトリ参照、シンボリックリンク経由の脱出は拒否する。DB・ログ・バックアップは配信ルートの外、Gitの対象外に置き、物理パスを利用者エラーへ出さない。

## S4：演習の識別と非対象

NFR3.6を実現する。全画面の共通枠で架空データのローカル演習と分かる表示を保ち、社員・窓口入口は認証ではないと説明する。外部公開、実在利用者の情報隔離、社内認証、TLS配備、DB暗号化基盤、秘密情報保管基盤は追加しない。OSのユーザー権限を前提とする演習であり、悪意ある同一PCの管理者まで防御する保証をしない。

## S5：検証と残る制約

直接要求による型不正・禁止遷移・不正Origin/Host・過大本文・SQL記号をテストし、問い合わせの保存値が変わらないことを確認する。HTML例は文字として表示され、DBパスのURLやルート外パスが取得できないことを確認する。ログに要求本文や入力値を埋め込まない。

64KiB上限は異常入力で資源を使い切らないための設計上の制限であり、通常の日本語2000文字を収容する。実装時に最大長テストと併せて確認し、制限に起因する入力エラーは説明する。パッケージの版は導入時に互換性を確認し、監査結果を記録する。現時点ではコードや依存を追加していない。

## Assumptions & Open Questions

None. セキュリティ制御は上位要件を実装可能にする設計であり、本人認証や本番用保証を意味しない。
