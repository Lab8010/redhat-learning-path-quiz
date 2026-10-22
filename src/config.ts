/* 運用設定。本番の値に差し替えるのはこのファイルだけ。
   ここには個人を特定する情報を置かない。 */

/** 個人情報を取る、会社承認の Google フォーム(回答者用リンク)。
    事前入力してよいのは診断結果の6欄だけ。同意・会社名・お名前・メール・相談内容の entry は、誤用を防ぐためここに置かない。 */
export const FORM = {
  base: 'https://docs.google.com/forms/d/e/1FAIpQLSepJukRs6pEupkKpa34XIcWfjN3PS9w2nu9rgoi_H1GoKdDkA/viewform',
  entries: {
    needs: 'entry.1614265366', // 必要な領域
    first: 'entry.1201212820', // 最初の一歩の試験コード
    timing: 'entry.322112944', // 学習を始めたい時期
    style: 'entry.1375826699', // 学び方
    top5: 'entry.2146752632', // おすすめ5件の試験コード(任意)
    profile: 'entry.198304846', // 役割 / スキルレベル(任意)
  },
} as const;

/** 事前入力リンクの長さの上限(QRコードが細かくなりすぎないように) */
export const FORM_URL_MAX = 700;

/** 匿名の回答を溜める Google Form(formResponse の送信先と、各質問の entry) */
export const ANON_FORM = {
  url: 'https://docs.google.com/forms/d/e/1FAIpQLSfuiXUW8gYv7A1mSe0YrSWnGP5W-00bEbCOn_wBJXUZ314ckw/formResponse',
  entries: {
    role: 'entry.148791520',
    needs: 'entry.774745681',
    exp: 'entry.1224068308',
    prods: 'entry.1107067628',
    timing: 'entry.1628413106',
    style: 'entry.1613542763',
    top: 'entry.2131904774',
    ts: 'entry.1140805444',
  },
  /** バックアップとして並行送信する。false にすると送らない(API だけ使う) */
  enabled: true,
};

/** 匿名回答を保存・集計する Cloudflare Worker の URL(docs/CLOUDFLARE_SETUP.md)。末尾の / は付けない。空なら、API は使わない */
export const API_BASE = 'https://redhat-learning-path-quiz-api.lab8010.workers.dev';

/** スタッフ画面の簡易 PIN。端末内の確認であり認証ではない(公開リポジトリで見える値)。 */
export const STAFF_PIN = '1029';

/** 来場者向けボードで、この件数に満たないうちは「集計中」と表示する(1人の回答が目立たないように) */
export const BOARD_MIN = 10;

/** 操作がない時間(ミリ秒)で開始画面に戻る */
export const IDLE_MS = 120_000;

export const LINKS = {
  rhls: 'https://www.redhat.com/ja/services/training/learning-subscription',
  rhlsBuy: 'https://www.redhat.com/ja/services/training/learning-subscription/how-to-buy',
  trial: 'https://www.redhat.com/ja/services/training/learning-subscription/trial',
  allCourses: 'https://www.redhat.com/ja/services/training/all-courses-exams',
  certPage: 'https://www.redhat.com/ja/services/certifications',
  certList: 'https://lab8010.github.io/redhat-certifications-list/',
  contact: 'https://www.redhat.com/ja/services/training-and-certification/contact-us',
};
