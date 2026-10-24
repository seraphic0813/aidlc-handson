# AI-DLC導入ハンズオン手順書（Windows + Codex CLI）

更新日: 2026-10-24
対象: seraphic0813/aidlc-handson

この文書は実施済みの操作と意味、確認結果を記録する。上から再実行するための指示ではない。DeskFlowのAI-DLCワークフローはまだ開始していない。

## 0. やり直し前のリセット

当初は別フォルダーの試作用プロジェクトへAI-DLCを先に設定してしまった。自分で導入から体験し直すため、説明資料のREADME、AGENTS.md、DeskFlow教材案を C:\Users\temp_admin\.vscode\workspace\aidlc-handson-deskflow-docs-backup-20261024 に退避し、元ファイルとのハッシュ一致を確認した。その後、公式のアンインストール機能でPC側のAI-DLCを削除した。

~~~powershell
& 'C:\Users\temp_admin\AppData\Local\aidlc\bin\aidlc.cmd' uninstall --purge --yes
~~~

このコマンドはAI-DLC本体、管理下の設定、インストーラーが登録したユーザーPATHを削除する。試作用プロジェクトの生成物も取り除いて空フォルダーに戻した。Codex CLIと資料バックアップは対象外。リセット後に、aidlcコマンド、インストール先、ユーザーPATHの登録が消えたことを確認した。

## 1. 公式のCodex CLIを導入する

AI-DLC 2.11.1が必要とするCodex CLIの最低バージョンは0.145.0。最初に外部記事に従って次の別パッケージを入れた。

~~~powershell
npm install -g codex-cli
codex --version
~~~

実際には「Option '--version' not supported」となった。インストールされた codex-cli@0.1.3 はOpenAI公式のCodex CLIではなく、npmの起動スクリプトが codex コマンドを占有していた。次で削除した。

~~~powershell
npm uninstall -g codex-cli
~~~

続いて公式パッケージをインストールした。

~~~powershell
npm install -g @openai/codex
codex --version
codex
~~~

結果は codex-cli 0.164.0。対話画面が実際に開くことも確認した。バージョン表示だけでは対話起動の検証にはならない。

なお、当時OpenAIのREADMEに掲載されていたWindows用スタンドアロン・インストーラーURLを試したが404だった。その方法では導入していない。

## 2. AI-DLC本体をインストールする

AWS LabsのGetting Startedに記載されたWindows PowerShellコマンドを実行した。

~~~powershell
irm https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.ps1 | iex
~~~

irm は公式リリースのインストーラーを取得し、iex はその内容を実行する。実行するとリリースのメタデータ、チェックサム、Windows用実行ファイル、全ハーネス用ランタイムが取得される。

結果は Installed AI-DLC 2.11.1。コマンドは C:\Users\temp_admin\AppData\Local\aidlc\bin\aidlc.cmd に配置され、インストーラーがユーザーPATHに登録した。これはPC側の導入であり、個別プロジェクトへの設定とは別の作業。

インストール前から開いていたVS Codeは古いPATHを保持し得るため、完全に終了して開き直した。次で動作を確認した。

~~~powershell
aidlc version
~~~

結果は aidlc 2.11.1 (runtime 2.11.1)。

## 3. GitHubに専用リポジトリを作る

既存の C:\Users\temp_admin\.vscode\workspace は seraphic0813/workspace のGitリポジトリだった。体験を分離するため、GitHubに seraphic0813/aidlc-handson を新規作成した。

GitHub CLIの保存済み認証が無効だったため、次で更新した。

~~~powershell
gh auth refresh -h github.com
~~~

ブラウザーの「Authorize your device」に入れる8文字のコードは、メールや認証アプリではなく、このコマンドを実行したターミナルに表示される。コードやトークンをチャットに貼らない。

PCには git clone で複製した。

~~~powershell
git clone https://github.com/seraphic0813/aidlc-handson.git
~~~

「You appear to have cloned an empty repository」は失敗ではなく、GitHub側にまだコミットがないという警告。最初はフォルダー名が二重になったのでローカルの構成を整理した。最終的なGitルートは C:\Users\temp_admin\.vscode\aidlc-handson。接続先 origin は https://github.com/seraphic0813/aidlc-handson.git。既存の workspace リポジトリの外にあり、git init を重ねて行う必要はない。

必要なら次で作業位置と接続先を確認できる。

~~~powershell
git rev-parse --show-toplevel
git remote -v
~~~

## 4. リポジトリへAI-DLCを設定する

Gitルート C:\Users\temp_admin\.vscode\aidlc-handson のターミナルで実行した。

~~~powershell
aidlc config
~~~

これは対話形式のプロジェクト設定。最初の検出結果は Codex CLI 0.164.0、Gitリポジトリあり、AI-DLCファイルなし、AWS認証情報なし、ランタイム準備済み。今回はAWS Bedrockを使わないため、AWS認証情報なしは問題ではない。

推奨値の一括適用ではなく「customize step by step」を選び、次のように設定した。

| 項目 | 選択 | 意味 |
| --- | --- | --- |
| Harness | Codex CLI | Codex向けフック・スキル・設定を用意する |
| Model provider | keep current | Codexの既存認証・接続先を維持し、Bedrock設定を追加しない |
| Model effort preset | balanced | AI-DLC内部エージェントの判断・レビュー・記録作成の推論量を中程度にする |
| Plugins | none optional | 追加プラグインを有効にせず、コアAI-DLCを使う |
| MCP servers | off | 追加のMCPサーバー設定を作らない |
| Preset storage | this project, committed | balancedの設定を aidlc.settings.json に記録する |
| Status line | Yes | Codex画面下部にAI-DLCの進捗を表示する |

