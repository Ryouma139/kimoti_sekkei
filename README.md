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

集計（カレンダー、グラフ、連続学習日数）はすべて**ビルド時**に行います。「今日」はビルドした日（日本時間）なので、毎日更新されるように見せたい場合は、毎日ビルドが走るように設定してください（Cloudflare Pages の Deploy Hook を GitHub Actions の schedule から呼ぶ、など）。

## 公開

**Cloudflare Pages（おすすめ）**

1. Cloudflare のダッシュボードで「Workers & Pages」→「Pages」→ このリポジトリを接続
2. フレームワークのプリセットで「Astro」を選ぶ（ビルドコマンド `npm run build`、出力先 `dist`）
3. 公開URLが決まったら `astro.config.mjs` の `site` を書き換える

**GitHub Pages の場合**は `astro.config.mjs` に `base: '/kimoti_sekkei'` を追加し、[Astro公式のGitHub Pagesガイド](https://docs.astro.build/ja/guides/deploy/github/)のワークフローを使ってください。リンクは `src/lib/url.ts` で base に対応しています。

## 素材とライセンス

- 気分アイコン：このサイトのために描いたSVG（`src/lib/moods.ts`）
- フォント：Google Fonts（Dela Gothic One、Zen Kaku Gothic New、JetBrains Mono / SIL Open Font License 1.1）
