-- 匿名の回答だけを保存する。IP・User-Agent・端末IDの列は作らない
CREATE TABLE IF NOT EXISTS responses (
  id      TEXT PRIMARY KEY,   -- 端末が作る乱数(再送時の重複防止用。他のデータとは結びつけない)
  ts      INTEGER NOT NULL,   -- 回答日時(ミリ秒)
  role    TEXT NOT NULL,
  needs   TEXT NOT NULL,      -- カンマ区切り
  exp     INTEGER NOT NULL,
  prods   TEXT NOT NULL,
  timing  TEXT NOT NULL,
  style   TEXT NOT NULL,
  top     TEXT NOT NULL,
  created INTEGER NOT NULL    -- サーバが受け取った時刻(レート制限用)
);
CREATE INDEX IF NOT EXISTS idx_responses_created ON responses (created);
