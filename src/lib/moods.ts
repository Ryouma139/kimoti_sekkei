// 気分の種類。増やすときはここに1行足し、FACES と global.css の .blob.<key> も追加する。
export const MOODS = {
  great: { label: '最高', color: 'var(--m-great)' },
  happy: { label: 'うれしい', color: 'var(--m-happy)' },
  calm: { label: 'おだやか', color: 'var(--m-calm)' },
  meh: { label: 'もやもや', color: 'var(--m-meh)' },
  down: { label: 'しょんぼり', color: 'var(--m-down)' },
} as const;

export type Mood = keyof typeof MOODS;
export const MOOD_KEYS = Object.keys(MOODS) as [Mood, ...Mood[]];

// 表情のSVG（viewBox 0 0 60 60）。fill は親の svg で var(--face) を指定する。
export const FACES: Record<Mood, string> = {
  great:
    '<circle cx="21" cy="25" r="3.2"/><circle cx="39" cy="25" r="3.2"/><path d="M19 33 Q30 47 41 33 Z"/>' +
    '<ellipse cx="14" cy="34" rx="4" ry="2.6" fill="var(--cheek)" opacity=".55"/><ellipse cx="46" cy="34" rx="4" ry="2.6" fill="var(--cheek)" opacity=".55"/>',
  happy:
    '<circle cx="22" cy="26" r="3"/><circle cx="38" cy="26" r="3"/>' +
    '<path d="M21 35 Q30 43 39 35" fill="none" stroke="var(--face)" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="15" cy="34" rx="3.6" ry="2.4" fill="var(--cheek)" opacity=".5"/><ellipse cx="45" cy="34" rx="3.6" ry="2.4" fill="var(--cheek)" opacity=".5"/>',
  calm: '<path d="M17 27 Q21.5 22 26 27 M34 27 Q38.5 22 43 27 M24 37 Q30 41 36 37" fill="none" stroke="var(--face)" stroke-width="3" stroke-linecap="round"/>',
  meh:
    '<circle cx="22" cy="27" r="3"/><circle cx="38" cy="27" r="3"/>' +
    '<path d="M20 39 Q25 35 30 39 T40 39" fill="none" stroke="var(--face)" stroke-width="3" stroke-linecap="round"/>',
  down:
    '<circle cx="22" cy="28" r="3"/><circle cx="38" cy="28" r="3"/>' +
    '<path d="M22 41 Q30 34 38 41" fill="none" stroke="var(--face)" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M41 31 q2 5 0 7 q-2 -2 0 -7z" fill="var(--m-down)" stroke="var(--face)" stroke-width="1.2"/>',
};
