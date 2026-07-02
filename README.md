# ホテルプロンプト練習

ホテル系専門学生向けの、生成AIプロンプト練習アプリです。Zero-Shot と Few-Shot の2種類を、ステップ式で自習できます。

## 内容

- Zero-Shot 練習: 例を入れず、目的・背景・制約・出力形式を整理してAIに依頼する
- Few-Shot 練習: 良い例を示し、同じ型やトーンでAIに新しい出力を作らせる
- 各3ケース、合計6ケース
- AI出力、改善コメント、天気アイコンによる到達度表示
- 履歴、下書き、ふり返り、JSON/CSV/テキスト/PDF書き出し

## セットアップ

```bash
npm install
```

APIキーが未設定の場合はモックモードで動作します。実際のAI APIを使う場合は `.env` に `OPENAI_API_KEY` または `GEMINI_API_KEY` を設定してください。

```bash
cp .env.example .env
```

## 起動

```bash
npm start
```

ブラウザで `http://localhost:3000` を開きます。

開発中は次も使えます。

```bash
npm run dev
```

## テスト

Windows PowerShell では次で実行できます。

```bash
npm.cmd test
```

## API

- `GET /api/health`
- `GET /api/config`
- `POST /api/attempts`
- `POST /api/chat`
- `GET /api/history?clientId=...`
- `PUT /api/history?clientId=...`
- `DELETE /api/history?clientId=...`
