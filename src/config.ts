/* 運用設定。本番の値に差し替えるのはこのファイルだけ。
   ここには個人を特定する情報を置かない。 */

/** 個人情報を取る、会社承認の Google Forms(回答者用リンク)。ダミー値: 本番の URL に差し替える */
export const PERSONAL_FORM = {
  url: 'https://docs.google.com/forms/d/e/DUMMY_FORM_ID/viewform',
  /** 事前入力する項目の entry.xxxx(空文字なら送らない)。個人を特定しない値だけ。 */
  entries: {
    firstCert: 'entry.0000000001', // 最初の一歩の資格コード
    needs: 'entry.0000000002', // 必要な領域(最大2つ)
    style: 'entry.0000000003', // 学び方
  },
};

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

/** 操作がない時間(ミリ秒)で開始画面に戻る */
export const IDLE_MS = 120_000;

export const LINKS = {
  trial: 'https://www.redhat.com/ja/services/training/learning-subscription/trial',
  allCourses: 'https://www.redhat.com/ja/services/training/all-courses-exams',
  certPage: 'https://www.redhat.com/ja/services/certifications',
  certList: 'https://lab8010.github.io/redhat-certifications-list/',
  contact: 'https://www.redhat.com/ja/services/training-and-certification/contact-us',
};
