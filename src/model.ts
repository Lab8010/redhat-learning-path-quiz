import certsJson from '../data/certs.json';

export type Domain = 'cn' | 'linux' | 'virt' | 'auto' | 'ai' | 'sec';

export interface Cert {
  id: string;
  exam: string;
  /** レベル 1〜4 (= 100〜400) */
  lv: number;
  /** 領域。先頭が主領域 */
  d: Domain[];
  /** 関連製品 */
  p: string[];
  dev?: 1;
  legacy?: 1;
  n: string;
  course: string;
  cn: string;
  desc: string;
  url: string;
  curl: string;
}

export const CERTS = certsJson as Cert[];

export const NEEDS: Record<Domain, { l: string; s: string }> = {
  cn: { l: 'クラウドネイティブ', s: 'コンテナ、Kubernetes' },
  linux: { l: 'Linux', s: 'RHELの運用・管理' },
  virt: { l: '仮想化の移行', s: '新しい仮想化基盤' },
  auto: { l: 'インフラ運用の自動化', s: 'Ansibleなど' },
  ai: { l: 'AI', s: '推論基盤・AIエージェント' },
  sec: { l: 'セキュリティ', s: '脆弱性対応・堅牢化' },
};
export const NEED_KEYS = Object.keys(NEEDS) as Domain[];
export const ROLES: Record<string, string> = { infra: 'インフラ・運用', sre: 'SRE・プラットフォーム', dev: 'アプリ開発', planner: '学習・育成の計画', partner: '営業・SE・パートナー', other: 'その他' };
/** 旧コード(端末に残っている回答・過去の送信分)を現行の役割に読み替える */
export const ROLE_ALIAS: Record<string, string> = { mgr: 'planner' };
export const EXPS: Record<string, string> = { 1: 'これから学ぶ', 2: '基本操作ができる', 3: '実務で運用中', 4: '設計・構築をリード' };
export const PRODS: Record<string, string> = { rhel: 'RHEL', ocp: 'OpenShift', virt: 'OpenShift Virtualization', aap: 'Ansible Automation Platform', ai: 'Red Hat AI', none: '未導入・これから' };
export const TIMINGS: Record<string, string> = { t3: '3か月以内', t6: '半年以内', t12: '1年以内', tbd: '未定・情報収集中' };
export const STYLES: Record<string, string> = { ilt: '講師付きで集中', sub: 'オンライン学び放題', self: '自習して試験で証明', team: 'チーム・社内で一括' };
export const LVN: Record<number, string> = { 1: '初級', 2: '中級', 3: '上級', 4: '専門' };

export interface Answers {
  role: string | null;
  needs: Domain[];
  exp: number | null;
  prods: string[];
  timing: string | null;
  style: string | null;
}
/** 回答が完了した状態(診断に渡す) */
export type CompleteAnswers = { [K in keyof Answers]: NonNullable<Answers[K]> };

/** 保存する1件の回答。個人を特定する項目は持たない */
export interface Response {
  id: string;
  ts: number;
  role: string;
  needs: Domain[];
  exp: number;
  prods: string[];
  timing: string;
  style: string;
  top: string[];
  /** 学習の案内リンク(トライアル等)を開いた */
  trial: boolean;
  /** 個人情報用の Forms を開いた */
  forms: boolean;
  /** 送信が必要な宛先(API・匿名 Form)すべてへの送信が済んだ */
  synced?: boolean;
  sentApi?: boolean;
  sentForm?: boolean;
  sample?: boolean;
}

type Opt = [string | number, string, string];
export interface Question {
  k: keyof Answers;
  type: 'one' | 'multi';
  max?: number;
  t: string;
  h: string;
  cols: 1 | 2;
  o: Opt[];
}

export const QS: Question[] = [
  { k: 'role', type: 'one', t: 'あなたの立場に近いものは？', h: 'ひとつ選んでください', cols: 2,
    o: [['infra', 'インフラ・運用の担当者', 'サーバ、ネットワーク、基盤の構築と運用'], ['sre', 'SRE・プラットフォームの担当者', '開発基盤、自動化、信頼性'], ['dev', 'アプリケーション開発者', 'コンテナ、マイクロサービス、API'], ['planner', '学習・育成を計画する人', '部門マネージャー、技術リーダー、人事・教育担当など。メンバーの育成計画を立てる方'], ['partner', '営業・SE(システムエンジニア)・パートナー', 'お客様への提案や支援のために知りたい方'], ['other', 'その他', '学生、新入社員など実務にまだ配属されていない方、情報収集中の方など']] },
  { k: 'needs', type: 'multi', max: 2, t: 'あなた（またはチーム）が学習・強化したいテクノロジー領域は？', h: 'いちばん必要なものから順に、最大2つ選んでください', cols: 2,
    o: NEED_KEYS.map((k) => [k, NEEDS[k].l, NEEDS[k].s] as Opt) },
  { k: 'exp', type: 'one', t: 'あなた（または対象メンバー）のいまのスキルレベルは？', h: '選んだ領域について、いちばん近いものを選んでください。チーム等の場合は、経験が少ない方に合わせてください', cols: 1,
    o: [[1, 'これから学ぶ', '未経験、または触ったことがある程度'], [2, '基本操作ができる', '手順書があれば運用できる'], [3, '実務で運用している', 'トラブル対応や設定変更を任されている'], [4, '設計・構築をリードしている', 'アーキテクチャや標準化に関わる']] },
  { k: 'prods', type: 'multi', max: 6, t: 'あなたの組織で、いま使っている Red Hat 製品は？', h: '当てはまるものをすべて選んでください', cols: 2,
    o: Object.keys(PRODS).map((k) => [k, PRODS[k], ''] as Opt) },
  { k: 'timing', type: 'one', t: '学習を始めたい時期は？', h: '', cols: 2,
    o: Object.keys(TIMINGS).map((k) => [k, TIMINGS[k], ''] as Opt) },
  { k: 'style', type: 'one', t: 'あなた（またはメンバー）に合う学び方は？', h: 'いちばん合うものを選んでください', cols: 2,
    o: [['ilt', '講師と一緒に集中して学ぶ', 'クラスルームまたはオンラインの講師付きコース'], ['sub', 'オンラインで好きな時に学び放題', 'ラーニングサブスクリプション'], ['self', '自習して試験で実力を証明', '実技試験の認定資格を目標に'], ['team', 'チーム・社内でまとめて学ぶ', '部署や会社単位での育成']] },
];
