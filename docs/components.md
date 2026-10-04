# components フォルダ解説

`src/components/` にある 7 つの `.astro` コンポーネントについて、
**何をするか / どこから呼ばれるか / どのファイルに依存しているか** をまとめたものです。
後半で `interface Props` と `Astro.props` の仕組みを詳しく説明します。

---

## 1. 全体像

```
pages/*.astro, layouts/BaseLayout.astro   ← コンポーネントを「呼ぶ側」
        │  props を渡す（<FeelCard entry={entry} /> など）
        ▼
components/*.astro                         ← 見た目の部品
        │  import して使う
        ▼
lib/*.ts  （moods / categories / dates / url / data）← 定数・型・計算ヘルパー
styles/global.css                          ← 見た目（CSS）はすべてここ
content.config.ts                          ← entry.data の型の元（スキーマ）
```

- コンポーネント自身は `<style>` を持たず、クラス名（`.blob` `.card` `.cal` など）だけを出力します。
  実際のスタイルは [src/styles/global.css](../src/styles/global.css) に書かれています。
- データの取得（`getFeel()` など）はページ側で行い、コンポーネントには **計算済みの値** を props で渡す、という役割分担です。

### 呼び出し関係の一覧

| コンポーネント | 呼び出し元 | 依存している lib |
| --- | --- | --- |
| MoodBlob | BaseLayout, index, 404, about, feel/index, feel/[...id], tags/[tag], **FeelCard**, **MoodCalendar** | moods |
| FeelCard | feel/index | moods, dates, url, data（型）＋ MoodBlob |
| MoodCalendar | index（ホーム） | moods, dates ＋ MoodBlob |
| ProjectCard | tech/index | url, dates, data（型） |
| StudyChart | learn/index | categories, dates |
| CategoryBars | learn/index | categories |
| TagList | feel/[...id], tech/[...id], learn/index | url |

`MoodBlob` だけは他のコンポーネント（FeelCard / MoodCalendar）からも使われる「一番小さい部品」です。

---

## 2. コンポーネントごとの説明

### MoodBlob.astro — 気分の顔アイコン

[src/components/MoodBlob.astro](../src/components/MoodBlob.astro)

```ts
interface Props {
  mood?: Mood;     // 'great' | 'happy' | 'calm' | 'meh' | 'down'
  size?: string;   // "56px" など。CSS 変数 --s に入る
  class?: string;  // 追加したいクラス
}
```

- `mood` があれば色付きの丸＋表情 SVG、なければ灰色の空の丸（カレンダーの「記録なし」の日用）を出します。
- 色は `MOODS[mood].color`、表情は `FACES[mood]`（SVG 文字列）を [lib/moods.ts](../src/lib/moods.ts) から取得。
- `set:html={FACES[mood]}` で SVG 文字列をそのまま埋め込んでいます。
- `class` は JS の予約語なので `const { class: className } = Astro.props` と **別名で受け取る** のがポイント。

呼び出し例:

```astro
<MoodBlob mood="happy" size="38px" />          <!-- BaseLayout のロゴ -->
<MoodBlob mood="meh" size="96px" />            <!-- 404 -->
<MoodBlob mood={entry.data.mood} />            <!-- FeelCard / feel/[...id] -->
<MoodBlob mood={moods[d]} />                   <!-- MoodCalendar（undefined もありうる） -->
```

### FeelCard.astro — きもち日記のカード

[src/components/FeelCard.astro](../src/components/FeelCard.astro)

```ts
interface Props {
  entry: FeelEntry;   // = CollectionEntry<'feel'>
}
```

- 日付・曜日・気分ラベル・タイトル・本文の抜粋（90 文字）を表示し、`/feel/<id>/` へリンク。
- 内部で `MoodBlob` を使用。
- `data-mood` 属性を付けているのは、[feel/index.astro](../src/pages/feel/index.astro) の気分フィルター（ボタン）で絞り込むため。

呼び出し: `feel/index.astro` → `{feel.map((entry) => <FeelCard entry={entry} />)}`

### MoodCalendar.astro — 気分カレンダー（ホーム）

[src/components/MoodCalendar.astro](../src/components/MoodCalendar.astro)

```ts
interface Props {
  moods: Record<string, Mood>;      // "2026-10-01" → 'happy'
  minutes: Record<string, number>;  // "2026-10-01" → 90（分）
  today: string;                    // 今日。この年の1〜12月を出し、この月を最初に表示
  items: Record<string, FeedItem[]>; // "2026-10-01" → その日の feel / learn / tech
}
```

