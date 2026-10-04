// まなびログのカテゴリと、グラフで使う色。
// 中身は src/data/categories.json。管理画面の「カテゴリ」から追加・色の変更ができる（手で編集してもよい）。
import list from '../data/categories.json';

export type Category = string;

/** カテゴリ名 → 色（例: { TypeScript: '#3B82F6' }） */
export const CATEGORIES: Record<Category, string> = Object.fromEntries(list.map((c) => [c.name, c.color]));

/** カテゴリ名の一覧（並び順は categories.json の順） */
export const CATEGORY_KEYS = list.map((c) => c.name) as [Category, ...Category[]];
