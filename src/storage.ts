import type { Response } from './model';

/** 保存層。実装を差し替えられるよう、画面からはこのインターフェースだけを使う */
export interface Storage {
  save(r: Response): void;
  list(): Response[];
  patch(id: string, patch: Partial<Response>): void;
  clear(): void;
}

/** 端末内(localStorage)の実装。匿名の回答だけを保存する。使えない環境ではメモリに保持する */
export function createLocalStorage(key = 'rhsc26_responses_v2'): Storage {
  let mem: Response[] = [];
  const load = (): Response[] => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch { /* 使えない環境ではメモリを使う */ }
    return mem.slice();
  };
  const persist = (list: Response[]) => {
    mem = list.slice();
    try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* 同上 */ }
  };
  return {
    save: (r) => persist([...load(), r]),
    list: load,
    patch(id, patch) {
      const l = load();
      const i = l.findIndex((x) => x.id === id);
      if (i >= 0) { Object.assign(l[i], patch); persist(l); }
    },
    clear: () => persist([]),
  };
}