- `today` の年の 1〜12 月を、月ごとの正しい日数（`daysInMonth`。9月は30日、うるう年の2月は29日）で出力。
- 各月の1日の曜日に合わせて `weekdayIndex(1日)` 個の空マスを入れています。
- 各日に `MoodBlob` と学習時間バー（150 分で満タン）を表示。今日は枠線、未来の日は薄く表示。
- 12か月分をすべて HTML に出し、今月以外は `hidden`。上の「‹ ›」ボタンで表示する月を切り替えます（`<script>` で `hidden` を付け替えるだけ）。
- 各日は `<button>`。クリックすると、カレンダーの下にその日の記録（`FeedRow` の一覧）を表示します。記録がある日の一覧だけを先に HTML に出しておき、`hidden` を付け替えています。記録がない日は「この日の記録はありません」。
- 下に凡例（全気分の `MoodBlob size="18px"`）も出力。

呼び出し: `index.astro`

```astro
<MoodCalendar moods={moodByDay(feel)} minutes={byDay} today={today} items={itemsByDay(feel, tech, learn)} />
```

`moodByDay` / `minutesByDay` / `itemsByDay` は [lib/data.ts](../src/lib/data.ts) の集計関数。`itemsByDay` では tech を作成日（`date`）と更新日（`updated`）の両方の日に入れています。

### FeedRow.astro — 記録の1行（ホーム）

[src/components/FeedRow.astro](../src/components/FeedRow.astro)

```ts
interface Props {
  item: FeedItem;  // lib/data.ts の feelItem / learnItem / techItem で作る共通の形
}
```

- きもち（`item.mood` あり）は気分の顔アイコン、テック・まなびは種類ごとの色の四角＋短い文字（`50m` や `KC`）。
- タイトル、日付・補足、種類ラベル（きもち／テック／まなび）を表示し、記事へリンク。

呼び出し: `index.astro`（最近の記録）と `MoodCalendar.astro`（日付クリック時の一覧）

```astro
{feed.map((item) => <FeedRow item={item} />)}
```

### ProjectCard.astro — プロジェクトカード

[src/components/ProjectCard.astro](../src/components/ProjectCard.astro)

```ts
interface Props {
  entry: TechEntry;  // = CollectionEntry<'tech'>
  minutes: number;   // このプロジェクトに使った学習時間（分）
}
```

- アイコン（なければタイトル先頭 2 文字）、ステータス（計画中/進行中/完了）、進捗バー、学習時間、使用技術チップを表示。
- `status = 'plan'`, `progress = 0` のように **分割代入のデフォルト値** で、frontmatter 未記入時に備えています。

呼び出し: `tech/index.astro`

```astro
<ProjectCard entry={entry} minutes={projectMinutes(learn, entry.id)} />
```

`projectMinutes` は learn の `project:` が tech のファイル名と一致するものを合計します。

### StudyChart.astro — 1 週間の積み上げ棒グラフ

[src/components/StudyChart.astro](../src/components/StudyChart.astro)

```ts
interface Props {
  days: { date: string; values: Record<string, number> }[];
  highlight?: string;  // 強調する日（今日）
}
```

- 日ごとにカテゴリ別の分数を積み上げ、Y 軸の目盛り（60 分 or 120 分刻み）を自動計算。
- 色は [lib/categories.ts](../src/lib/categories.ts) の `CATEGORIES`。

呼び出し: `learn/index.astro`

```astro
const week = minutesByDayCategory(learn, addDays(today, -6), today);
<StudyChart days={week} highlight={today} />
```

`days` の形は `minutesByDayCategory` の戻り値とそのまま一致するように設計されています。

### CategoryBars.astro — カテゴリ別の横棒

[src/components/CategoryBars.astro](../src/components/CategoryBars.astro)

```ts
interface Props {
  totals: Record<string, number>;  // カテゴリ名 → 分
}
```

- `CATEGORY_KEYS` の順に全カテゴリを並べ、最大値を 100% として横棒を描画。時間は `1h30` 形式。
- `totals` に無いカテゴリは `?? 0` で 0 扱い。

呼び出し: `learn/index.astro` → `<CategoryBars totals={minutesByCategory(learn, month)} />`

### TagList.astro — タグのチップ一覧

[src/components/TagList.astro](../src/components/TagList.astro)

```ts
interface Props {
  tags: string[];
}
```

- タグが 1 つ以上あるときだけ `#タグ` のリンクを並べ、`/tags/<tag>/` へ飛ばします（[pages/tags/[tag].astro](../src/pages/tags/[tag].astro)）。
- 日本語タグに備えて `encodeURIComponent` でエンコード。

