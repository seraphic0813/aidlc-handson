# DeskFlow：要件と実装単位の対応

## Sources

- [要件](../requirements-analysis/requirements.md)：下位FR全23件とNFR全7件。
- [実装単位の定義](unit-of-work.md)、[依存関係](unit-of-work-dependency.md)。
- [本工程の回答](units-generation-questions.md)と本人が承認した分割計画。

## Requirement Assignment

User Stories工程は本計画では省略されているため、存在しないUSを作らず、要件の下位FR IDを対応のキーとする。各行の受入条件全体をU1の機能設計へ引き継ぐ。

| Requirement ID | Unit ID | Directory |
|---|---|---|
| FR1.1 | U1 | u1-deskflow |
| FR1.2 | U1 | u1-deskflow |
| FR1.3 | U1 | u1-deskflow |
| FR1.4 | U1 | u1-deskflow |
| FR2.1 | U1 | u1-deskflow |
| FR2.2 | U1 | u1-deskflow |
| FR3.1 | U1 | u1-deskflow |
| FR3.2 | U1 | u1-deskflow |
| FR3.3 | U1 | u1-deskflow |
| FR3.4 | U1 | u1-deskflow |
| FR4.1 | U1 | u1-deskflow |
| FR4.2 | U1 | u1-deskflow |
| FR4.3 | U1 | u1-deskflow |
| FR5.1 | U1 | u1-deskflow |
| FR5.2 | U1 | u1-deskflow |
| FR5.3 | U1 | u1-deskflow |
| FR6.1 | U1 | u1-deskflow |
| FR6.2 | U1 | u1-deskflow |
| FR7.1 | U1 | u1-deskflow |
| FR7.2 | U1 | u1-deskflow |
| FR7.3 | U1 | u1-deskflow |
| FR8.1 | U1 | u1-deskflow |
| FR8.2 | U1 | u1-deskflow |

## Cross-Cutting Requirements

| Requirement ID | Unit ID | Directory | 引き継ぐ内容 |
|---|---|---|---|
| NFR1 | U1 | u1-deskflow | 100件・20件ページ・主要操作2秒以内目標の実測 |
| NFR2 | U1 | u1-deskflow | 再起動、保存失敗・中断・競合の一貫性 |
| NFR3 | U1 | u1-deskflow | ループバック、保存側の検証、安全な文字表示 |
| NFR4 | U1 | u1-deskflow | キーボード、フォーカス、ラベル、文字による状態、200%拡大 |
| NFR5 | U1 | u1-deskflow | test-after、単体と主要結合、行カバレッジ80%以上 |
| NFR6 | U1 | u1-deskflow | 起動・停止・再起動・バックアップ復旧の手順と本人判断 |
| NFR7 | U1 | u1-deskflow | 本文や回答を直接出さないローカルの動作確認ログ |

複数単位にまたがるFR・NFRはない。U1内部の両コンポーネントに関わる品質要求は、機能設計および品質設計で責任と確認方法を具体化する。

## Implementation Order Within U1

単位内部は承認済みの基本操作の流れ（登録→対応更新→完了・再開→過去の検索・参照）を確認できる構成とする。保存の境界や検証を各操作とともに実装し、各層の実装後に単体・主要境界の結合テストを行う。初回データ、再起動・失敗・競合、画面の操作結果と品質要求も同じU1の完了条件に含める。

これはU1内部の操作・実装の整理であり、先行最小版の別単位化や、工程承認の省略を意味しない。具体的なファイルと実装手順は後のコード計画で承認を得る。

## Coverage Verification

- 要件の下位FRは23件で、本表のFR行も23件。全件をU1へ割り当て、未割当・重複行はない。
- NFRは7件で、すべてU1へ割り当てた。
- 宣言された単位U1にはFRの割当行がある。未使用の単位や未定義の単位参照はない。
- [traceability.json](traceability.json)ではFR全23件を列挙し、全てのtargetを本表と同じU1にする。NFRは本表で補足する。

## Assumptions & Open Questions

None.

