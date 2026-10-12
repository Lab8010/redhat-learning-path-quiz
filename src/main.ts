import './fonts';
import './style.css';
import { IDLE_MS, LINKS, STAFF_PIN, ANON_FORM, API_BASE } from './config';
import { CERTS, EXPS, LVN, NEEDS, NEED_KEYS, PRODS, QS, ROLES, STYLES, TIMINGS, type Answers, type CompleteAnswers, type Domain, type Response } from './model';
import { recommend, type Rec } from './recommend';
import { agg, csvOf } from './aggregate';
import { createLocalStorage } from './storage';
import { flushPending, personalFormUrl } from './forms';
import { sampleResponses } from './sample';
import { qrSvg } from './qr';
import { fetchRows } from './remote';

const store = createLocalStorage();
const SAMPLES = sampleResponses();
const app = document.getElementById('app')!;
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

type View = 'start' | 'q' | 'result' | 'pin' | 'staff';
const emptyAnswers = (): Answers => ({ role: null, needs: [], exp: null, prods: [], timing: null, style: null });
const S = {
  src: (API_BASE ? 'remote' : 'local') as 'remote' | 'local',
  view: 'start' as View, qi: 0, a: emptyAnswers(), res: null as Response | null, recs: [] as Rec[],
  tab: 'dash', samples: import.meta.env.DEV || location.hash === '#demo', pinErr: false, confirmClear: false, csv: null as string | null,
};
let lastActive = Date.now();

/* スタッフ画面の「全体」表示: 全端末の回答を Worker の API から読む。合言葉はタブを閉じると消える */
const TOKEN_KEY = 'rhsc26_staff_token';
const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const setToken = (t: string) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* 保存できない環境では毎回入力 */ } };
const R = { rows: null as Response[] | null, at: 0, err: '' };
async function refreshRemote() {
  const token = getToken();
  if (!API_BASE || !token) return;
  const res = await fetchRows(`${API_BASE}/api/rows`, token);
  if (res.ok) { R.rows = res.rows; R.at = Date.now(); R.err = ''; }
  else if (res.error === 'unauthorized') { setToken(''); R.rows = null; R.err = '合言葉が違います。'; }
  else R.err = res.error === 'network' ? '取得できませんでした(回線を確認してください)。前回の表示を残しています。' : '想定外の応答でした。API の設定を確認してください。';
  if (S.view === 'staff' && S.src === 'remote') render();
}

function resetAnswers() { S.a = emptyAnswers(); S.qi = 0; S.res = null; S.recs = []; }
function go(view: View) { S.view = view; render(); window.scrollTo(0, 0); }

function header(right = '') {
  return `<div class="top"><div class="brand"><i></i>Red Hat Summit: Connect 2026 Tokyo ・ 教育サービスブース</div>${right}</div>`;
}

function vStart() {
  return header() + `
  <section class="hero">
    <div>
      <h1 class="display">あなたに合う<br><em>学習パス</em>を<br>30秒で診断</h1>
      <p class="lead">6つの質問に答えると、あなたの役割・スキル・学び方に合った Red Hat のトレーニングコースと認定資格を5つ表示します。</p>
      <ul class="facts"><li><b>6</b>問</li><li><b>45</b>秒ほど</li><li><b>5</b>件のおすすめ</li></ul>
      <button class="btn primary" data-act="begin" style="min-width:240px">診断をはじめる</button>
      <p class="notice">回答は匿名で集計し、今後のトレーニングの企画に使います。この診断では、お名前・メールアドレスなどの個人情報は入力しません。</p>
    </div>
    <aside class="stairs" aria-label="資格のレベル">
      <h2>資格は4つのレベルで進みます</h2>
      <ol>
        <li style="--i:0"><span class="lvl">Lv100 初級</span><span class="code mono">EX180</span></li>
        <li style="--i:1"><span class="lvl">Lv200 中級</span><span class="code mono">EX280</span></li>
        <li style="--i:2"><span class="lvl">Lv300 上級</span><span class="code mono">EX380</span></li>
        <li style="--i:3"><span class="lvl">Lv400 専門</span><span class="code mono">EX430</span></li>
      </ol>
      <small>OpenShift トラックの例。Linux・Ansible・AI にも同じ段階があります。</small>
    </aside>
  </section>
  <div style="margin-top:18px"><button class="link-btn" data-act="staff">スタッフ用</button></div>`;
}