balanced はAI-DLCのDepthやTest Strategyとは別。Depthは各工程の成果物の詳しさ、Test Strategyは作るテストの量と種類を決める。後二者の選択肢は minimal / standard / comprehensive で、後にワークフローのプロファイルや個別指定によって決まる。

Applyで適用した結果、.codex/、.agents/、aidlc/、.gitignore、AGENTS.md、aidlc.settings.json などが生成された。セットアップ時の表示は「.codex/ and aidlc/, 303 files」。ステータスライン設定は .codex/config.toml に反映された。この操作でGitのコミットやGitHubへのプッシュは行われない。

## 5. Codexのフックをレビューして信頼する

Gitルートで codex を起動すると「11 hooks are new or changed」と表示された。フックは、セッション開始、ユーザー入力、ツール実行、コンテキスト圧縮、サブエージェント終了などの節目でAI-DLCの処理を呼ぶ。

「Review hooks」で一覧を確認した。.codex/hooks.json に記載された11個のコマンドはいずれも aidlc engine adapter codex ... を呼ぶ設定。信頼前は Active 0。信頼するとサンドボックス外でも実行され得るため、内容を確認してから t（trust all）を押した。信頼後は一覧のActive数がInstalled数と一致した。

この信頼はプロジェクトのフック設定に対する操作。フック内容が後で変われば再レビューを求められることがある。

## 6. 診断と起動環境の切り分け

最初のCodexセッションで次を入力した。

~~~text
$aidlc --doctor
~~~

これはPowerShellコマンドではなく、Codex内でAI-DLCに診断を依頼する入力。最初はフックと診断が「aidlc が見つからない」で失敗した。一方、同じVS Codeターミナルに戻ると次で aidlc.cmd が見つかった。

~~~powershell
Get-Command aidlc
~~~

したがってAI-DLC本体の欠落ではなく、最初のCodexセッションの実行環境に問題があると分かった。共有バックグラウンドサーバーが古いPATHを保持していた可能性はあるが、原因は確定していない。

次の起動方法で新しい環境からCodexを開いた。

~~~powershell
codex --no-daemon
~~~

--no-daemon は共有バックグラウンドサーバーを使用しないCodex CLIのオプション。このセッションでは aidlc が呼べるようになった。診断中、Gitの読み取り処理がCodexの権限制限で一度失敗し、表示された aidlc doctor の制限外での再実行を一回だけ承認した。今後の同種コマンドを恒久的に許可する選択はしていない。

最終診断結果は次のとおり。

~~~text
Machine: 13 checks passed
Project (.codex, Codex CLI): 44 checks passed
Framework integrity: 12 checks passed
0 problems, 1 warning
~~~

残る警告は aidlc/ 以下の共有記録に未コミットの変更が8件あるというもの。設定直後の未コミット状態を知らせる警告で、診断の失敗ではない。現時点でコミット、プッシュ、デプロイはしていない。

## 7. 現在地と再開時の順序

- Codex CLI 0.164.0とAI-DLC 2.11.1は導入済み。
- GitHubの seraphic0813/aidlc-handson とローカルの C:\Users\temp_admin\.vscode\aidlc-handson が接続されている。
- AI-DLCのプロジェクト設定とフック信頼は完了し、診断は0 problems。
- AI-DLCのIntent、DeskFlowの企画、要件、設計、アプリ、テスト、運用演習は未開始。
- コミットとGitHubへのプッシュは未実施。
- 現在の動作確認済みの起動方法は、このGitルートで codex --no-daemon。共有デーモン側のPATH問題は未解消で、--no-daemon の恒久運用要否は未判断。

再開時はGitルートでCodexを開き、DeskFlowの目的をAI-DLCに伝える。その場で提示される計画を確認し、承認点ごとに進める。次の入力はまだ実行していない。

~~~powershell
Set-Location -LiteralPath 'C:\Users\temp_admin\.vscode\aidlc-handson'
codex --no-daemon
~~~

Codexの入力例:

~~~text
$aidlc 架空の社内問い合わせ管理Webシステム「DeskFlow」を題材に、企画・要件整理・設計・実装・テスト・ローカル起動・ローカル運用を一工程ずつ体験したいです。架空データだけを使い、AWSへのデプロイはしません。計画を提案し、各承認点では作業内容を説明して私の判断を待ってください。
~~~

## 公式資料

- [AWS Labs AI-DLC: Getting Started](https://github.com/awslabs/aidlc-workflows/blob/main/docs/guide/01-getting-started.md)
- [AWS Labs AI-DLC: Codex CLI](https://github.com/awslabs/aidlc-workflows/blob/main/docs/guide/harnesses/codex-cli.md)
- [AWS Labs AI-DLC: Scopes, Depth, and Test Strategy](https://github.com/awslabs/aidlc-workflows/blob/main/docs/guide/05-scopes-and-depth.md)
- [OpenAI Codex CLI](https://github.com/openai/codex/blob/main/README.md)
- [GitHub CLI: 認証更新](https://cli.github.com/manual/gh_auth_refresh)
- [GitHub: リポジトリのクローン](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
