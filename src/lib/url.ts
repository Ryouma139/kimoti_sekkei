// astro.config.mjs の base を設定しても、リンクが壊れないようにするためのヘルパー。
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const url = (path: string): string => `${base}${path.startsWith('/') ? path : `/${path}`}`;