function optHtml(q: (typeof QS)[number], o: (typeof QS)[number]['o'][number], sel: unknown) {
  const isOne = q.type === 'one';
  const on = isOne ? String(sel) === String(o[0]) : (sel as string[]).includes(String(o[0]));
  const ord = !isOne && q.k === 'needs' && on ? `<span class="ord">${(sel as string[]).indexOf(String(o[0])) + 1}番目</span>` : '';
  return `<li><button class="opt${on ? ' sel' : ''}" data-act="pick" data-v="${esc(o[0])}" aria-pressed="${on}">
    <span class="mark ${isOne ? 'r' : 'c'}">${on ? '✓' : ''}</span>
    <span><span class="t">${esc(o[1])}</span>${o[2] ? `<span class="s">${esc(o[2])}</span>` : ''}</span>${ord}</button></li>`;
}
function vQ() {
  const q = QS[S.qi];
  const sel = S.a[q.k];
  const prog = QS.map((_, i) => `<span class="${i <= S.qi ? 'on' : ''}"></span>`).join('');
  const multi = q.type === 'multi';
  const canNext = multi ? (sel as string[]).length > 0 : sel !== null;
  return header(`<button class="link-btn" data-act="abort">最初に戻る</button>`) + `
  <div class="progress" aria-hidden="true">${prog}</div>
  <div class="qhead"><span>質問 ${S.qi + 1} / ${QS.length}</span></div>
  <h1 class="display q-title">${esc(q.t)}</h1>
  <p class="q-hint">${esc(q.h)}</p>
  <ul class="opts ${q.cols === 2 ? 'two' : ''}">${q.o.map((o) => optHtml(q, o, sel)).join('')}</ul>
  <div class="qfoot">
    <button class="btn small" data-act="back">戻る</button>
    ${multi ? `<button class="btn primary" data-act="next" ${canNext ? '' : 'disabled'}>${S.qi === QS.length - 1 ? '結果を見る' : '次へ'}</button>` : '<span></span>'}
  </div>`;
}

