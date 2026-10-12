import { ANON_FORM, PERSONAL_FORM } from './config';
import type { Response } from './model';
import type { Storage } from './storage';

/** 個人情報用 Forms への事前入力リンク。個人を特定しない値(資格コード・領域・学び方)だけを渡す */
export function personalFormUrl(r: Pick<Response, 'top' | 'needs' | 'style'>): string {
  const p = new URLSearchParams({ usp: 'pp_url' });
  const e = PERSONAL_FORM.entries;
  if (e.firstCert && r.top[0]) p.set(e.firstCert, r.top[0]);
  if (e.needs && r.needs.length) p.set(e.needs, r.needs.join(','));
  if (e.style) p.set(e.style, r.style);
  return `${PERSONAL_FORM.url}?${p}`;
}

/** 日本時間の ISO 8601(例: 2026-10-12T13:31:43+09:00) */
export function toJstIso(ts: number): string {
  const d = new Date(ts + 9 * 3600_000).toISOString().slice(0, 19);
  return d + '+09:00';
}

/** 匿名 Form に送る本文。端末ID・IPなどは含めない(回答 id も送らない) */
export function anonPayload(r: Response): URLSearchParams {
  const e = ANON_FORM.entries;
  return new URLSearchParams({
    [e.role]: r.role,
    [e.needs]: r.needs.join(','),
    [e.exp]: String(r.exp),
    [e.prods]: r.prods.join(','),
    [e.timing]: r.timing,
    [e.style]: r.style,
    [e.top]: r.top.join(','),
    [e.ts]: toJstIso(r.ts),
  });
}

/** 1件送信する。no-cors のため応答の中身は読めず、通信が成立したかだけが分かる */
async function submitOne(r: Response): Promise<boolean> {
  try {
    await fetch(ANON_FORM.url, { method: 'POST', mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', body: anonPayload(r) });
    return true;
  } catch {
    return false; // オフライン等。端末内に残し、あとで再送する
  }
}

let flushing = false;
/** 未送信の回答を送る。回線が戻ったときにも呼ぶ */
export async function flushPending(store: Storage, onDone?: () => void): Promise<void> {
  if (!ANON_FORM.enabled || flushing) return;
  flushing = true;
  try {
    for (const r of store.list().filter((x) => !x.synced && !x.sample)) {
      if (await submitOne(r)) store.patch(r.id, { synced: true });
      else break;
    }
  } finally {
    flushing = false;
    onDone?.();
  }
}
