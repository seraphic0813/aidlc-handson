# 次回へ引き継ぐメモ

設計から実装までの記録から抽出した候補です。保存する候補だけを選んでください。選択した候補は、既定ではこのプロジェクトの今後の進め方に反映します。チーム全体へ適用したい場合は「チームへ」と添えてください。

## 保存する候補

1. **Keep none of these** — どの候補も保存しない。
2. **本工程のQ1〜Q3は本人がすべてAを選択した。受付番号は連番、成功後の別件登録は空フォーム、変更なし保存は版・時刻不変として機能設計へ反映した。** → project.md ## Corrections（functional-design/c1）
3. **同じ登録操作の再送と別件登録を区別し、結果不明の再試行では同じキーと内容を保持する。古い更新は変更なし判定より前に拒否し、競合時は自動マージを避けて本人による見直しを優先した。** → project.md ## Corrections（functional-design/c2）
4. **Q1の本人回答はReact＋SQLite、HTML/CSS＋TypeScript、アトミックデザイン。Flask案を採用せず、同じ単独アプリ内でReact画面とNode側の正式保存を扱う構成へ具体化した。** → project.md ## Corrections（nfr-requirements/c1）
5. **Node v24.14.0のnode:sqliteは開発中APIであることを公式資料で確認した。別DBサーバーやネイティブアドオンを追加しない演習構成とし、実行版固定・保存境界のテスト・実測を必要条件にした。** → project.md ## Testing Posture（nfr-requirements/c2）
6. **本人はQ1=Aを選択し、正常停止と接続終了を確認してからバックアップする方式を採用した。コピーを読取専用で検査し、復旧前の原本保全と本人判断を維持する。** → project.md ## Corrections（nfr-design/c1）
7. **1人100件の範囲では問い合わせAPIの独自キャッシュや分散基盤を持たず、正式データの再取得と短いSQLiteトランザクションで一貫性を優先する。Atomic DesignはReactの画面責任に適用し、業務判定を部品へ分散させない。** → project.md ## Corrections（nfr-design/c2）
8. **本人のQ1=Aで保存先はdeskflow/.local/、Q2=Aで変更要求JSON本文全体のUTF-8上限65536バイトを採用した。文字数内でも超過を拒否する例外を上位要件・BR1.1/BR3.2・機能仕様・画面案内・境界確認へそろえた。** → project.md ## Corrections（infrastructure-design/c1）
9. **同一PC・同一ディスク内のコピーは停止後の演習復旧に用い、ディスク全体の故障を無損失で復旧する保証にはしない。起動と保守を排他化し、異常終了の残存記録はプロセス確認と本人判断なしで解除しない構成にした。** → project.md ## Corrections（infrastructure-design/c2）
10. **全9ファイル91例が成功し、未実行実装も母数に含むV8行カバレッジは92.08%（582/632）。通常起動・実ブラウザーでの確認・実地復旧は未実施として分け、主担当は成果記録と67件の対応・17手順完了を確認した。** → project.md ## Testing Posture（code-generation/c1）
11. **ツール応答が長く返らない呼出しを中断して状態を確認し、UI試験は主担当が実行した。テストのラベル指定を実画面に合わせて15例が成功し、追加API境界7例を含む最終の全試験も成功した。** → project.md ## Testing Posture（code-generation/c2）
12. **本人がApprove Planを選択し、17手順のコード計画を承認した。実装はdeskflow/内に限定し、通常の起動と実際の復旧は検証結果説明後の本人判断まで行わない。** → project.md ## Corrections（code-generation/c3）

[Answer]:

## 次回のために追加したいこと

A. **Nothing to add** — 追加なし。
B. **Add a note** — 追加するメモを教えてください。

[Answer]:

保存候補と追加メモを決めるための質問です。単位の完了承認と、未解決のレビュー指摘を受け入れる判断は、この回答後に別途確認します。
