# DeskFlow：ビルドとテストの結果

## Sources

- [コード計画とTesting Contract](../u1-deskflow/code-generation/code-generation-plan.md)、[単位テスト指示](../u1-deskflow/code-generation/unit-test-instructions.md)、[実装結果](../u1-deskflow/code-generation/code-summary.md)。
- [性能・操作性](../u1-deskflow/nfr-requirements/performance-requirements.md)、[保存・復旧](../u1-deskflow/nfr-requirements/reliability-requirements.md)、[安全性](../u1-deskflow/nfr-requirements/security-requirements.md)、[容量](../u1-deskflow/nfr-requirements/scalability-requirements.md)、[ログ](../u1-deskflow/nfr-requirements/observability-requirements.md)、[テスト可能性](../u1-deskflow/nfr-requirements/tech-stack-decisions.md)。
- [非機能設計](../u1-deskflow/nfr-design/logical-components.md)、[本人回答](build-and-test-questions.md)。

## Overall Result

**工程の結果：未達・未確認があるため成功ではない。** ビルドと既存91例は成功したが、補足の実行可能な目標検査はDB待機時間が超過して終了コード1。目標表はMet 18件、Not Met 5件、Unverified 14件、N/A 1件。Pendingは残していない。Unitで受入済みの3指摘も不一致として保持する。

## Command Results

| コマンド/確認 | 結果 |
|---|---|
| npm --prefix deskflow ci | 終了0、242 packages導入、243監査、脆弱性0 |
| npm --prefix deskflow run verify | 制限内はbuildのspawn EPERMで終了1。必要権限で同じコマンドを再実行し終了0 |
| npm --prefix deskflow run test:unit -- --project u1-deskflow | 制限内はspawn EPERMで終了1。必要権限で再実行して終了0、9ファイル91例成功 |
| node aidlc/spaces/default/intents/261024-deskflow-local-learning/.aidlc-engine/verify-build-runtime.mjs | 最終終了1。5検査群中4成功、DBロック時間1未達。補足検査は既存91例へ加算しない |
| aidlc engine sensor-traceability --stage build-and-test | pass=true、FR23＋上位NFR7、uncovered=[]。機能の達成を保証する検査ではない |

カバレッジ実行は10:58 JST、単体実行は10:59 JST（2026-10-25）。同じ91例を2回実行したことを182例とは数えない。failed 0、skipped 0（既存Vitestスイート）。補足目標検査の未達は別に報告する。

## Coverage Evidence

V8：行92.08%（582/632）、statements91.10%（604/663）、branches85.46%（447/523）、functions87.79%（151/172）。実行コマンドは上記verify、レポートは[JSON概要](../../../../../../../deskflow/coverage/coverage-summary.json)と[HTML](../../../../../../../deskflow/coverage/index.html)。

[設定](../../../../../../../deskflow/vitest.config.ts)はsrc/**/*.ts、src/**/*.tsxを母数に含め、型宣言だけ除外。依存・生成物・テスト・構成はsrc外で母数外。未実行client/main.tsx（0/2行）も含む。手書き実装内にcoverage-ignore pragmaを追加しておらず、対象を狭めたり80%閾値を下げたりしていない。HTML/CSSは行計測対象外で実表示確認が別途必要。

## Operational Evidence and Limitations

