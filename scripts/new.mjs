// 新しい記事のひな形を作る。
//   npm run new:feel                 → src/content/feel/2026-10-02.md
//   npm run new:learn -- iam-policy  → src/content/learn/2026-10-02-iam-policy.md
//   npm run new:tech -- my-app       → src/content/tech/my-app.md
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const [kind, slug] = process.argv.slice(2);
const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

const templates = {
  feel: {
    path: `src/content/feel/${today}.md`,
    body: `---
title: 
date: ${today}
mood: calm # great / happy / calm / meh / down
weather: 
tags: []
---

`,
  },
  learn: {
    path: `src/content/learn/${today}-${slug ?? 'til'}.md`,
    body: `---
title: 
date: ${today}
minutes: 30
category: TypeScript # src/data/categories.json のどれか（管理画面の「カテゴリ」で追加できる）
# project: kimochi-code
tags: []
# source: https://
---

`,
  },
  tech: {
    path: `src/content/tech/${slug ?? 'new-note'}.md`,
    body: `---
type: note # project / note
title: 
date: ${today}
summary: 
# project のときだけ
# icon: AB
# status: plan # plan / run / done
# progress: 0
# stack: []
tags: []
---

## 背景

## 決定

## 理由
`,
  },
};

const t = templates[kind];
if (!t) {
  console.error('使い方: node scripts/new.mjs <feel|learn|tech> [slug]');
  process.exit(1);
}
if (existsSync(t.path)) {
  console.error(`すでにあります: ${t.path}`);
  process.exit(1);
}
mkdirSync(dirname(t.path), { recursive: true });
writeFileSync(t.path, t.body);
console.log(`作成しました: ${t.path}`);
