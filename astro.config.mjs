// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages（https://ryouma139.github.io/kimoti_sekkei/）で公開する。
// サイトが /kimoti_sekkei/ の下に置かれるので base を指定し、リンクは src/lib/url.ts の url() で付ける。
export default defineConfig({
  site: 'https://ryouma139.github.io',
  base: '/kimoti_sekkei',
  build: {
    // CSS は HTML に埋め込む。別ファイルだと、デプロイでファイル名が変わったときに
    // ブラウザに残っていた古い HTML（GitHub Pages は10分キャッシュする）が古い CSS を探して 404 になり、デザインが外れるため
    inlineStylesheets: 'always',
  },
  integrations: [
    {
      name: 'stable-client-file-names',
      hooks: {
        // ブラウザに送る JS のファイル名にハッシュを付けない（デプロイしても同じ名前で残るので、古い HTML からも読み込める）。
        // サーバー側（ビルド中に HTML を作る部分）まで変えるとビルドが壊れるので、client だけに設定する
        'astro:build:setup': ({ vite, target }) => {
          if (target !== 'client') return;
          vite.build ??= {};
          vite.build.rollupOptions ??= {};
          vite.build.rollupOptions.output = {
            ...vite.build.rollupOptions.output,
            entryFileNames: '_astro/[name].js',
            chunkFileNames: '_astro/[name].js',
            assetFileNames: '_astro/[name][extname]',
          };
        },
      },
    },
  ],
});
