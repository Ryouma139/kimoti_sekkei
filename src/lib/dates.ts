// 日付はすべて "YYYY-MM-DD" の文字列（日本時間の日付）で扱う。
// frontmatter の date: 2026-10-02 は UTC の 0時として読み込まれるので、UTC のまま文字列にすれば日付がずれない。

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export const ymd = (d: Date): string => d.toISOString().slice(0, 10);

/** ビルドした時点の日本時間の日付 */
export const todayJST = (): string => ymd(new Date(Date.now() + 9 * 60 * 60 * 1000));

export const addDays = (day: string, n: number): string => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
};

export const weekdayIndex = (day: string): number => new Date(`${day}T00:00:00Z`).getUTCDay();
export const weekday = (day: string): string => WEEKDAYS[weekdayIndex(day)];
export const WEEKDAY_LABELS = WEEKDAYS;

/** その月の日数（2026, 9 → 30）。うるう年の2月も29になる */
export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** (2026, 9, 5) → "2026-09-05" */
export const toYmd = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** "2026-10-02" → "10/2" */
export const monthDay = (day: string): string => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

/** "2026-10-02" → "2026.10.02" */
export const dotted = (day: string): string => day.replaceAll('-', '.');

/** 90 → "1時間30分" */
export const formatMinutes = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
};
