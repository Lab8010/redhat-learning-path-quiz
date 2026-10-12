# Cloudflare Workers + D1 の設定

匿名の回答を保存し、スタッフ画面で全端末の合計を見るための API です。保存するのは匿名の回答だけで、IP・User-Agent・端末ID の列はありません。作業は30分ほどです。

## 0. 準備
- Cloudflare アカウント(無料)を作る。
- ログインする: `npx wrangler login`(ブラウザで許可)→ `npx wrangler whoami` で確認。

以降のコマンドは、すべてリポジトリの `worker/` ディレクトリで実行します。

```bash
cd ~/redhat-learning-path-quiz/worker
```

## 1. データベースを作る
```bash
npx wrangler d1 create redhat-learning-path-quiz
```
出力に `database_id = "xxxxxxxx-...."` が出ます。その値で `worker/wrangler.toml` の `REPLACE_WITH_DATABASE_ID` を置き換えます。

テーブルを作ります。
```bash
npx wrangler d1 execute redhat-learning-path-quiz --remote --file=schema.sql
```

## 2. 合言葉(スタッフ画面用)を登録する
推測されにくい24文字以上の文字列を作り、登録します(コマンドの後に値を入力する画面が出ます)。
```bash
openssl rand -base64 24        # 作成例。この値を控える
npx wrangler secret put STAFF_TOKEN
```
合言葉はコードやリポジトリに書きません。

## 3. デプロイする
```bash
npx wrangler deploy
```
出力の `https://redhat-learning-path-quiz-api.<あなたのサブドメイン>.workers.dev` が API の URL です。

動作確認:
```bash
curl https://redhat-learning-path-quiz-api.<...>.workers.dev/api/health          # {"ok":true}
curl -X POST -d 'token=wrong' https://redhat-learning-path-quiz-api.<...>.workers.dev/api/rows   # {"ok":false,"error":"unauthorized"}
```

## 4. アプリに設定する
`src/config.ts` の `API_BASE` に、上の URL(末尾の `/` なし)を入れ、commit / push します。

## 5. 確認
1. アプリで回答し、結果画面まで進める。
2. スタッフ画面(PIN)→「全体(全端末の合計)」→ 合言葉を入力 → 回答が1件出る。
3. 回線を切って回答 → 回線を戻す → 30秒以内に送信され、数が増える。

## 運用メモ
- **データの確認・書き出し**: `npx wrangler d1 execute redhat-learning-path-quiz --remote --command "SELECT COUNT(*) FROM responses"`
- **イベント後の削除**: `npx wrangler d1 execute redhat-learning-path-quiz --remote --command "DELETE FROM responses"`
- **リハーサルのデータ削除**: 同上。本番前日に必ず実行する。
- **合言葉の変更**: `npx wrangler secret put STAFF_TOKEN` をもう一度実行する。
- **ログ**: `wrangler.toml` でログの保存は有効にしていません。基盤側の設定は、セキュリティ部門の確認事項に含めてください。
- **上限**: 全体で1分あたり120件(`MAX_PER_MIN`)。超えた分は 429 を返し、端末が後で再送します。
- **公開元の制限**: `ALLOWED_ORIGINS` にあるサイトからのブラウザ通信だけを受け付けます。
- **Google Form への並行送信**: バックアップとして残しています。やめる場合は `src/config.ts` の `ANON_FORM.enabled` を `false` にします。
