# きもちとコード

エンジニアとしての学習を続けるための日記ブログです。
**気持ち・技術・学び**を分けて書き、ホームのカレンダーで「その日の気分」と「学習時間」を重ねて振り返ります。

Astro で作った静的サイトなので、Markdown を書いて push するだけで更新できます。

## 画面構成

| URL | 画面 | 内容 |
|---|---|---|
| `/` | ホーム | 最新の気分、統計（累計学習時間・連続学習日数など）、きもちカレンダー（今年の1〜12月を月ごとに切り替え。日付クリックでその日の記事）、最近の記録 |
| `/calendar/[年]/` | カレンダー | 指定した年の1〜12月の気分カレンダー。年はいちばん古い記事の年〜今年から選べる。日付をクリックするとその日の記事を表示（`/calendar/` は今年へ移動） |
| `/feel/` | きもち日記 | 気分の色のカード一覧。気分で絞り込める |
| `/feel/[日付]/` | 日記の詳細 | |
| `/tech/` | テックノート | 「プロジェクト」と「考え方メモ」のタブ |
| `/tech/[slug]/` | 詳細 | プロジェクトは進捗と、関連するまなびログの合計時間を表示 |
| `/learn/` | まなびログ | 直近7日の学習時間グラフ、今月のカテゴリ別時間、TIL一覧 |
| `/tags/[tag]/` | タグ | 3種類の記事を横断して表示 |
| `/about/` | このサイトについて | |

画面設計の試作品（1ファイルのHTML）は [`docs/prototype.html`](docs/prototype.html) にあります。

## はじめかた

Node.js 20 以上が必要です。

```sh
npm install
npm run dev      # http://localhost:4321 で確認
npm run build    # 型チェック＋ dist/ に書き出し
```

## 記事の書き方

記事は `src/content/` 以下の Markdown です。ひな形はコマンドで作れます。

```sh
npm run new:feel                  # きもち日記（今日の日付）
npm run new:learn -- iam-policy   # まなびログ
npm run new:tech -- my-app        # テックノート
```

`title` が空のままだとビルドでエラーになるので、書き忘れに気づけます。

**並び順**：記事は `date` の新しい順です。同じ日付の記事は、`created`（書いた日時。管理画面で保存すると `created: "2026-10-04T21:30:00+09:00"` のように自動で入る）が新しい順になります。`created` がない記事はその日の中でいちばん古い扱いで、それ同士はファイル名の順です。手で書くときも、同じ日に複数書くなら `created` を入れておくと順番を決められます。

### きもち日記 `src/content/feel/2026-10-02.md`

```yaml
---
title: 初めてPRがマージされた
date: 2026-10-02
mood: great        # great 最高 / happy うれしい / calm おだやか / meh もやもや / down しょんぼり
weather: 晴れ      # 省略可
tags: [OSS]
---
```

### まなびログ `src/content/learn/2026-10-02-xxx.md`

```yaml
---
title: IAMロールの信頼ポリシーと権限ポリシーの違い
date: 2026-10-02
minutes: 50          # スタディタイム（分）。グラフとカレンダーに集計される
category: AWS        # src/lib/categories.ts に定義したもの
project: kimochi-code  # 省略可。tech のファイル名を書くとプロジェクトの学習時間に加算
tags: [IAM]
source: https://...  # 省略可
---
```

### テックノート `src/content/tech/xxx.md`

```yaml
---
type: project        # project（プロジェクト）または note（考え方メモ）
title: きもちとコード
date: 2026-09-15
updated: 2026-10-01  # 省略可
summary: 一言の説明
icon: KC             # project のみ。カードに出る2〜3文字
status: run          # plan / run / done
progress: 72         # 0〜100
stack: [Astro, TypeScript]
tags: []
---
```

どの記事も `draft: true` にすると公開されません。

## 管理画面（ブラウザで記事を書く）

`/admin/` が管理画面のトップです。GitHub トークンを設定し、書きたい記事の種類を選んでフォームに進みます。「保存して公開」を押すと Markdown が GitHub の main ブランチに直接コミットされ、自動デプロイで公開されます。DB は使いません。

| URL | 内容 | 保存先 |
|---|---|---|
| `/admin/` | 記事を書く（トークン設定・各フォームへの入口・記事数） | — |
| `/admin/posts/` | 保存記事一覧（下書きも含めた全記事。種類・公開／下書きで絞り込み。トークン設定時は「管理画面で修正」「GitHubで編集」） | — |
| `/admin/feel/` | きもち日記（1日1件） | `src/content/feel/<日付>.md` |
| `/admin/learn/` | まなびログ | `src/content/learn/<日付>_<スラッグ>.md` |
| `/admin/tech/` | テックノート（「プロジェクト」を選ぶと進捗などの欄が出る） | `src/content/tech/<作成日>_<スラッグ>.md` |