- 通常の `npm --prefix deskflow start` は127.0.0.1:3000で起動。GET / と /api/health は200。ヘルスrequestIdはc5703784-7682-4649-9b40-7480580d57c5。待受確認のGet-NetTCPConnectionは制限内で権限不足、必要権限で127.0.0.1、PID33196を確認した。
- ブラウザー接続（cua_repl、およびComputer Useのnode_repl）は双方 `failed to start Node runtime: 指定されたパスが見つかりません。 (os error 3)`。Chrome/Edgeの版取得、画面操作、キーボード・200%・20回の画面性能測定は未実施。DOMとHTTPの成功を代替の実証にしない。
- コマンド実行セッションへの中断入力後、通常起動は終了1。shutdownログ/stopped.jsonがなく、deskflow/.local/state/operation.lockが残った。PID33196の不存在を確認し、DBを読取専用でintegrity_check=ok、foreign_key_check=[]、問い合わせ10件と確認した。排他記録・DBは保全し、残存記録を無断で解除していない。通常データのバックアップ・復旧は未実施。
- 補足検査は通常DBと別のbuild-runtime-valuD5保存先（deskflow/.local/verification/内）。100件と5ページ目20件を同じビルド済みアプリで提供。同キー同時登録の201/200は同じDF-000101、同版同時更新は200/409。SQL記号とscript文字列は値のまま保持。画面上のスクリプト非実行を検証したとは扱わない。
- 同じ補足起動でstop後のstopped.jsonと排他解除、再起動後101件・版2・入力保持、再度stopを確認。HTTPサーバーとDBは終了済み。12行の構造化ログに検証入力のDROP TABLE文字列は含まれなかった。通常CLIのCtrl+Cとは経路が異なる。

## Failures and Diagnosis

### BT-01：DBロック待機時間

NFR2.5はDBロック待ち1秒以内。独立DBに別接続でBEGIN IMMEDIATEを保持し、openDatabaseで開いた接続のBEGIN IMMEDIATEを計測した。busy_timeoutは1000だが初回1169ms、最終1160msで例外になる。目標1000ms超過としてNot Met。検査の初版は測定の妥当性だけを判定したが、最終版は1000msを判定条件として終了1にした。緩い判定の初版を目標達成の証拠に使わない。

根本原因の候補はcode-generationで採用したSQLiteネイティブ待機1000msを、そのまま実経過1秒の上限として扱ったこと。候補修正はネイティブ待機の予算に余裕を設け、保存拒否/入力保持を維持した実測回帰検査を追加する。見積：実装・検証・再レビュー30〜60分程度、追加費用0、短い競合でも早めに再試行案内になるリスク。実装前に新しいコード計画承認が必要。目標は1秒のまま維持する。

### BT-02：未確認の実地条件と環境

ブラウザー接続が起動できず、性能・アクセシビリティ実表示等の証拠がない。通常CLIの中断は正常停止にならず残存記録を保全中。これらはDB待機のコード修正では解消せず、操作接続の復旧と、残存記録を扱う本人判断・安全な停止方法の検証が必要。復旧の所要時間はこの実行環境から確定できず、追加費用は現時点0。実地操作には通常データを変更するリスクがあるため対象を再提示する。

## Target Verification Matrix

