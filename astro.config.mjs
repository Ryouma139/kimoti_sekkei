// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages（https://ryouma139.github.io/kimoti_sekkei/）で公開する。
// サイトが /kimoti_sekkei/ の下に置かれるので base を指定し、リンクは src/lib/url.ts の url() で付ける。
export default defineConfig({
  site: 'https://ryouma139.github.io',
  base: '/kimoti_sekkei',
});