呼び出し: `feel/[...id]`, `tech/[...id]`, `learn/index` → `<TagList tags={entry.data.tags} />`

---

## 3. `interface Props` と `Astro.props` を詳しく

### 3-1. 基本の流れ

`.astro` ファイルの先頭 `---` 〜 `---` は **コンポーネントスクリプト**（ビルド時にサーバー側で動く TypeScript）です。

```astro
---
// ① このコンポーネントが受け取る値の「型」を宣言
interface Props {
  tags: string[];
}

// ② 呼び出し側から渡された値を取り出す
const { tags } = Astro.props;
---

<!-- ③ テンプレートで使う -->
{tags.map((t) => <span>{t}</span>)}
```

呼び出し側:

```astro
<TagList tags={entry.data.tags} />
```

HTML の属性のように書いた `tags={...}` が、まとめて 1 つのオブジェクト `{ tags: [...] }` になり、
それが `Astro.props` に入ります。React の `function Comp(props)` の `props` と同じ考え方です。

### 3-2. `interface Props` の役割

- **名前は必ず `Props`**。Astro はこの名前の interface（または `type Props = ...`）を自動的に見つけて、
  `Astro.props` の型として使います。`import` や `export` は不要です。
- 効果は 2 つ:
  1. **コンポーネントの中**: `Astro.props.tags` が `string[]` 型になり、補完が効く・typo がエラーになる。
  2. **呼び出す側**: `<TagList tag={...} />`（綴り間違い）や必須 prop の渡し忘れを、エディタや `astro check` が検出してくれる。
- あくまで **型チェック用** で、実行時に値を検証するわけではありません（実際の値の検証は `content.config.ts` の zod スキーマが担当）。

### 3-3. このプロジェクトで使われている書き方

**省略可能な prop（`?`）**

```ts
interface Props {
  mood?: Mood;        // 渡さなくてもよい → 中では Mood | undefined
  size?: string;
}
```

MoodBlob は `mood` が `undefined` のとき空の丸を描く、という分岐をしています。

**デフォルト値（分割代入の `=`）**

```ts
const { size = '44px' } = Astro.props;   // 例
```

`size` を渡さなければ `'44px'` になります。`interface` 側は `size?: string` にしておくのがセット。（今のコンポーネントでは使っていませんが、省略できる props を作るときの書き方です）

**予約語の別名受け取り**

```ts
interface Props { class?: string; }
const { class: className } = Astro.props;   // MoodBlob
```

`class` はそのまま変数名にできないので、`className` という名前で受け取っています。

**JSDoc コメント**

```ts
/** CSSのサイズ（例: "56px"）。省略時は .blob の既定値 */
size?: string;
```

`/** */` で書くと、呼び出し側でマウスを乗せたときに説明が表示されます。

**他ファイルの型を使う**

```ts
import type { FeelEntry } from '../lib/data';   // CollectionEntry<'feel'>
import { type Mood } from '../lib/moods';       // 'great' | 'happy' | ...

interface Props {
  entry: FeelEntry;
}
```

`FeelEntry` は `content.config.ts` のスキーマから自動生成された型なので、
`entry.data.mood` や `entry.data.title` の型まで正しく付きます。
`Mood` は `MOODS` オブジェクトのキーから作られた型（`keyof typeof MOODS`）なので、
moods.ts に気分を 1 つ足せば、MoodBlob の `mood` で使える値も自動で増えます。

### 3-4. 型のつながり（例: FeelCard）

```
content.config.ts  … feel の zod スキーマ（mood: z.enum(MOOD_KEYS) など）
      │ Astro が型を生成
      ▼
lib/data.ts        … export type FeelEntry = CollectionEntry<'feel'>
      │
      ▼
FeelCard.astro     … interface Props { entry: FeelEntry }
      │ entry.data.mood（型: Mood）
      ▼
MoodBlob.astro     … interface Props { mood?: Mood }
```

スキーマを変更すると、その影響がコンポーネントの props まで型として伝わる構造になっています。

### 3-5. よくある注意点

- `Astro.props` は **ビルド時に一度だけ** 評価されます（このサイトは静的生成）。ブラウザで値が変わっても再描画はされません。
  動きが必要な部分（feel/index の気分フィルターなど）はページ側の `<script>` で DOM を操作しています。
- 関数や Date オブジェクトも props として渡せます（サーバー側で完結するため）。
  ただし、クライアントへ渡す `<script>` や `client:*` 付きフレームワーク部品では使えないので注意。
- `interface Props` を書き忘れても動きますが、`Astro.props` が `Record<string, any>` 相当になり、型チェックが効かなくなります。
