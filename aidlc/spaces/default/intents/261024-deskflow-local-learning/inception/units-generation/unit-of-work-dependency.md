# DeskFlow：実装単位の依存関係

## Sources

- [実装単位の定義](unit-of-work.md)
- [本工程の回答](units-generation-questions.md)：Q1=A、Q2=A、および本人による分割計画承認。
- [論理コンポーネント](../domain-design/components.md)：DeskFlowInterfaceからInquiryManagementへの同期呼び出し。

## Dependency DAG

```yaml
units:
  - name: u1-deskflow
    kind: service
    depends_on: []
```

ノードはU1（u1-deskflow）の1つだけで、単位間の辺はない。自己依存・未定義参照・循環はない。これは依存関係の定義であり、単位間の実装優先順位を定めるものではない。

## Integration Points

| 境界 | 関係 | 設計上の扱い |
|---|---|---|
| 単位間 | なし | 別の単位とのAPI・イベント・共有データ契約はない |
| U1内部の画面→問い合わせ管理 | 同期的な処理依頼と結果 | ドメイン設計の所有境界を維持し、具体的な呼び出しとデータ形は機能設計で定める |
| 問い合わせ管理→LocalPersistence | 正式な記録の保存・参照 | 別単位の共有データにせず、管理側が整合性を担う。保存技術は後続設計で決める |

ブラウザーとローカル保存先は実行環境への依存であり、単位DAGのノードではない。独立したホスト型CIや公開用の配備単位を追加しない。

## Parallel Development Opportunities

単位集合は`{u1-deskflow}`だけであり、並列に進める別単位はない。本人の選択どおり、同じ単位で各設計・実装・テストと承認を順に行う。先行する独立した最小版は設けない。

## Validation

YAMLの宣言名は1件、種類はservice、依存リストは空である。単位名は小文字と数字とハイフンによる有効なパス要素で、定義表および要件割当のディレクトリ名と一致する。

## Assumptions & Open Questions

None.

