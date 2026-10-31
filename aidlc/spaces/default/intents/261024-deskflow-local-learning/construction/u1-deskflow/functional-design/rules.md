# DeskFlow：業務ルール

## Sources

- [要件](../../../inception/requirements-analysis/requirements.md)：下位FR23件。
- [コンポーネント](../../../inception/domain-design/components.md)、[本工程の回答](functional-design-questions.md)：Q1〜Q3はすべてA。

## Rule Catalogue

次のYAMLが業務判断の正本。条件の適用順序はfunctional-spec.mdに示す。

```yaml
rules:
  - id: BR1.1
    statement: 登録文字列を検証する
    category: validation
    applies_to: Inquiryの登録項目
    trigger: 登録要求
    logic: IF 変更要求のJSON本文全体がUTF-8で65536バイト以下、前後空白除去後の申請者名が1〜50、件名が1〜100、本文が1〜2000書記素であり分類が未選択または固定値 THEN 受付可能。途中の改行と空白は保つ
    violation_behaviour: 該当欄を示して拒否し入力を保つ。保存しない
    source: [FR1.1, FR1.2]
  - id: BR1.2
    statement: 新規受付は不変の一意番号と初期状態を持つ
    category: constraint
    applies_to: Inquiry
    trigger: 新規登録の保存
    logic: IF 新しい操作の保存が成功 THEN DF連番・登録時刻・version=1を付与し、未対応・担当未割当・回答空にする
    violation_behaviour: 番号衝突や保存失敗を成功表示せず登録を確定しない
    source: [FR1.3]
  - id: BR1.3
    statement: 同じ登録操作は高々1件になる
    category: constraint
    applies_to: SubmissionReceiptとInquiry
    trigger: 登録と再試行
    logic: IF 同じキーと同じ検証済み内容が受付済み THEN 既存番号を返す。IF 同じキーで異内容 THEN 拒否。IF 新しいキー THEN 別の登録として不可分に保存する
    violation_behaviour: 操作の競合を知らせ入力を保つ。受付記録と問い合わせを片方だけ作成しない
    source: [FR1.4, FR7.2]
  - id: BR2.1
    statement: 担当は固定値から選び完了前だけ変更できる
    category: validation
    applies_to: Inquiry.assigneeCode
    trigger: 対応保存
    logic: IF 保存前が未対応または対応中かつ担当が未割当またはA/B/C THEN 変更可能
    violation_behaviour: 定義外または完了中の変更を拒否し保存済み値を保つ
    source: [FR2.1]
  - id: BR2.2
    statement: 担当の有無を文字で表示する
    category: policy
    applies_to: 一覧と詳細
    trigger: 表示
    logic: IF 担当コードが空 THEN 未割当と表示し、その他は対応する固定表示名にする
    violation_behaviour: 空欄や別の担当者へ置き換えない。不明値は読込不整合として扱う
    source: [FR2.2]
  - id: BR3.1
    statement: 許可した遷移だけを保存する
    category: constraint
    applies_to: Inquiry.status
    trigger: 対応保存または再開
    logic: IF 未対応から対応中、対応中から完了、完了から対応中 THEN 遷移可能。同じ未対応または対応中での編集保存も可能。それ以外は不可
    violation_behaviour: 不正な状態・遷移を拒否し保存済み状態を保つ
    source: [FR3.1]
  - id: BR3.2
    statement: 回答の上限と完了条件を守る
    category: validation
    applies_to: Inquiry.answer
    trigger: 対応保存
    logic: IF 変更要求のJSON本文全体がUTF-8で65536バイト以下、前後空白除去後0〜2000書記素 THEN 下書き可能。IF 完了へ遷移 THEN 1〜2000書記素が必要。担当未割当は完了の阻害条件にしない
    violation_behaviour: 入力欄と修正方法を示し、状態・担当・回答をすべて保存しない
    source: [FR3.2, FR3.3]
  - id: BR3.3
    statement: 完了中は参照専用で再開は現在値を保つ
    category: constraint
    applies_to: 完了のInquiry
    trigger: 完了後の保存または再開
    logic: IF 完了 THEN 担当と回答の編集を拒否。再開要求は状態だけを対応中へ変え担当と回答を保持する。編集は再開成功後に行う
    violation_behaviour: 完了中の変更要求を拒否する。再開と編集の同時要求も拒否する
    source: [FR3.4, FR2.1]
  - id: BR4.1
    statement: 新しい登録順を安定して示す
    category: policy
    applies_to: 一覧検索
    trigger: 読込
    logic: IF 結果を並べる THEN createdAt降順、同時刻は受付番号の数値部分の降順とし更新時刻で並べ替えない
    violation_behaviour: 不明時刻を実在時刻で補完しない。読込不整合を案内する
    source: [FR4.1]
  - id: BR4.2
    statement: 指定された状態だけに絞り込む
    category: validation
    applies_to: 一覧検索条件
    trigger: 検索
    logic: IF 状態が全件 THEN 状態の制約なし。それ以外は固定3状態の1つとの一致を要求する
    violation_behaviour: 定義外の条件は入力エラーとし0件と表示しない
    source: [FR4.2]
  - id: BR4.3
    statement: 20件単位で結果を漏れなく示す
    category: calculation
    applies_to: 一覧ページ
    trigger: 一覧検索とページ移動
    logic: IF 検索成功 THEN 同じ読取結果で総件数と該当ページを算出。ページは1始まり、20件ごと。条件変更は1ページへ戻し範囲外は最後の有効ページに補正。0件は1ページ相当の空表示
    violation_behaviour: 不正なページ形式は拒否。読込失敗を正常0件にしない
    source: [FR4.3, FR4.2]
  - id: BR5.1
    statement: 5項目に対して同じ文字比較を行う
    category: policy
    applies_to: 検索語と件名・本文・回答・申請者名・担当者表示名
    trigger: 検索
    logic: IF 検索語が100書記素以内 THEN 前後空白除去と比較用NFKC正規化および大小文字を区別しない部分一致を行う。5項目のどれかへの一致を採用。内部空白では語を分割しない。空語は検索語制約なし
    violation_behaviour: 上限超過は修正案内。保存値を検索用の値で置き換えない
    source: [FR5.1, FR5.2]
  - id: BR5.2
    statement: 検索と状態を併用し元の一覧へ戻す
    category: policy
    applies_to: 一覧と詳細
    trigger: 検索・参照・一覧へ戻る
    logic: IF 語と状態を指定 THEN 両条件を満たすものだけ返す。詳細への移動で条件とページを保ち、戻る際は最新の正本から再取得する。閲覧だけでは更新しない
    violation_behaviour: 詳細がなければ見つからない旨と一覧への操作を表示。範囲外ページはBR4.3で補正
    source: [FR5.2, FR5.3]
  - id: BR6.1
    statement: 初回だけ架空10件を不可分に投入する
    category: policy
    applies_to: InquiryとInitializationCheckpoint
    trigger: 起動時の初期化
    logic: IF 完了記録がある THEN 再投入しない。IF 記録も問い合わせもない新規保存先 THEN 3状態を含む10件と完了記録を不可分に保存する。完了例には有効な回答を持たせる
    violation_behaviour: 中断・失敗・記録欠落と既存データの不整合は自動上書きせず初期化エラーとして知らせる
    source: [FR6.1, FR6.2]
  - id: BR7.1
    statement: 永続保存した結果だけを成功として返す
    category: constraint
    applies_to: 登録・更新・再開・初期化
    trigger: 保存
    logic: IF 不可分な保存の確定が確認できた THEN 成功を返す。失敗なら既存の確定データを保つ。結果不明は成功にも確定失敗にも決めつけず再照合する
    violation_behaviour: 入力を保持し失敗または結果不明を案内。登録は同じキーで再送し、更新は再読込で保存結果を確認する
    source: [FR7.1, FR7.2, FR1.3]
  - id: BR7.2
    statement: 更新版で競合を検出し変更なしを区別する
    category: constraint
    applies_to: Inquiryの更新
    trigger: 対応保存と再開
    logic: IF 期待版が現在版と不一致 THEN 変更内容の比較より先に競合。IF 一致し編集可能かつ検証済み値が同じ THEN 変更なしを返し版・時刻は不変。IF 実変更 THEN 不可分な版照合付き保存で版を1増加
    violation_behaviour: 古い入力を自動上書き・自動再送せず保ち、最新内容と見直す操作を提供する
    source: [FR7.3, FR5.3, FR8.2]
  - id: BR8.1
    statement: 入口と登録成功後の操作を区別する
    category: policy
    applies_to: W0からW3
    trigger: 画面移動と登録成功
    logic: IF 社員入口 THEN 登録へ、窓口入口 THEN 一覧へ進む。登録成功は同じ画面で受付番号と内容を確認表示し、別件登録ボタンで空のフォームと新しい操作キーを用意する
    violation_behaviour: 入口を認証と説明しない。成功後に自動で窓口へ移動しない
    source: [FR8.1, FR1.4]
  - id: BR8.2
    statement: 処理状態と未保存入力を明確にする
    category: policy
    applies_to: 全画面
    trigger: 読込・送信・失敗・移動
    logic: IF 処理中 THEN 重複操作を抑え文字で知らせる。入力エラー・競合・失敗では入力を保つ。未保存移動は戻るか破棄して移動を選べる。読込失敗と正常0件は区別する
    violation_behaviour: 成功を先取り表示せず修正・再試行の操作を案内する
    source: [FR8.2, FR4.2]
```

## Rules Summary

| ルール | 概要 |
|---|---|
| BR1.1〜BR1.3 | 登録検証、一意番号、再送受付 |
| BR2.1〜BR2.2 | 担当の固定値と表示 |
| BR3.1〜BR3.3 | 状態遷移、回答、完了と再開 |
| BR4.1〜BR4.3 | 安定した並び、状態、ページ |
| BR5.1〜BR5.2 | 文字比較、検索併用、参照と戻り |
| BR6.1 | 初回10件と再投入防止 |
| BR7.1〜BR7.2 | 永続化の確定、競合、変更なし |
| BR8.1〜BR8.2 | 入口、成功後の操作、画面状態 |

## Assumptions & Open Questions

共通受信上限の根拠：[ローカル実行環境Q2=A](../infrastructure-design/infrastructure-design-questions.md)。JSON構造と付帯項目を含め、65536バイトちょうどを許可し、65537バイト以上は入力を保持して修正を案内する。文字数内でも拒否する例外を本人の指示に基づき追加した。

None. 受付番号、別件登録、変更なし保存はQ1〜Q3のA。その他の手順の具体化は既存FRに基づく設計とする。