スラッグはタイトルとは別に入力する、記事の URL やファイル名に使う名前です（英小文字・数字・ハイフン。例：`iam-policy`）。ファイル名は `2026-10-04_iam-policy.md`、テックノートの URL は `/tech/2026-10-04_my-app/` のようになります。

ファイル: `src/pages/admin/`（各ページ）、`src/components/AdminShell.astro`・`AdminSubmit.astro`（共通の枠と保存ボタン）、`src/lib/admin-client.ts`（トークン保存・GitHub への保存などブラウザ側の共通処理）

**はじめに：GitHub トークンを作る**

1. GitHub の Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Repository access で **このリポジトリだけ** を選ぶ
3. Permissions の **Contents** を **Read and write** にする（ほかは不要）。有効期限も付けておく
4. できたトークンを `/admin/` の「GitHub トークン」欄に貼って「設定する」（「このブラウザに保存する」をオンにすると次回から入力不要。オフなら管理画面にいる間だけ有効で、ホームなど管理画面の外のページを開くかタブを閉じると自動で消える）

**注意**

- トークンはブラウザから GitHub に直接送られるだけで、このサイトのサーバーには送られません。ただしパスワードと同じ扱いで、人に見せたりコードに書いたりしないでください。
- 同じファイル名の記事がすでにあるときは新規保存しません（上書き防止）。既存の記事は、保存記事一覧の「管理画面で修正」から直せます（GitHub から最新の内容を読み込み、同じファイルに上書き。読み込んだあとに GitHub 側で変更されていたら保存しません）。日付・スラッグはファイル名に使うため、修正では変えられません。
- 管理画面はサイドバーに出していません。`/admin/` を直接開いてください。検索エンジンには載せない設定（noindex）にしてあります。
- 気分・カテゴリ・関連プロジェクトの選択肢は、`src/lib/moods.ts`・`src/lib/categories.ts`・テックノートのプロジェクトから自動で作られます（関連プロジェクトはビルド時点のもの）。

## カスタマイズ

| やりたいこと | 編集するファイル |
|---|---|
| 学習カテゴリと色を変える | `src/lib/categories.ts` |
| 気分の種類・表情を変える | `src/lib/moods.ts` と `src/styles/global.css` の `.blob.*` |
| 色・フォントを変える | `src/styles/global.css` の先頭（`:root`） |
| 自己紹介を書く | `src/pages/about.astro` |

## ディレクトリ構成

```
src/
├── content.config.ts      # 3つのコレクション（feel / tech / learn）の型定義
├── content/               # 記事（Markdown）
├── components/
│   ├── MoodBlob.astro     # 気分アイコン（SVG）
│   ├── MoodCalendar.astro # きもちカレンダー
│   ├── StudyChart.astro   # 日別の学習時間グラフ
│   ├── CategoryBars.astro # カテゴリ別の学習時間
│   ├── FeelCard.astro / ProjectCard.astro / TagList.astro
├── layouts/BaseLayout.astro
├── lib/                   # 集計処理・日付・気分とカテゴリの定義
├── pages/
└── styles/global.css
scripts/new.mjs            # 記事のひな形を作るスクリプト
```

集計（カレンダー、グラフ、連続学習日数）はすべて**ビルド時**に行います。「今日」はビルドした日（日本時間）なので、毎日 0:00（日本時間）に自動でビルドし直す設定にしてあります（`.github/workflows/deploy.yml` の `schedule`）。

## 公開

GitHub Pages で公開しています：**https://ryouma139.github.io/kimoti_sekkei/**（管理画面は `/kimoti_sekkei/admin/`）

- `main` に push すると `.github/workflows/deploy.yml` が動き、1〜2分で公開されます（管理画面からの保存も同じ）。
- 「今日」やカレンダーはビルドした日で決まるので、毎日 0:00（日本時間）にも自動で作り直します。GitHub の Actions タブから手動でも実行できます。
- サイトは `/kimoti_sekkei/` の下に置かれるため、`astro.config.mjs` に `base: '/kimoti_sekkei'` を指定しています。ページ内のリンクは必ず `src/lib/url.ts` の `url()` を通してください（`/feel/` と直接書くと公開後にリンク切れになります）。
- 初回だけ、GitHub の Settings → Pages → Build and deployment の Source を **GitHub Actions** にしてください。

## 素材とライセンス

- 気分アイコン：このサイトのために描いたSVG（`src/lib/moods.ts`）
- フォント：Google Fonts（Dela Gothic One、Zen Kaku Gothic New、JetBrains Mono / SIL Open Font License 1.1）
