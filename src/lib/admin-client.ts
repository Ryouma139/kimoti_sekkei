// 管理画面（/admin/）のブラウザ側の共通処理。
// 記事は GitHub の Contents API でリポジトリに直接コミットする（DB は使わない）。
// トークンはブラウザの中だけで使い、GitHub 以外には送らない。
import { todayJST } from './dates';

export const REPO = 'Ryouma139/kimoti_sekkei';
export const BRANCH = 'main';
const TOKEN_KEY = 'kimochi-admin-token';

/**
 * 「このブラウザに保存する」なら localStorage、それ以外は sessionStorage。
 * sessionStorage のほうは、タブを閉じるか管理画面の外のページを開くと消える（forgetSessionToken）。
 */
export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

/** 管理画面の外に出たときに呼ぶ。保存しないを選んだトークン（sessionStorage）を消す */
export function forgetSessionToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function isTokenRemembered(): boolean {
  try {
    return localStorage.getItem(TOKEN_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveToken(token: string, remember: boolean): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {}
}

/** 今の日本時間（例: "2026-10-04T21:30:15+09:00"）。保存した日時として front matter の created に入れる */
export const nowJST = (): string => `${new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19)}+09:00`;

/** front matter の文字列。JSON 形式で書くと YAML としても正しく、" や : が入っても壊れない */
export const yamlString = (value: string): string => JSON.stringify(value);

/** "仕事, 散歩、読書" → ["仕事", "散歩", "読書"] */
export const splitList = (text: string): string[] =>
  text
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter(Boolean);

/** スラッグ（記事の URL やファイル名に使う名前）は英小文字・数字・ハイフンだけ。例: iam-policy */
export const isSlug = (text: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text);

/** admin で作る learn / tech のファイル名（拡張子なし）："2026-10-04" と "iam-policy" → "2026-10-04_iam-policy" */
export const articleFileName = (date: string, slug: string): string => `${date}_${slug || 'slug'}`;

export const isUrl = (text: string): boolean => {
  try {
    return ['http:', 'https:'].includes(new URL(text).protocol);
  } catch {
    return false;
  }
};

/** front matter と本文から Markdown を作る。値が undefined の行は出さない */
export function toMarkdown(data: [key: string, value: string | undefined][], body: string): string {
  const lines = data.filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`);
  return ['---', ...lines, '---', '', body.trim(), ''].join('\n');
}

// UTF-8 の文字列を base64 に（GitHub API はファイルの中身を base64 で受け取る）
const toBase64 = (text: string): string => {
  let binary = '';
  new TextEncoder().encode(text).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

/** 新しいファイルとしてコミットする。同じパスのファイルがあれば上書きせずエラーにする */
async function createFile(token: string, path: string, content: string, message: string): Promise<string | undefined> {
  // 日本語などを含むパスは1階層ずつ URL エンコードする
  const api = `https://api.github.com/repos/${REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };

  const exists = await fetch(`${api}?ref=${BRANCH}`, { headers, cache: 'no-store' });
  if (exists.ok) throw new Error(`同じファイル名の記事がすでにあります（${path}）。`);
  if (exists.status === 401) throw new Error('トークンが正しくないか、期限切れです。管理画面で設定し直してください。');
  if (exists.status !== 404) throw new Error(`確認に失敗しました（${exists.status}）。`);

  const res = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: toBase64(content), branch: BRANCH }),
  });
  if (res.status === 401 || res.status === 403) throw new Error('書き込む権限がありません。トークンの Contents 権限を確認してください。');
  if (!res.ok) throw new Error(`保存に失敗しました（${res.status}）。`);
  const json = await res.json().catch(() => ({}));
  return json?.commit?.html_url;
}

/** フォームの値（前後の空白は取る） */
export const value = (form: HTMLFormElement, name: string): string => {
  const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  return el ? el.value.trim() : '';
};

export const checked = (form: HTMLFormElement, name: string): boolean =>
  (form.elements.namedItem(name) as HTMLInputElement | null)?.checked ?? false;

interface AdminFormSpec {
  form: HTMLFormElement;
  /** 保存先（例: src/content/feel/2026-10-04.md） */
  path: () => string;
  markdown: () => string;
  /** コミットメッセージ */
  message: () => string;
  /** 入力エラーがあればメッセージを返す */
  validate: () => string | null;
  /** 入力のたびに呼ぶ（項目の出し分けなど） */
  onChange?: () => void;
}

/**
 * 3つの記事フォームで共通の動き。
 * - ファイル名と「保存される内容」のプレビューを更新
 * - data-today の日付欄に今日を入れる
 * - 保存ボタンで GitHub にコミットし、結果を表示
 */
export function setupAdminForm(spec: AdminFormSpec): void {
  const { form } = spec;
  const status = form.querySelector<HTMLElement>('[data-status]');
  const preview = form.querySelector<HTMLElement>('[data-preview]');
  const filename = form.querySelector<HTMLElement>('[data-filename]');
  const tokenWarning = document.querySelector<HTMLElement>('[data-token-warning]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  const setToday = () => form.querySelectorAll<HTMLInputElement>('input[data-today]').forEach((el) => (el.value = todayJST()));
  const refresh = () => {
    spec.onChange?.();
    if (filename) filename.textContent = spec.path();
    if (preview) preview.textContent = spec.markdown();
  };
  const setStatus = (message: string, kind: 'ok' | 'error' | '' = '', link?: string) => {
    if (!status) return;
    status.className = `status-msg ${kind}`;
    status.textContent = message;
    if (link) {
      const a = Object.assign(document.createElement('a'), { href: link, target: '_blank', rel: 'noopener', textContent: 'コミットを見る' });
      status.append(' ', a);
    }
  };

  const showTokenWarning = () => {
    if (tokenWarning) tokenWarning.hidden = Boolean(getToken());
  };
  showTokenWarning();
  // 戻るボタンでキャッシュから表示されたときも、今のトークンの有無に合わせる
  window.addEventListener('pageshow', showTokenWarning);
  setToday();
  refresh();
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) return setStatus('GitHub トークンが設定されていません。管理画面のトップで設定してください。', 'error');
    const error = spec.validate();
    if (error) return setStatus(error, 'error');

    if (button) button.disabled = true;
    setStatus('保存しています…');
    try {
      const commitUrl = await createFile(token, spec.path(), spec.markdown(), spec.message());
      setStatus('保存しました。数分後にサイトへ反映されます。', 'ok', commitUrl);
      form.reset();
      setToday();
      refresh();
    } catch (e) {
      // fetch 自体の失敗（オフラインなど）は TypeError になる
      setStatus(e instanceof TypeError ? '通信に失敗しました。ネットワークを確認してください。' : e instanceof Error ? e.message : '保存に失敗しました。', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  });
}