function styleCta() {
  const st = S.a.style as keyof typeof STYLES;
  const map = {
    ilt: { h: '講師付きのコースで集中して学ぶ', p: 'クラスルームまたはオンラインの講師付きコースで、実機演習を通して短期間で身につけられます。', b: ['コースと試験の一覧', LINKS.allCourses] },
    sub: { h: 'ラーニングサブスクリプションを無料で試す', p: 'RHEL・OpenShift・OpenStack・Ansible・AI まで学び放題。まずはトライアルで学習体験を確かめてください。', b: ['無料トライアルを開始', LINKS.trial] },
    self: { h: '実技試験の認定資格で実力を証明する', p: 'Red Hat の認定試験は実機を操作する実技形式です。上のおすすめから目標の資格を選べます。', b: ['認定資格の一覧', LINKS.certPage] },
    team: { h: 'チーム全体の育成計画を相談する', p: '部署や会社単位の育成計画は、ブースのスタッフにお声がけください。オンラインでも相談できます。', b: ['トレーニングのお問い合わせ', LINKS.contact] },
  }[st]!;
  const showTrial = st !== 'sub';
  return `<section class="cta"><h2>${esc(map.h)}</h2><p>${esc(map.p)}</p>
    <div class="row"><a class="btn primary" href="${map.b[1]}" target="_blank" rel="noopener" data-act="trial">${esc(map.b[0])}</a>
    ${showTrial ? `<a class="btn" href="${LINKS.trial}" target="_blank" rel="noopener" data-act="trial">学び放題を無料で試す</a>` : ''}</div>
    <p><a class="alt" href="${LINKS.certList}" target="_blank" rel="noopener">資格の全一覧とロードマップを見る</a></p></section>`;
}
function vResult() {
  const a = S.a as CompleteAnswers;
  const chips = [`<span class="chip">${esc(ROLES[a.role])}</span>`, ...a.needs.map((n) => `<span class="chip hit">${esc(NEEDS[n].l)}</span>`), `<span class="chip">${esc(EXPS[a.exp])}</span>`, `<span class="chip">${esc(TIMINGS[a.timing])}</span>`].join('');
  const recs = S.recs.map((r, i) => {
    const c = r.c;
    return `<li class="rec${i === 0 ? ' first' : ''}"><div class="rank" aria-label="ステップ${i + 1}">${i + 1}</div><div>
      <div class="rec-meta"><span class="lv">Lv${c.lv * 100} ${LVN[c.lv]}</span><span class="mono">${c.exam}</span>${i === 0 ? '<span class="chip hit">最初の一歩</span>' : ''}</div>
      <h3>${esc(c.n)}</h3><p>${esc(c.desc)}</p>
      <div class="chips">${r.reasons.map((x) => `<span class="chip${x.hit ? ' hit' : ''}">${esc(x.t)}</span>`).join('')}</div>
      <div class="course"><span><span class="mono">${c.course}</span></span><span class="cn">${esc(c.cn)}</span>
        <a href="${c.curl}" target="_blank" rel="noopener">コース詳細</a><a href="${c.url}" target="_blank" rel="noopener">試験詳細</a></div>
    </div></li>`;
  }).join('');
  const formUrl = personalFormUrl(S.res!);
  const mail = `
    <section class="mail"><h2>結果とご案内をメールで受け取る(任意)</h2>
      <p>Google フォームが別のタブで開きます。お名前・メールアドレスはフォームでご入力ください(この診断アプリには保存されません)。診断結果の資格コードと必要な領域は、フォームに自動で入ります。</p>
      <a class="btn small primary" href="${esc(formUrl)}" target="_blank" rel="noopener" data-act="forms">フォームを開く</a>
      <div class="qr">${qrSvg(formUrl)}<small>別の端末で開く場合は、QRコードを読み取ってください</small></div></section>`;
  return header() + `
  <div class="res-head"><h1 class="display">あなたに合ったトレーニングコースと資格はこちら！</h1></div>
  <div class="profile">${chips}</div>
  <p class="q-hint" style="margin:0 0 14px">入門レベルのものから順に並べています。上から順に進めると、無理なくステップアップできます。</p>
  <ol class="recs">${recs}</ol>
  ${styleCta()}
  ${mail}
  <div class="next-person"><button class="btn primary" data-act="again">次の方へ</button></div>`;
}

function vPin() {
  return header(`<button class="link-btn" data-act="abort">戻る</button>`) + `<form class="pin" id="pinform"><h2 style="font-weight:900">スタッフ用 PIN</h2>
    <input id="pin" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="PIN">
    ${S.pinErr ? '<div class="err">PINが違います</div>' : ''}
    <button class="btn primary" type="submit">開く</button>
    <p class="note">この PIN は端末内の簡易な確認で、認証ではありません。この画面には、この端末で回答された匿名のデータだけが表示されます。</p></form>`;
}

function bar(label: string, v: number, max: number, total: number, top: boolean) {
  const w = max ? Math.round((v / max) * 100) : 0;
  const pct = total ? Math.round((v / total) * 100) : 0;
  return `<div class="bar${top ? ' top' : ''}"><span class="lab">${esc(label)}</span><span class="tr"><span class="fl" style="display:block;width:${w}%"></span></span><span class="v">${v}<span style="color:var(--muted)"> ${pct}%</span></span></div>`;
}
function barsOf(map: Record<string, number>, labels: Record<string, string>, total: number, keys?: string[]) {
  const ks = keys || Object.keys(map);
  const sorted = ks.slice().sort((x, y) => map[y] - map[x]);
  const max = map[sorted[0]] || 0;
  return `<div class="bars">${sorted.map((k, i) => bar(labels[k], map[k], max, total, i === 0 && map[k] > 0)).join('')}</div>`;
}
function allData() {
  const real = store.list();
  if (S.src === 'remote') return { real, list: R.rows || [] };
  return { real, list: S.samples ? real.concat(SAMPLES) : real };
}