Sourceの短いファイル名はu1-deskflow/nfr-requirements/内、../で始まるものは同じUnit内の設計・機能・コード計画の節。各条件はSourcesからたどれる。後続のperformance-validation工程は計画にない。未確認を将来の検証に成功裏に延期したとは扱わない。

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| NFR1.1 | performance-requirements.md | 100件・主要4操作×5回、各2秒以内 | 実ブラウザー未接続、20回の画面測定なし | 性能手順・ブラウザー接続のos error 3 | build-and-test | Unverified |
| NFR1.2 | performance-requirements.md | 20件ページ、0/1/20/21/100件、検索5項目と条件・戻りの整合 | 0件/条件1件/21件分割、100件の5ページ目20件 | service.test.ts・workflow.test.ts・補足integrated-100 | build-and-test | Met |
| NFR1.3 | scalability-requirements.md | 1人100件、Node1プロセスが画面/API/単一SQLiteを提供 | 同じアプリの単独Node/SQLite・ループバック配信、開始100件 | 補足integrated-100・config/main.ts | build-and-test | Met |
| NFR2.1 | scalability-requirements.md | 同版2更新は片方だけ確定、入力保持、同キー並行登録は1件 | 並行登録200/201で1件、同版更新200/409。再開後の入力保持に受入済みR-01 | 補足parallel-receipt-update-and-literal-SQL・既存レビュー | build-and-test | Not Met |
| NFR2.2 | reliability-requirements.md | 成功した登録・更新・再開の通常停止/再起動後の保持 | 独立保存先でアプリstop/restart後101件・版2を保持、完了再開はworkflowで確認 | 補足application-stop-restart・workflow.test.ts（通常CLI停止はD-R3参照） | build-and-test | Met |
| NFR2.3 | reliability-requirements.md | 受付/問い合わせ、版と対応、初期化の不可分保存 | 受付保存/初期化の途中失敗を取消、版と変更なし、保存設定確認 | repository.test.ts・database.test.ts | build-and-test | Met |
| NFR2.4 | reliability-requirements.md | 失敗を0件/成功にせず、応答喪失後の同キー再送で1件 | UI結果不明と同キー再送は成功。確定後に応答を喪失する実通信の注入は未実施 | api/ui/repository/http試験（部分的証拠） | build-and-test | Unverified |
| NFR2.5 | reliability-requirements.md | 画面10秒・DBロック1秒、変更自動再送なし | 画面10秒試験成功。DB busy_timeout=1000だが実測1160ms（初回1169ms） | api.test.ts・補足sqlite-lock-wait | build-and-test | Not Met |
| NFR3.1 | security-requirements.md | 127.0.0.1だけで待受 | 通常起動の待受127.0.0.1:3000、補足起動も127.0.0.1 | Get-NetTCPConnection・補足integrated-100 | build-and-test | Met |
| NFR3.2 | security-requirements.md | 型/必須/文字数/選択肢/状態/版/キーをNodeで検証 | 不正型・上限・Unicode・状態・期待版・キー拒否 | input-policy/service/http試験 | build-and-test | Met |
| NFR3.3 | security-requirements.md | 任意HTML実行なし・SQL値をパラメーター化 | SQL記号は値のまま保存・DB維持。Reactはテキスト描画だが実ブラウザーでHTML非実行を未確認 | 補足literal-SQL・Reactソース（部分的証拠） | build-and-test | Unverified |
| NFR3.4 | security-requirements.md | Host/Origin/独自ヘッダー/JSON検証・GET不変・CORSなし | 不正Host/Origin/ヘッダー/JSONを拒否、GETは読取、CORS許可なし | http.test.ts・request-policy/http-server.ts | build-and-test | Met |
| NFR3.5 | security-requirements.md | DB/ログ/コピーを配信/Gitから除外、ルート脱出拒否 | 通常データとURL・親参照拒否確認。シンボリックリンク実体パス脱出の実行試験はなし | http.test.ts・static-files.ts・.gitignore（部分的証拠） | build-and-test | Unverified |
| NFR3.6 | security-requirements.md | 演習入口は認証ではない、架空データのみ | 共通枠の演習案内、架空seed/fixture、認証なし | PageLayout.tsx・EntryPage.tsx・seed.ts・テスト入力 | build-and-test | Met |
| NFR4.1 | performance-requirements.md | 実ブラウザーでキーボード主要経路・見えるフォーカス | ブラウザー操作接続が起動できず未実施 | ブラウザー接続2方式ともNode runtimeパス不在 | build-and-test | Unverified |
| NFR4.2 | performance-requirements.md | 見えるラベル・エラー関連・文字通知、実ブラウザー確認 | DOM15例成功、実ブラウザーで通知/フォーカスは未確認 | ui.test.tsx・ブラウザー接続エラー | build-and-test | Unverified |
| NFR4.3 | performance-requirements.md | 200%拡大・4画面・上限長入力で操作可能 | 200%実表示と上限長4画面は未確認 | ブラウザー接続エラー | build-and-test | Unverified |
| NFR5.1 | tech-stack-decisions.md | test-after、両コンポーネントに正常と2つ以上の異常境界・主要結合 | 既存9ファイル91例成功、実DB/HTTPとReact正常・複数異常境界 | 本工程test:unitとverifyの出力・上流の層ごと実装記録 | build-and-test | Met |
| NFR5.2 | tech-stack-decisions.md | 全手書き実装TS/TSXの行80%以上・未実行も母数 | V8全手書きTS/TSX行92.08%（582/632）、目標80%以上 | deskflow/coverage/coverage-summary.json・vitest.config.ts | build-and-test | Met |
| NFR5.3 | tech-stack-decisions.md | クリーン導入から型/lint/整形/build/test/coverageを再実行可能 | npm ci:242packages/監査0。型/lint/整形/build/test/coverage成功 | 本工程npm ci・verify・test:unit出力 | build-and-test | Met |
| NFR6.1 | reliability-requirements.md | 起動/正常停止/再起動、停止後コピーと検査・初期化保持 | 私有データの保守試験は成功。通常CLI停止の確認ができず実コピーは未実施 | runtime.test.ts・通常state/operation.lock残存 | build-and-test | Unverified |
| NFR6.2 | reliability-requirements.md | 復旧前原本保全・別保存先検査・影響説明と本人判断後の切替 | 私有データの原本保全/復旧試験成功。演習DBの対象選択・説明・実復旧は未実施 | runtime.test.ts・復旧本人判断は別途 | build-and-test | Unverified |
| NFR7.1 | observability-requirements.md | ターミナル/ファイルに日時・操作・成否、各イベント区別 | 通常startup/health/request記録、補足12イベント。失敗/競合/保守は既存試験 | 通常ログ・補足structured-log・runtime/http試験 | build-and-test | Met |
| NFR7.2 | observability-requirements.md | 氏名/件名/本文/回答/キー/内容指紋/秘密/要求を出さない | 許可リストと本文/回答目印なしを確認。禁止対象全項目×全失敗経路の両出力確認は未網羅 | logger.ts・runtime.test.ts・補足入力漏出なし（部分的証拠） | build-and-test | Unverified |
| NFR7.3 | observability-requirements.md | 1MiB×現行1＋過去3、1行4KiB、Git/配信除外 | 設定1MiB/4世代/4KiB。縮小閾値200バイトで4世代試験成功。既定1MiBの実容量境界は未実施 | logger.ts・runtime.test.ts（部分的証拠） | build-and-test | Unverified |
| NFR7.4 | observability-requirements.md | ログ失敗でも偽の保存失敗にせず、一度警告・再帰なし | 一度警告・無限再帰なし・例外なし、確定済み業務とは独立 | runtime.test.ts・logger.ts | build-and-test | Met |
| D-P2 | ../nfr-design/performance-design.md P2 | API no-store、独自キャッシュなし、古い取得応答を反映しない | API no-store実応答、古い要求番号抑制実装、APIキャッシュなし | 補足100件HTTP・ListPage/App.tsx | build-and-test | Met |
| D-R1 | ../nfr-design/reliability-design.md R1 | DELETE/FULL/foreign_keys、BEGIN IMMEDIATE/COMMIT/ROLLBACK、版と時刻規則 | DELETE/FULL/foreign_keys実読戻しと取消・版/時刻不変試験成功 | database/repository/service試験 | build-and-test | Met |
| D-S1-BODY | ../nfr-design/security-design.md S1 | JSON全体65536バイト許可・65537拒否、画面入力保持 | 実JSON65536は201、65537は413。画面は送信前拒否・保持 | http/input-policy/ui試験 | build-and-test | Met |
| D-S1-TIME | ../nfr-design/security-design.md S1 | ヘッダー5秒・本文5秒・ヘッダー総量16KiB | 設定5秒/5秒/16384、試験は本文50msへ短縮して408を確認。既定5秒と過大ヘッダーの実測なし | http-server/request-policy.ts・http.test.ts（部分的証拠） | build-and-test | Unverified |
| D-S3 | ../nfr-design/security-design.md S3 | 外部CDN/インラインスクリプトなし、CSP/nosniff/no-referrer、実体パス境界 | ヘッダーと静的配信拒否は確認。実ブラウザーのCSPとシンボリックリンク脱出は未確認 | http.test.ts・static-files.ts（部分的証拠） | build-and-test | Unverified |
| D-O1 | ../nfr-design/observability-design.md O1 | 有効な1行JSON、単調時間、要求ごとの再送キーとは異なる相関ID | 12行の有効JSONと日時/操作/結果、要求相関IDと単調時間の実装 | 補足structured-log・http-server/logger.ts | build-and-test | Met |
| D-O3 | ../nfr-design/observability-design.md O3 | 画面の失敗/競合通知からログの相関IDを照合可能 | ヘルスJSONにrequestIdあり、画面の失敗通知へ引継ぎなし（受入済みR-03） | 既存レビュー・api.ts | build-and-test | Not Met |
| D-R3 | ../nfr-design/reliability-design.md R3/R4 | 停止/接続終了/排他後に新規コピー検査、残存記録は確認と本人判断 | 通常CLI中断で正常停止記録なし・排他残存。独立app.stopは正常だが通常DB保守は未実施 | 通常state/operation.lock・補足application-stop-restart | build-and-test | Unverified |
| W1-CONFIRM | ../functional-design/functional-spec.md W1 | 成功画面で受付番号と登録内容全体を確認 | 成功画面の登録内容が受付番号/件名のみ（受入済みR-02） | 既存レビュー・RegisterPage.tsx | build-and-test | Not Met |
| W2-DRAFT | ../functional-design/functional-spec.md W2 | 競合で他タブ完了→再開後も未保存の担当/回答を保持 | 他タブで完了→競合回復→再開で未保存担当/回答を置換（受入済みR-01） | 既存レビュー・ResponseEditor.tsx | build-and-test | Not Met |
| TC-POSTURE | ../code-generation/code-generation-plan.md Testing Contract | test-after、runner先行、単体＋主要結合、各層の正常異常 | test-after・runner先行の上流記録、両コンポーネントと5層の単体/主要結合91例 | コード計画・コード生成記録・本工程実行結果 | build-and-test | Met |
| TC-CI | ../code-generation/code-generation-plan.md Testing Contract | 統合前CI検証（計画で適用判定） | the plan runs no CI Pipeline | aidlc-state.md: ci-pipeline SKIP | build-and-test | N/A |

