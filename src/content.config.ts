import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { MOOD_KEYS } from './lib/moods';
import { CATEGORY_KEYS } from './lib/categories';

// きもち日記：その日の気分と出来事。1日1件。
const feel = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/feel' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    mood: z.enum(MOOD_KEYS),
    weather: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// テックノート：プロジェクト（project）と考え方メモ（note）。
const tech = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tech' }),
  schema: z.object({
    type: z.enum(['project', 'note']),
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    summary: z.string().optional(),
    // project のみ
    icon: z.string().max(3).optional(),
    status: z.enum(['plan', 'run', 'done']).optional(),
    progress: z.number().min(0).max(100).optional(),
    stack: z.array(z.string()).default([]),
    repo: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// まなびログ：学んだこと1件ごとに、かかった時間（分）とカテゴリを記録する。
const learn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/learn' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    minutes: z.number().int().positive(),
    category: z.enum(CATEGORY_KEYS),
    project: z.string().optional(), // tech のファイル名（拡張子なし）
    tags: z.array(z.string()).default([]),
    source: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { feel, tech, learn };