function vStaff() {
  const { real, list } = allData();
  const g = agg(list);
  const needLabels = Object.fromEntries(NEED_KEYS.map((k) => [k, NEEDS[k].l]));
  const tabs = [['dash', '集計'], ['mon', 'モニター表示'], ['data', 'データ']].map((t) => `<button class="tab${S.tab === t[0] ? ' on' : ''}" data-act="tab" data-v="${t[0]}">${t[1]}</button>`).join('');
  const remote = S.src === 'remote';
  const sampleBadge = !remote && S.samples ? '<span class="badge">サンプル込み</span>' : '';
  const unsent = real.filter((r) => !r.synced).length;
  const needToken = remote && !getToken();
  const srcSwitch = API_BASE ? `<div class="tabs"><button class="tab${remote ? ' on' : ''}" data-act="src" data-v="remote">全体(全端末の合計)</button><button class="tab${remote ? '' : ' on'}" data-act="src" data-v="local">この端末だけ</button></div>` : '';
  const status = remote && !needToken ? `<p class="note" style="margin:0 0 14px">${R.rows ? `全体 ${R.rows.length} 件 / 最終更新 ${new Date(R.at).toLocaleTimeString('ja-JP')}(10秒ごとに更新)` : '読み込み中…'}${R.err ? ` <span class="err">${esc(R.err)}</span>` : ''}</p>` : '';
  let body = '';
  if (needToken) {
    body = `<form class="pin" id="tokenform"><h2 style="font-weight:900">スタッフ用の合言葉</h2>
      <input id="token" type="password" autocomplete="off" aria-label="合言葉" style="letter-spacing:normal;font-size:16px">
      ${R.err ? `<div class="err">${esc(R.err)}</div>` : ''}
      <button class="btn primary" type="submit">全体の集計を開く</button>
      <p class="note">合言葉は、Worker に登録した STAFF_TOKEN の値です。このタブを閉じると忘れます。</p></form>`;
  } else if (S.tab === 'mon') {
    body = `<section class="mon"><div class="mon-total"><b class="mono" style="font-family:var(--font-display)">${g.n}</b><span>人が回答${sampleBadge}</span></div>
      <h2 style="font-size:clamp(16px,2.6vw,24px);font-weight:900;margin-bottom:14px">社内で学習や強化が必要なテクノロジー</h2>
      ${barsOf(g.need, needLabels, g.n)}</section>`;
  } else if (S.tab === 'data') {
    body = `<div class="panel"><h2>データの操作${remote ? '<small>CSV は全体、削除・送信はこの端末の分</small>' : ''}</h2><div class="tools">
      <button class="btn small" data-act="csv">CSVをコピー</button>
      ${remote ? '' : `<button class="btn small" data-act="samples">${S.samples ? 'サンプルを除く' : 'サンプルを含める'}</button>`}
      ${S.confirmClear ? `<button class="btn small primary" data-act="clear-yes">この端末の実データ ${real.length} 件を削除する</button><button class="btn small" data-act="clear-no">キャンセル</button>` : `<button class="btn small" data-act="clear" ${real.length ? '' : 'disabled'}>実データを削除</button>`}
      </div>
      ${S.csv !== null ? `<textarea class="csv" id="csvbox" readonly aria-label="CSV">${esc(S.csv)}</textarea><p class="note">コピーできなかったため、全選択してコピーしてください。</p>` : ''}
      <p class="note">この端末の実データ ${real.length} 件(未送信 ${unsent} 件) / サンプル ${SAMPLES.length} 件。サンプルは画面表示専用で、保存も送信もされません。${ANON_FORM.enabled || API_BASE ? '' : '匿名データの送信は無効です(config.ts)。'}</p>
      ${unsent ? `<div class="tools" style="margin-top:10px"><button class="btn small" data-act="flush">未送信の回答を今すぐ送る</button></div>` : ''}</div>`;
  } else {
    const crossRows = Object.keys(ROLES).map((r) => {
      const mx = Math.max(1, ...NEED_KEYS.map((n) => g.cross[r][n]));
      return `<tr><td>${esc(ROLES[r])}</td>${NEED_KEYS.map((n) => { const v = g.cross[r][n]; return `<td class="h" style="background:color-mix(in srgb,var(--accent) ${Math.round((v / mx) * 38)}%,transparent)">${v || ''}</td>`; }).join('')}<td class="h">${g.role[r]}</td></tr>`;
    }).join('');
    const topList = Object.keys(g.top1).sort((x, y) => g.top1[y] - g.top1[x]).slice(0, 6).map((ex) => { const c = CERTS.find((z) => z.exam === ex); return `<li><span class="nm"><span class="mono">${ex}</span> ${esc(c ? c.n : '')}</span><span class="mono">${g.top1[ex]}</span></li>`; }).join('');
    body = `
    <div class="stats">
      <div class="stat"><div class="n">${g.n}</div><div class="l">回答数</div></div>
      <div class="stat"><div class="n">${g.today}</div><div class="l">本日の回答</div></div>
      ${remote ? '' : `<div class="stat"><div class="n">${g.trial}</div><div class="l">トライアル等を開いた人</div></div>
      <div class="stat"><div class="n">${g.forms}</div><div class="l">フォームを開いた人</div></div>`}
    </div>
    <div class="panel"><h2>必要な領域<small>1人2つまで選択。割合は回答者数に対する比率</small></h2>${barsOf(g.need, needLabels, g.n)}</div>
    <div class="panel"><h2>役割 × 必要な領域<small>人数(選択数)</small></h2><div class="scroll-x"><table class="x"><thead><tr><th>役割</th>${NEED_KEYS.map((n) => `<th>${esc(NEEDS[n].l)}</th>`).join('')}<th>回答者</th></tr></thead><tbody>${crossRows}</tbody></table></div></div>
    <div class="grid2">
      <div class="panel"><h2>学習を始めたい時期</h2>${barsOf(g.timing, TIMINGS, g.n, ['t3', 't6', 't12', 'tbd'])}</div>
      <div class="panel"><h2>学び方のスタイル</h2>${barsOf(g.style, STYLES, g.n)}</div>
      <div class="panel"><h2>スキルレベル</h2>${barsOf(g.exp, EXPS, g.n, ['1', '2', '3', '4'])}</div>
      <div class="panel"><h2>最初の一歩になった資格<small>5件のうち最も入門レベル</small></h2><ul class="toprec">${topList || '<li>まだデータがありません</li>'}</ul></div>
    </div>`;
  }
  return header(`<button class="link-btn" data-act="abort">スタッフ画面を閉じる</button>`) + `
  <h1 class="display" style="font-size:26px;margin-bottom:14px">ブース集計${S.tab !== 'mon' ? sampleBadge : ''}</h1>
  ${srcSwitch}${needToken ? '' : `<div class="tabs">${tabs}</div>`}${status}${body}`;
}

