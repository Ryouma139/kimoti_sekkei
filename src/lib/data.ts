import { getCollection, type CollectionEntry } from 'astro:content';
import { addDays, ymd } from './dates';
import type { Mood } from './moods';

export type FeelEntry = CollectionEntry<'feel'>;
export type TechEntry = CollectionEntry<'tech'>;
export type LearnEntry = CollectionEntry<'learn'>;

type Sortable = { id: string; data: { date: Date; created?: Date } };

/**
 * 新しい順。日付が同じなら書いた日時（created）が新しい順。
 * created がない記事（手で書いたものなど）はその日の中でいちばん古い扱いにし、それ同士はファイル名の順にする。
 * ファイル名まで比べるのは、手元と GitHub Actions でビルド結果がずれないようにするため。
 */
const byDateDesc = (a: Sortable, b: Sortable) =>
  b.data.date.getTime() - a.data.date.getTime() ||
  (b.data.created?.getTime() ?? 0) - (a.data.created?.getTime() ?? 0) ||
  a.id.localeCompare(b.id);

export const getFeel = async () => (await getCollection('feel', (e) => !e.data.draft)).sort(byDateDesc);
export const getTech = async () => (await getCollection('tech', (e) => !e.data.draft)).sort(byDateDesc);
export const getLearn = async () => (await getCollection('learn', (e) => !e.data.draft)).sort(byDateDesc);

/** 管理画面の「保存記事一覧」用：下書きも含めた全記事（新しい順）。サイトの表示には使わない */
export const getAllForAdmin = async () => {
  const [feel, tech, learn] = await Promise.all([getCollection('feel'), getCollection('tech'), getCollection('learn')]);
  return { feel: feel.sort(byDateDesc), tech: tech.sort(byDateDesc), learn: learn.sort(byDateDesc) };
};

/** 日付ごとの気分（同じ日に複数あれば、あとに書いたほう） */
export function moodByDay(feel: FeelEntry[]): Record<string, Mood> {
  const map: Record<string, Mood> = {};
  for (const e of [...feel].reverse()) map[ymd(e.data.date)] = e.data.mood;
  return map;
}

/** 日付ごとの学習時間（分） */
export function minutesByDay(learn: LearnEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of learn) {
    const day = ymd(e.data.date);
    map[day] = (map[day] ?? 0) + e.data.minutes;
  }
  return map;
}

/** 指定した期間の、日付×カテゴリの学習時間 */
export function minutesByDayCategory(learn: LearnEntry[], start: string, end: string) {
  const days: { date: string; values: Record<string, number> }[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push({ date: d, values: {} });
  const index = new Map(days.map((d) => [d.date, d.values]));
  for (const e of learn) {
    const values = index.get(ymd(e.data.date));
    if (values) values[e.data.category] = (values[e.data.category] ?? 0) + e.data.minutes;
  }
  return days;
}

/** 指定した月（"2026-10"）のカテゴリ別合計 */
export function minutesByCategory(learn: LearnEntry[], month: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of learn) {
    if (!ymd(e.data.date).startsWith(month)) continue;
    map[e.data.category] = (map[e.data.category] ?? 0) + e.data.minutes;
  }
  return map;
}

/** 連続学習日数。今日まだ記録がなければ昨日から数える。 */
export function studyStreak(byDay: Record<string, number>, today: string): number {
  let day = byDay[today] ? today : addDays(today, -1);
  let count = 0;
  while (byDay[day]) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

/** プロジェクトに関連する学習時間（分） */
export function projectMinutes(learn: LearnEntry[], projectId: string): number {
  return learn.filter((e) => e.data.project === projectId).reduce((sum, e) => sum + e.data.minutes, 0);
}

/** カレンダーに出す年の一覧。いちばん古い記事の年〜（いちばん新しい記事の年と今年の、遅いほう） */
export function calendarYears(feel: FeelEntry[], tech: TechEntry[], learn: LearnEntry[], thisYear: number): number[] {
  const years = [...feel, ...tech, ...learn].map((e) => Number(ymd(e.data.date).slice(0, 4)));
  const from = Math.min(thisYear, ...years);
  const to = Math.max(thisYear, ...years);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** 3種類の記事のタグをまとめる */
export function allTags(feel: FeelEntry[], tech: TechEntry[], learn: LearnEntry[]): string[] {
  const set = new Set<string>();
  for (const e of [...feel, ...tech, ...learn]) e.data.tags.forEach((t) => set.add(t));
  return [...set].sort((a, b) => a.localeCompare(b, 'ja'));
}

/** ホームの一覧（最近の記録・カレンダーの日別）で使う、3種類共通の1行分 */
export type FeedItem = {
  kind: 'feel' | 'tech' | 'learn';
  date: Date;
  title: string;
  meta: string;
  href: string;
  icon: string;
  mood?: Mood;
  /** 書いた日時（同じ日付の並び順に使う） */
  created?: Date;
};

export const KIND_LABEL = { feel: 'きもち', tech: 'テック', learn: 'まなび' } as const;

export const feelItem = (e: FeelEntry): FeedItem => ({
  kind: 'feel',
  date: e.data.date,
  title: e.data.title,
  meta: 'きもち日記',
  href: `/feel/${e.id}/`,
  icon: '',
  mood: e.data.mood,
  created: e.data.created,
});

export const learnItem = (e: LearnEntry): FeedItem => ({
  kind: 'learn',
  date: e.data.date,
  title: e.data.title,
  meta: e.data.category,
  href: `/learn/#${e.id}`,
  icon: `${e.data.minutes}m`,
  created: e.data.created,
});

/** date を省略すると更新日（なければ作成日） */
export const techItem = (e: TechEntry, date: Date = e.data.updated ?? e.data.date): FeedItem => ({
  kind: 'tech',
  date,
  title: e.data.title,
  meta: e.data.type === 'project' ? `プロジェクト・進捗 ${e.data.progress ?? 0}%` : '考え方メモ',
  href: `/tech/${e.id}/`,
  icon: e.data.icon ?? e.data.title.slice(0, 2),
  created: e.data.created,
});

/** 日付ごとの記録（"2026-10-01" → その日の feel / learn / tech）。tech は作成日と更新日の両方に入れる */
export function itemsByDay(feel: FeelEntry[], tech: TechEntry[], learn: LearnEntry[]): Record<string, FeedItem[]> {
  const map: Record<string, FeedItem[]> = {};
  const add = (item: FeedItem) => (map[ymd(item.date)] ??= []).push(item);
  feel.forEach((e) => add(feelItem(e)));
  learn.forEach((e) => add(learnItem(e)));
  for (const e of tech) {
    add(techItem(e, e.data.date));
    if (e.data.updated && ymd(e.data.updated) !== ymd(e.data.date)) add(techItem(e, e.data.updated));
  }
  return map;
}