## Next Decision

## Loop-Back Log

### Loop-back 1 — 2026-10-25T02:06:19Z

- Diagnosis: BT-01。SQLiteのbusy_timeout=1000に対しBEGIN IMMEDIATEの実経過は1169ms/1160msで、NFR2.5の1秒目標を超過した。
- Root-cause stage: code-generation / u1-deskflow。ネイティブ待機の設定値を実経過時間の上限と同一視した予算設定。
- Planned fix: 既存実装をModifyとして保持し、ネイティブの待機予算に余裕を設ける。DBロック時の保存拒否・入力保持・取消を維持し、1秒以内という同じ目標を実測する回帰検査を加える。目標を緩めない。受入済みR-01〜R-03、ブラウザー接続、通常DBの残存排他は今回の修正対象に含めない。
- Estimated impact: 実装・検証・再レビュー30〜60分程度、追加費用0。短い競合で従来より早く再試行案内となる可能性。コード計画の新しい承認後に実装し、対象Unitを再レビュー・再検証する。
- Human decision: 本人が選択肢1（Retry with fix）を選択した。修正への差し戻しを承認し、新しいコード計画の内容承認はまだ行っていない。

Constructionはgated。ここで工程完了承認を開かず、失敗を受け入れるか、BT-01の修正へ戻るか、停止するかの本人判断を待つ。コード生成で受入済みのR-01〜R-03は、修正対象を本人が指定しない限り変更しない。残存排他の解除や通常DBの復旧も、この結果の記録だけでは実施しない。

