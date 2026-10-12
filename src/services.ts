import { LINKS } from './config';
import type { STYLES } from './model';

export interface Service { name: string; desc: string; url: string }
export interface StyleGuide {
  h: string;
  p: string;
  services: Service[];
  /** 主なボタン(名前, URL) */
  main: [string, string];
  /** 「学び放題を無料で試す」を併記するか */
  trial: boolean;
}

/*
 * 学び方に応じて紹介する Red Hat のサービス。
 * 説明文は、Red Hat 公式の「ラーニングサブスクリプション」ページの記載に基づく。
 * 一社向け研修・Bootcamp の説明は、確定した内容に差し替えること。
 */
const RHLS_PREMIUM: Service = { name: 'RHLS Premium', desc: 'Red Hat トレーニング全体を、自習型とコースごと最大2回の講師主導バーチャルライブクラスで学べます。認定試験5回+再受験5回、ラボは400時間。', url: LINKS.rhls };
const RHLS_COURSE: Service = { name: 'RHLS Course', desc: '受講したい1つのコースに絞るプラン。自習型と講師主導のバーチャルライブクラス(1回)、認定試験1回+再受験1回、ラボ100時間。', url: LINKS.rhls };
const RHLS_STANDARD: Service = { name: 'RHLS Standard', desc: 'Red Hat トレーニング全体を、自分のペースの自習型で学び放題。認定試験5回+再受験5回、ラボは400時間。', url: LINKS.rhls };
const PRIVATE_TRAINING: Service = { name: '一社向け研修', desc: 'お客様のご希望に合わせて個別に調整。チーム全体で一貫したスキル習得ができます。', url: LINKS.contact };
const BOOTCAMP: Service = { name: 'Bootcamp', desc: '内容と日程は、ブースのスタッフまたはお問い合わせでご案内します。', url: LINKS.contact };

export const SERVICE_BY_STYLE: Record<keyof typeof STYLES, StyleGuide> = {
  ilt: { h: '講師と一緒に学ぶなら', p: '講師主導のライブクラスと自習を組み合わせて、実機演習を通して身につけられます。', services: [RHLS_PREMIUM, RHLS_COURSE], main: ['ラーニングサブスクリプションを見る', LINKS.rhls], trial: true },
  sub: { h: '好きな時に学ぶなら', p: 'RHEL・OpenShift・Ansible・AI まで、自分のペースで学べます。まずは無料トライアルで確かめてください。', services: [RHLS_STANDARD], main: ['無料トライアルを開始', LINKS.trial], trial: false },
  self: { h: '自習して試験で実力を証明するなら', p: 'Red Hat の認定試験は実機を操作する実技形式です。自習と受験をまとめて始められます。', services: [RHLS_STANDARD], main: ['認定資格の一覧', LINKS.certPage], trial: true },
  team: { h: 'チーム・社内でまとめて学ぶなら', p: '部署や会社単位の育成計画は、ブースのスタッフにお声がけください。オンラインでも相談できます。', services: [PRIVATE_TRAINING, BOOTCAMP], main: ['トレーニングのお問い合わせ', LINKS.contact], trial: true },
};

/** 来場者向けボードでの、学び方ごとの紹介サービス名 */
export const STYLE_SERVICE_LABEL: Record<keyof typeof STYLES, string> = {
  ilt: 'RHLS Premium / Course',
  sub: 'RHLS Standard',
  self: 'RHLS Standard(自習+受験)',
  team: '一社向け研修 / Bootcamp',
};
