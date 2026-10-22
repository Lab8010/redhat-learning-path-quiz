import { ANON_FORM, API_BASE } from './config';
import type { Response } from './model';
import type { Storage } from './storage';

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

/** 匿名 Form に1件送信する。no-cors のため応答の中身は読めず、通信が成立したかだけが分かる */
async function submitForm(r: Response): Promise<boolean> {
  try {
    await fetch(ANON_FORM.url, { method: 'POST', mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', body: anonPayload(r) });
    return true;
  } catch {
    return false; // オフライン等。端末内に残し、あとで再送する
  }
}

/** API の本文。id は再送時の重複防止用の乱数で、匿名 Form や個人情報用 Forms には渡さない */
export function apiPayload(r: Response) {
  return { id: r.id, ts: r.ts, role: r.role, needs: r.needs, exp: r.exp, prods: r.prods, timing: r.timing, style: r.style, top: r.top };
}

/** API に1件送信する。受け付けられた(または二度と受け付けられない不正な値だった)ときは true */
async function submitApi(r: Response): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/responses`, {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(apiPayload(r)),
    });
    if (res.ok) return true;
    return res.status === 400; // 400 は再送しても通らないので諦める。429・5xx はあとで再送する
  } catch {
    return false;
  }
}

let flushing = false;
/** 未送信の回答を、有効な宛先ごとに送る。回線が戻ったときにも呼ぶ */
export async function flushPending(store: Storage, onDone?: () => void): Promise<void> {
  const useApi = !!API_BASE, useForm = ANON_FORM.enabled;
  if ((!useApi && !useForm) || flushing) return;
  flushing = true;
  try {
    for (const r of store.list().filter((x) => !x.synced && !x.sample)) {
      let sentApi = !useApi || !!r.sentApi, sentForm = !useForm || !!r.sentForm;
      if (!sentApi && (sentApi = await submitApi(r))) store.patch(r.id, { sentApi: true });
      if (!sentForm && (sentForm = await submitForm(r))) store.patch(r.id, { sentForm: true });
      if (sentApi && sentForm) store.patch(r.id, { synced: true });
      else break;
    }
  } finally {
    flushing = false;
    onDone?.();
  }
}
