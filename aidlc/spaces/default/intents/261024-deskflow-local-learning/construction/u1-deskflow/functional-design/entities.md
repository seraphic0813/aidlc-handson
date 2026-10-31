# DeskFlow：エンティティモデル

## Sources

- [要件](../../../inception/requirements-analysis/requirements.md)：FR1〜FR8、NFR2・NFR3。
- [所有境界](../../../inception/domain-design/components.md)：3エンティティはInquiryManagementが所有する。
- [本工程の回答](functional-design-questions.md)：Q1=A、Q2=A、Q3=A。

## Entity Model

次のYAMLがデータ形状の正本。文字数は前後空白除去後の書記素クラスタ数。時刻はタイムゾーン付きの時点で、表示は日本時間。物理保存形式は後工程で定める。

```yaml
entities:
  - name: Inquiry
    description: 問い合わせと現在の対応内容を保持する集約の正本
    owner: InquiryManagement
    attributes:
      - {name: ticketNumber, type: string, required: true, unique: true, constraints: "DF-に6桁以上のゼロ埋め正整数を続ける。不変。欠番可"}
      - {name: requesterName, type: text, required: true, unique: false, min: 1, max: 50}
      - {name: subject, type: text, required: true, unique: false, min: 1, max: 100}
      - {name: description, type: multiline_text, required: true, unique: false, min: 1, max: 2000}
      - {name: categoryCode, type: optional_enum, required: false, unique: false, allowed_values: [pc, software, connection, other], default: null}
      - {name: assigneeCode, type: optional_enum, required: false, unique: false, allowed_values: [desk_a, desk_b, desk_c], default: null}
      - {name: status, type: enum, required: true, unique: false, allowed_values: [open, in_progress, completed], default: open}
      - {name: answer, type: multiline_text, required: true, unique: false, min: 0, max: 2000, default: ""}
      - {name: createdAt, type: instant_with_offset, required: true, unique: false, constraints: 登録時に管理側で付与し不変}
      - {name: updatedAt, type: instant_with_offset, required: true, unique: false, constraints: 登録時はcreatedAtと同じ。実変更の保存成功時だけ更新}
      - {name: version, type: integer, required: true, unique: false, min: 1, default: 1, constraints: 実変更を成功保存するたび1増加。閲覧と変更なし保存では不変}
    constraints:
      - 完了には空白除去後1文字以上の回答が必要。担当未割当の完了を許可する
      - 申請者名・件名・本文・分類は登録後編集しない
      - 完了中の担当・回答は編集不可。再開は状態だけを変更する
      - 保存と更新版の照合は同じ不可分な更新の中で実施する
  - name: SubmissionReceipt
    description: 同じ登録操作を再送した際に受付結果を再現する記録
    owner: InquiryManagement
    attributes:
      - {name: submissionKey, type: opaque_string, required: true, unique: true, constraints: 登録操作ごとに一意。再試行では同じ値}
      - {name: payloadFingerprint, type: content_digest, required: true, unique: false, constraints: 検証・前後空白除去後の登録4項目の境界を保った正規化表現から導出。検索用の正規化は適用しない}
      - {name: ticketNumber, type: string, required: true, unique: true, references: Inquiry.ticketNumber}
      - {name: acceptedAt, type: instant_with_offset, required: true, unique: false, constraints: 対象InquiryのcreatedAtと同じ時点}
    constraints:
      - 対応するInquiryの新規保存と不可分に保存し、一方だけ成功させない
      - 同じキーと同じ内容は既存結果を返す。同じキーで内容が違えば拒否する
      - 登録済み問い合わせを保持する間は受付記録を期限切れにしない
  - name: InitializationCheckpoint
    description: 初回データ投入が全体として完了したことの記録
    owner: InquiryManagement
    attributes:
      - {name: checkpointKey, type: string, required: true, unique: true, allowed_values: [deskflow_initial_seed]}
      - {name: seedRevision, type: string, required: true, unique: false, default: seed_v1}
      - {name: initializedAt, type: instant_with_offset, required: true, unique: false}
    constraints:
      - 初期10件と同じ不可分な保存で作成する
      - 存在する場合、通常再起動では投入しない。seedRevisionの変更だけで追加投入しない
      - 未初期化なのに既存問い合わせがある異常状態は自動投入・上書きせず起動エラーとする
relationships:
  - {from: SubmissionReceipt, to: Inquiry, cardinality: one_to_one_optional_reverse, direction: SubmissionReceiptからInquiryを参照, constraint: "各受付は必ず1件を参照し、各Inquiryには0または1件の受付が対応する。初期データには受付記録を作らない"}
  - {from: InitializationCheckpoint, to: Inquiry, cardinality: none, direction: none, constraint: 初期化全体の完了記録であり個別問い合わせへの参照は持たない}
```

## Reference Values and Identity

| 値 | 表示名 |
|---|---|
| categoryCode=null / pc / software / connection / other | 未選択 / PC / ソフト / 接続 / その他 |
| assigneeCode=null / desk_a / desk_b / desk_c | 未割当 / 窓口担当A / 窓口担当B / 窓口担当C |
| status=open / in_progress / completed | 未対応 / 対応中 / 完了 |

固定選択肢は同じ所有者の参照定義であり、アカウントではない。初期10件はDF-000001〜DF-000010、通常登録は以後の未使用番号を管理側で割り当てる。同時登録でも番号は重複させない。6桁を超えた場合は切り捨てず桁を増やす。採番の物理方式は品質設計で決める。

## Summary

Inquiryが現在値、SubmissionReceiptが登録再送の照合、InitializationCheckpointが初回投入の完了を所有する。画面の入力・検索・ページ・未保存状態は一時状態であり、この3エンティティとは分ける。初期データにはSubmissionReceiptがないため、Inquiry側の関係は任意である。

## Assumptions & Open Questions

None. 固定コード・時刻・版・再送受付の扱いは承認済み要件を具体化した設計提案であり、本人の追加回答とは扱わない。
