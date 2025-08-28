# タイムカードアプリ

従業員の出勤・退勤記録を管理するWebアプリケーションです。

## 機能

- 部署別の従業員管理
- 出勤・退勤・休憩の打刻記録
- ローカルデータベース（SQL.js）でのデータ保存
- Google Sheetsとの自動同期
- 出勤履歴の確認
- 管理者機能（職員追加・削除、設定変更）

## 技術スタック

- React 18 + TypeScript
- Vite
- SQL.js (ブラウザ内SQLite)
- Google Sheets API
- Tailwind CSS
- Capacitor (モバイル対応)

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

## 自動コミット機能

このプロジェクトには自動的にGitHubに変更を送信する機能が含まれています。

### 使用方法

1. **手動コミット**（推奨）
```bash
git add .
git commit -m "変更内容の説明"
git push origin master
```

2. **自動コミットスクリプト**
```bash
# ファイル変更を監視して自動コミット
npm run auto-commit
```

3. **Gitフック**（自動実行）
- `pre-commit`: コミット前に自動的にファイルをステージング
- `post-commit`: コミット後に自動的にGitHubにプッシュ

### 自動コミットの設定

- ファイルが変更されると自動的に検出
- タイムスタンプ付きでコミット
- GitHubに自動プッシュ
- `.git`、`node_modules`、`dist`ディレクトリは除外

## Google Sheets連携

1. Google Cloud Consoleでサービスアカウントを作成
2. Google Sheets APIを有効化
3. スプレッドシートにサービスアカウントを共有
4. アプリの設定画面で以下を設定：
   - サービスアカウントキー（JSON）
   - スプレッドシートID

## 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# リント
npm run lint

# プレビュー
npm run preview
```

## ライセンス

MIT License
