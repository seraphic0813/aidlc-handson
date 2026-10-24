# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER AWSへデプロイしたり、システムを外部公開したりする。 (affirmed 2026-10-24)

- NEVER 実在する問い合わせなどの実データを演習に使う。 (affirmed 2026-10-24)

- NEVER 初回の範囲に、実在アカウントによるログインや社内認証基盤との接続を含める。 (affirmed 2026-10-24)

- NEVER 初回の範囲に、添付ファイル・担当者別件数集計・模擬メール通知を自動的に追加する。 (affirmed 2026-10-24)

- NEVER 明示的な依頼なしにコミット・プッシュ・マージを行う。 (affirmed 2026-10-24)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS 架空データだけを使い、企画からローカル起動・ローカル運用までの演習を行う。 (affirmed 2026-10-24)

- ALWAYS 各工程の承認点で作業内容を説明し、本人の判断を待つ。 (affirmed 2026-10-24)

- ALWAYS 実装前のコード計画承認を維持する。 (affirmed 2026-10-24)

- ALWAYS 追加費用のかからないツール・構成で進める。 (affirmed 2026-10-24)

- ALWAYS 必要な無料ソフトを追加する前に、その目的と導入内容を説明する。 (affirmed 2026-10-24)

- ALWAYS 別の作業ブランチが必要になった場合は、作成前に本人へ相談する。 (affirmed 2026-10-24)

- ALWAYS ローカル操作はAIが操作内容とコマンドを説明して実行し、本人が結果を確認する進め方とする。 (affirmed 2026-10-24)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
