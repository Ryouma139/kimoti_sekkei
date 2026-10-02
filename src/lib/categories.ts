// まなびログのカテゴリと、グラフで使う色。自分の学習テーマに合わせて書き換えてください。
export const CATEGORIES = {
  TypeScript: '#3B82F6',
  AWS: '#F59E0B',
  アルゴリズム: '#EC4899',
  設計: '#10B981',
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as [Category, ...Category[]];
