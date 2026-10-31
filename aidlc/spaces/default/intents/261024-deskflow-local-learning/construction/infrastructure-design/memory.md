<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

- 2026-10-24T14:55:01Z [unit u1-deskflow] — 本人のQ1=Aで保存先はdeskflow/.local/、Q2=Aで変更要求JSON本文全体のUTF-8上限65536バイトを採用した。文字数内でも超過を拒否する例外を上位要件・BR1.1/BR3.2・機能仕様・画面案内・境界確認へそろえた。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

- 2026-10-24T14:55:01Z [unit u1-deskflow] — 同一PC・同一ディスク内のコピーは停止後の演習復旧に用い、ディスク全体の故障を無損失で復旧する保証にはしない。起動と保守を排他化し、異常終了の残存記録はプロセス確認と本人判断なしで解除しない構成にした。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
