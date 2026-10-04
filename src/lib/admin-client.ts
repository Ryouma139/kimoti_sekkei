// 管理画面（/admin/）のブラウザ側の共通処理。
// 記事は GitHub の Contents API でリポジトリに直接コミットする（DB は使わない）。新規作成と、既存記事の修正（?edit=）に対応。
// トークンはブラウザの中だけで使い、GitHub 以外には送らない。
import { parse as parseYaml } from 'yaml';
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


// base64 の UTF-8 → 文字列（GitHub API が返すファイルの中身。途中に改行が入っている）
const fromBase64 = (base64: string): string =>
  new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

/** GitHub Contents API の URL。日本語などを含むパスは1階層ずつ URL エンコードする */
const contentsApi = (path: string) => `https://api.github.com/repos/${REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' });

/** 今 GitHub にあるファイル。なければ null */
async function getFile(token: string, path: string): Promise<{ sha: string; text: string } | null> {
  const res = await fetch(`${contentsApi(path)}?ref=${BRANCH}`, { headers: authHeaders(token), cache: 'no-store' });
  if (res.status === 404) return null;
  if (res.status === 401) throw new Error('トークンが正しくないか、期限切れです。管理画面で設定し直してください。');
  if (!res.ok) throw new Error(`GitHub からの読み込みに失敗しました（${res.status}）。`);
  const json = await res.json();
  return { sha: json.sha, text: fromBase64(json.content ?? '') };
}

/**
 * GitHub にファイルがあるか。リポジトリは公開なのでトークンなしでも確認できる（あれば使う）。
 * 確認できなかったとき（通信エラー・回数制限など）は null
 */
export async function fileExists(path: string): Promise<boolean | null> {
  const check = async (headers: Record<string, string>) => {
    const res = await fetch(`${contentsApi(path)}?ref=${BRANCH}`, { headers, cache: 'no-store' });
    return res.ok ? true : res.status === 404 ? false : null;
  };
  try {
    const token = getToken();
    const result = token ? await check(authHeaders(token)) : null;
    // トークンなし、またはトークンが正しくない・期限切れで確認できなかったときは、トークンなしで確かめ直す
    return result ?? (await check({ Accept: 'application/vnd.github+json' }));
  } catch {
    return null;
  }
}

/** ファイルをコミットする。sha を渡すと既存ファイルの上書き（修正）、渡さなければ新規作成 */
async function putFile(token: string, path: string, content: string, message: string, sha?: string): Promise<{ commitUrl?: string; sha?: string }> {
  const res = await fetch(contentsApi(path), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ message, content: toBase64(content), branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (res.status === 401 || res.status === 403) throw new Error('書き込む権限がありません。トークンの Contents 権限を確認してください。');
  if (res.status === 409) throw new Error('GitHub 上でこの記事が変更されています。ページを読み込み直してから修正してください。');
  // 新規作成（sha なし）で 422 になるのは、確認のあと保存までの間に同じファイルが作られた場合（別のタブから同時に保存など）
  if (res.status === 422 && !sha) throw new Error(`同じファイル名の記事がすでにあります（${path}）。`);
  if (!res.ok) throw new Error(`保存に失敗しました（${res.status}）。`);
  const json = await res.json().catch(() => ({}));
  return { commitUrl: json?.commit?.html_url, sha: json?.content?.sha };
}

/** "---\n<front matter>\n---\n<本文>" を分ける */
function splitFrontMatter(text: string): { data: Record<string, unknown>; body: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error('記事の先頭（--- で囲んだ部分）を読み取れませんでした。GitHub で編集してください。');
  const data = parseYaml(match[1]);
  return { data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {}, body: match[2].trim() };
}

/** front matter の値をフォームの各項目に入れる（項目名＝front matter のキー） */
function fillForm(form: HTMLFormElement, data: Record<string, unknown>, body: string): void {
  for (const [key, raw] of Object.entries(data)) {
    const el = form.elements.namedItem(key);
    if (!el) continue;
    const text = Array.isArray(raw) ? raw.join(', ') : raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw ?? '');
    if (el instanceof RadioNodeList) el.value = text;
    else if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = raw === true;
    else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.value = text;
  }
  const bodyEl = form.elements.namedItem('body');
  if (bodyEl instanceof HTMLTextAreaElement) bodyEl.value = body;
}

/** フォームの値（前後の空白は取る） */
export const value = (form: HTMLFormElement, name: string): string => {
  const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  return el ? el.value.trim() : '';
};

export const checked = (form: HTMLFormElement, name: string): boolean =>
  (form.elements.namedItem(name) as HTMLInputElement | null)?.checked ?? false;

/** 各フォームに渡す、今の状態 */
export interface AdminFormContext {
  /** 既存の記事を修正中か */
  editing: boolean;
  /** front matter の created に入れる値。新規は今の時刻、修正は元の値（元になければ undefined） */
  created: string | undefined;
}

interface AdminFormSpec {
  form: HTMLFormElement;
  /** 新しく書くときの保存先（例: src/content/feel/2026-10-04.md）。修正のときは元のファイルに上書きする */
  path: () => string;
  markdown: (ctx: AdminFormContext) => string;
  /** コミットメッセージ */
  message: () => string;
  /** 入力エラーがあればメッセージを返す */
  validate: (ctx: AdminFormContext) => string | null;
  /** 入力のたびに呼ぶ（項目の出し分けなど） */
  onChange?: () => void;
}

/**
 * 3つの記事フォームで共通の動き。
 * - ファイル名と「保存される内容」のプレビューを更新
 * - data-today の日付欄に今日を入れる
 * - 保存ボタンで GitHub にコミットし、結果を表示
 * - URL に ?edit=<ファイルのパス> があれば、その記事を GitHub から読み込んで修正モードにする
 *   （data-lock-on-edit の項目＝ファイル名に関わる日付・スラッグは変更不可）
 */
export function setupAdminForm(spec: AdminFormSpec): void {
  const { form } = spec;
  const status = form.querySelector<HTMLElement>('[data-status]');
  const preview = form.querySelector<HTMLElement>('[data-preview]');
  const filename = form.querySelector<HTMLElement>('[data-filename]');
  const tokenWarning = document.querySelector<HTMLElement>('[data-token-warning]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  // 修正中の記事。sha は読み込んだ時点の版で、保存時に GitHub 側と比べて上書き事故を防ぐ
  let editing: { path: string; sha: string; created: string | undefined } | null = null;
  const ctx = (): AdminFormContext => ({ editing: Boolean(editing), created: editing ? editing.created : nowJST() });
  const currentPath = () => editing?.path ?? spec.path();

  const setToday = () => form.querySelectorAll<HTMLInputElement>('input[data-today]').forEach((el) => (el.value = todayJST()));
  const refresh = () => {
    spec.onChange?.();
    if (filename) filename.textContent = currentPath();
    if (preview) preview.textContent = spec.markdown(ctx());
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
  const errorMessage = (e: unknown) =>
    // fetch 自体の失敗（オフラインなど）は TypeError になる
    e instanceof TypeError ? '通信に失敗しました。ネットワークを確認してください。' : e instanceof Error ? e.message : '保存に失敗しました。';

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

  // ?edit=src/content/feel/2026-10-04.md → その記事を読み込んで修正モードに
  const editPath = new URLSearchParams(location.search).get('edit');
  if (editPath) void startEditing(editPath);

  async function startEditing(path: string) {
    // このフォームの種類のフォルダ（src/content/feel/ など）の .md だけを受け付ける
    const folder = spec.path().replace(/[^/]*$/, '');
    if (!path.startsWith(folder) || !path.endsWith('.md') || path.includes('..')) return setStatus('このページでは修正できないファイルです。', 'error');
    const token = getToken();
    if (!token) return setStatus('記事を修正するには、GitHub トークンを設定してください。', 'error');

    if (button) button.disabled = true;
    setStatus('記事を読み込んでいます…');
    try {
      const file = await getFile(token, path);
      if (!file) throw new Error(`GitHub 上に記事が見つかりません（${path}）。削除された可能性があります。`);
      const { data, body } = splitFrontMatter(file.text);
      fillForm(form, data, body);

      // スラッグ欄：ファイル名から「日付_」を除いたもの（古い記事はファイル名そのまま）
      const slugEl = form.elements.namedItem('slug');
      if (slugEl instanceof HTMLInputElement) {
        const stem = path.slice(path.lastIndexOf('/') + 1, -'.md'.length);
        const prefix = `${String(data.date ?? '')}_`;
        slugEl.value = stem.startsWith(prefix) ? stem.slice(prefix.length) : stem;
      }
      form.querySelectorAll<HTMLInputElement>('[data-lock-on-edit]').forEach((el) => (el.readOnly = true));

      editing = { path, sha: file.sha, created: data.created === undefined ? undefined : String(data.created) };
      const banner = document.createElement('p');
      banner.className = 'panel edit-banner';
      banner.append('修正中：', Object.assign(document.createElement('code'), { textContent: path }), '（日付・スラッグはファイル名に使うため変更できません） ');
      banner.append(Object.assign(document.createElement('a'), { href: location.pathname, textContent: '新しく書く' }));
      form.before(banner);
      if (button) button.textContent = '修正を保存';
      setStatus('');
      refresh();
    } catch (e) {
      setStatus(errorMessage(e), 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) return setStatus('GitHub トークンが設定されていません。管理画面のトップで設定してください。', 'error');
    const error = spec.validate(ctx());
    if (error) return setStatus(error, 'error');

    if (button) button.disabled = true;
    setStatus('保存しています…');
    try {
      if (editing) {
        // 読み込んだあとに GitHub 上で変更されていたら、上書きしない
        const latest = await getFile(token, editing.path);
        if (!latest) throw new Error('GitHub 上に記事が見つかりません。削除された可能性があります。');
        if (latest.sha !== editing.sha) throw new Error('読み込んだあとに GitHub 上でこの記事が変更されています。ページを読み込み直してから修正してください。');
        const result = await putFile(token, editing.path, spec.markdown(ctx()), `修正 ${spec.message()}`, editing.sha);
        if (result.sha) editing.sha = result.sha;
        setStatus('修正を保存しました。数分後にサイトへ反映されます。', 'ok', result.commitUrl);
      } else {
        if (await getFile(token, spec.path())) throw new Error(`同じファイル名の記事がすでにあります（${spec.path()}）。`);
        const result = await putFile(token, spec.path(), spec.markdown(ctx()), spec.message());
        setStatus('保存しました。数分後にサイトへ反映されます。', 'ok', result.commitUrl);
        form.reset();
        setToday();
        refresh();
      }
    } catch (e) {
      setStatus(errorMessage(e), 'error');
    } finally {
      if (button) button.disabled = false;
    }
  });
}