function render() {
  app.innerHTML = { start: vStart, q: vQ, result: vResult, pin: vPin, staff: vStaff }[S.view]();
  if (S.view === 'staff' && S.tab === 'data' && S.csv !== null) { const b = document.getElementById('csvbox') as HTMLTextAreaElement | null; if (b) { b.focus(); b.select(); } }
  if (S.view === 'pin') document.getElementById('pin')?.focus();
}

function next() {
  if (S.qi < QS.length - 1) { S.qi++; render(); window.scrollTo(0, 0); } else finish();
}
function finish() {
  const a = S.a as CompleteAnswers;
  const recs = recommend(a);
  S.recs = recs;
  S.res = { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), role: a.role, needs: a.needs.slice(), exp: a.exp, prods: a.prods.slice(), timing: a.timing, style: a.style, top: recs.map((x) => x.c.exam), trial: false, forms: false };
  store.save(S.res);
  void flushPending(store);
  go('result');
}

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el) return;
  lastActive = Date.now();
  const act = el.dataset.act, v = el.dataset.v!;
  if (act === 'begin') { resetAnswers(); go('q'); }
  else if (act === 'abort') { resetAnswers(); S.csv = null; S.confirmClear = false; go('start'); }
  else if (act === 'staff') { S.pinErr = false; go('pin'); }
  else if (act === 'back') { if (S.qi > 0) { S.qi--; render(); } else go('start'); }
  else if (act === 'next') next();
  else if (act === 'pick') {
    const q = QS[S.qi];
    if (q.type === 'one') {
      (S.a as unknown as Record<string, unknown>)[q.k] = q.k === 'exp' ? +v : v;
      render();
      setTimeout(() => { if (S.view === 'q' && QS[S.qi] === q) next(); }, 180);
    } else if (q.k === 'needs') {
      const arr = S.a.needs; const i = arr.indexOf(v as Domain);
      if (i >= 0) arr.splice(i, 1); else { if (arr.length >= q.max!) arr.shift(); arr.push(v as Domain); }
      render();
    } else {
      let arr = S.a.prods; const i = arr.indexOf(v);
      if (v === 'none') arr = i >= 0 ? [] : ['none'];
      else { arr = arr.filter((x) => x !== 'none'); const j = arr.indexOf(v); if (j >= 0) arr.splice(j, 1); else arr.push(v); }
      S.a.prods = arr; render();
    }
  }
  else if (act === 'trial') { if (S.res && !S.res.trial) { S.res.trial = true; store.patch(S.res.id, { trial: true }); } }
  else if (act === 'forms') { if (S.res && !S.res.forms) { S.res.forms = true; store.patch(S.res.id, { forms: true }); } }
  else if (act === 'again') { resetAnswers(); go('start'); }
  else if (act === 'tab') { S.tab = v; S.csv = null; S.confirmClear = false; render(); }
  else if (act === 'src') { S.src = v as 'remote' | 'local'; S.csv = null; render(); void refreshRemote(); }
  else if (act === 'samples') { S.samples = !S.samples; render(); }
  else if (act === 'clear') { S.confirmClear = true; render(); }
  else if (act === 'clear-no') { S.confirmClear = false; render(); }
  else if (act === 'clear-yes') { store.clear(); S.confirmClear = false; render(); }
  else if (act === 'flush') { void flushPending(store, render); }
  else if (act === 'csv') {
    const text = csvOf(allData().list);
    const fallback = () => { S.csv = text; render(); };
    try { navigator.clipboard.writeText(text).then(() => { S.csv = null; el.textContent = 'コピーしました'; }, fallback); } catch { fallback(); }
  }
});
document.addEventListener('submit', (e) => {
  if ((e.target as HTMLElement).id === 'pinform') {
    e.preventDefault();
    if ((document.getElementById('pin') as HTMLInputElement).value.trim() === STAFF_PIN) { S.tab = 'dash'; S.pinErr = false; go('staff'); void refreshRemote(); }
    else { S.pinErr = true; render(); }
  } else if ((e.target as HTMLElement).id === 'tokenform') {
    e.preventDefault();
    setToken((document.getElementById('token') as HTMLInputElement).value.trim());
    R.err = ''; R.rows = null; render(); void refreshRemote();
  }
});
['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => { lastActive = Date.now(); }, true));

setInterval(() => {
  if ((S.view === 'q' || S.view === 'result') && Date.now() - lastActive > IDLE_MS) { resetAnswers(); go('start'); }
  if (S.view === 'staff' && S.tab === 'mon' && S.src === 'local') render();
}, 3000);
setInterval(() => { if (S.view === 'staff' && S.src === 'remote') void refreshRemote(); }, 10_000);
// 未送信の回答は、回線が戻ったときと30秒ごとに再送する
window.addEventListener('online', () => void flushPending(store));
setInterval(() => void flushPending(store), 30_000);
void flushPending(store);
render();
