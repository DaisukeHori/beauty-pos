# Beauty POS - 美容室・サロン向けPOSシステム

美容室・サロン向けの統合型POSシステムです。予約管理、来店管理、会計、顧客管理（カルテ）、スタッフ管理、レポート分析など、サロン運営に必要な全機能を提供します。

## 概要

| 項目 | 内容 |
|------|------|
| アプリ種別 | iPadネイティブアプリ（React Native + Expo） |
| 対象業種 | 美容室、ヘアサロン、ネイルサロン、エステサロン |
| 提供形態 | SaaS（月額/年額サブスクリプション） |
| 対応端末 | iPad（スタッフアプリ）、iPad（顧客向けアプリ） |

---

## 目次

- [機能一覧](#機能一覧)
- [技術スタック](#技術スタック)
- [プロジェクト構成](#プロジェクト構成)
- [セットアップ](#セットアップ)
  - [クイックスタート（ローカル開発）](#クイックスタートローカル開発)
  - [Cloud Supabase（本番/ステージング）への接続](#cloud-supabase本番ステージングへの接続)
  - [iPadでの動作確認](#ipadでの動作確認)
  - [環境変数リファレンス](#環境変数リファレンス)
- [開発コマンド](#開発コマンド)
- [データベーススキーマ](#データベーススキーマ)
- [APIサービス一覧](#apiサービス一覧)
- [画面一覧](#画面一覧)
- [SaaSプラン](#saasプラン)
- [テスト](#テスト)
- [トラブルシューティング](#トラブルシューティング)
- [よくある質問（FAQ）](#よくある質問faq)
- [デプロイ](#デプロイ)

---

## 機能一覧

### 1. 予約管理
- 予約一覧・カレンダー表示（日/週）
- 新規予約作成（顧客・スタッフ・メニュー選択）
- 予約ステータス管理（予約済み/確認済み/来店/キャンセル/NoShow）
- 予約通知（LINE/SMS/メール）
- リマインダー自動送信

### 2. 来店管理
- 本日の来店一覧
- 予約からのチェックイン
- ウォークイン対応
- 施術ステータス管理（待機中/施術中/完了）

### 3. 会計（POS）
- メニュー・商品選択
- 担当スタッフ設定（技術売上・生産性）
- 割引機能（手動/クーポン/回数券/ポイント）
- 複数支払い方法対応（現金/カード/電子マネー/QR）
- 分割払い対応
- レシート印刷・表示

### 4. 顧客管理（CRM・カルテ）
- 顧客基本情報
- 髪質情報（毛量/硬さ/クセ/ダメージ）
- カラーレシピ履歴
- パーマレシピ履歴
- 施術写真管理
- タグ管理
- ポイント・会員ランク

### 5. スタッフ管理
- スタッフ登録・編集
- 役職・権限管理（27種類の権限）
- シフト管理
- 勤怠打刻

### 6. メニュー・商品管理
- メニュー登録・カテゴリ管理
- 工程設定
- 店販商品管理
- 在庫管理

### 7. クーポン・回数券
- クーポン作成・発行
- 回数券作成・販売・利用

### 8. レポート・分析
- 日別/週別/月別売上
- スタッフ別売上ランキング
- 顧客分析（新規/リピーター）
- 日報

### 9. 外部連携
- LINE公式アカウント
- SMS（Twilio/Vonage）
- メール（SendGrid/Mailgun）
- Stripe決済

### 10. Customer App（顧客向け）
- ヘアスタイルシミュレーション（AI）
- ヘアカタログ閲覧
- スタイル提案閲覧

---

## 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| React Native | 0.73.x | クロスプラットフォーム開発 |
| Expo | SDK 50 | 開発環境・ビルド |
| Expo Router | 3.x | ファイルベースルーティング |
| TypeScript | 5.3.x | 型安全性 |
| Zustand | 4.5.x | 状態管理 |
| React Native Paper | 5.x | UIコンポーネント |
| date-fns | 3.x | 日付操作 |
| Zod | 3.22.x | バリデーション |

### バックエンド
| 技術 | 用途 |
|------|------|
| Supabase | BaaS（PostgreSQL + Auth + Storage + Realtime） |
| Edge Functions | サーバーレス関数（Deno） |
| Row Level Security | マルチテナントデータ分離 |

### 外部サービス
| サービス | 用途 |
|----------|------|
| Stripe | SaaS課金 |
| LINE Messaging API | 通知 |
| Twilio / Vonage | SMS |
| SendGrid / Mailgun | メール |

### 開発ツール
| ツール | 用途 |
|--------|------|
| pnpm | パッケージマネージャー |
| Turborepo | Monorepoビルドシステム |
| Jest | テストフレームワーク |
| ts-jest | TypeScriptテスト |

---

## プロジェクト構成

```
beauty-pos/
├── apps/                          # アプリケーション
│   ├── staff/                     # スタッフ向けiPadアプリ
│   │   ├── app/                   # Expo Router ページ
│   │   │   ├── (auth)/            # 認証関連画面
│   │   │   │   ├── _layout.tsx
│   │   │   │   └── login.tsx
│   │   │   ├── (tabs)/            # メインタブ画面
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx      # ホーム
│   │   │   │   ├── visits.tsx     # 来店一覧
│   │   │   │   ├── reservations.tsx # 予約一覧
│   │   │   │   ├── customers.tsx  # 顧客一覧
│   │   │   │   └── settings.tsx   # 設定
│   │   │   ├── admin/             # 管理画面
│   │   │   │   ├── store.tsx      # 店舗設定
│   │   │   │   ├── menus.tsx      # メニュー管理
│   │   │   │   ├── products.tsx   # 商品管理
│   │   │   │   ├── staff.tsx      # スタッフ管理
│   │   │   │   ├── shifts.tsx     # シフト管理
│   │   │   │   ├── coupons.tsx    # クーポン管理
│   │   │   │   ├── tickets.tsx    # 回数券管理
│   │   │   │   ├── inventory.tsx  # 在庫管理
│   │   │   │   ├── reports.tsx    # 売上レポート
│   │   │   │   ├── daily-report.tsx    # 日報
│   │   │   │   ├── monthly-report.tsx  # 月次レポート
│   │   │   │   ├── staff-sales.tsx     # スタッフ別売上
│   │   │   │   ├── customer-analytics.tsx # 顧客分析
│   │   │   │   ├── sales-history.tsx   # 売上履歴
│   │   │   │   ├── integrations.tsx    # 外部連携
│   │   │   │   ├── features.tsx   # 機能設定
│   │   │   │   ├── permissions.tsx # 権限管理
│   │   │   │   ├── subscription.tsx # プラン・課金
│   │   │   │   └── notifications.tsx # 通知設定
│   │   │   ├── customer/[id].tsx  # 顧客詳細
│   │   │   ├── visit/[id].tsx     # 来店詳細
│   │   │   ├── reservation/
│   │   │   │   ├── new.tsx        # 予約作成
│   │   │   │   └── [id].tsx       # 予約詳細
│   │   │   ├── checkout.tsx       # 会計画面
│   │   │   └── _layout.tsx
│   │   └── components/
│   │       └── Receipt.tsx        # レシートコンポーネント
│   │
│   └── customer/                  # 顧客向けiPadアプリ
│       └── app/
│           ├── index.tsx          # ホーム
│           ├── simulation.tsx     # ヘアシミュレーション
│           ├── gallery.tsx        # ヘアカタログ
│           ├── proposal.tsx       # スタイル提案
│           └── _layout.tsx
│
├── packages/                      # 共有パッケージ
│   ├── api/                       # APIサービス層
│   │   ├── src/
│   │   │   ├── client.ts          # Supabaseクライアント
│   │   │   ├── services/          # 各種サービス（31種）
│   │   │   │   ├── authService.ts
│   │   │   │   ├── customerService.ts
│   │   │   │   ├── reservationService.ts
│   │   │   │   ├── visitService.ts
│   │   │   │   ├── saleService.ts
│   │   │   │   ├── subscriptionService.ts
│   │   │   │   └── ...
│   │   │   ├── types/
│   │   │   │   └── database.ts    # Supabase型定義
│   │   │   └── index.ts
│   │   ├── __tests__/             # テスト
│   │   └── package.json
│   │
│   ├── core/                      # コアロジック
│   │   ├── src/
│   │   │   ├── models/            # 型定義
│   │   │   │   ├── customer.ts
│   │   │   │   ├── reservation.ts
│   │   │   │   ├── sale.ts
│   │   │   │   └── ...
│   │   │   ├── stores/            # Zustand Store
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── saleStore.ts
│   │   │   │   ├── uiStore.ts
│   │   │   │   └── ...
│   │   │   ├── hooks/             # カスタムHooks
│   │   │   │   ├── usePermissions.tsx
│   │   │   │   └── ...
│   │   │   ├── utils/             # ユーティリティ
│   │   │   │   ├── validation.ts
│   │   │   │   ├── security.ts
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── __tests__/             # テスト
│   │   └── package.json
│   │
│   └── ui/                        # 共通UIコンポーネント
│       ├── src/
│       │   └── ...
│       └── package.json
│
├── supabase/                      # Supabase設定
│   ├── config.toml                # 設定
│   ├── migrations/                # DBマイグレーション
│   │   ├── 001_initial_schema.sql
│   │   └── ...
│   ├── functions/                 # Edge Functions
│   │   ├── create-checkout-session/
│   │   ├── process-subscription/
│   │   ├── send-line-notification/
│   │   └── ...
│   └── seed/                      # シードデータ
│
├── docs/                          # ドキュメント
│   ├── FEATURES.md                # 機能一覧
│   ├── API_REFERENCE.md           # APIリファレンス
│   └── IMPLEMENTATION_TODO.md     # 実装状況
│
├── package.json                   # ルートpackage.json
├── pnpm-workspace.yaml            # pnpm workspace設定
├── turbo.json                     # Turborepo設定
└── tsconfig.json                  # TypeScript設定
```

---

## セットアップ

### 必要条件

| ツール | バージョン | 確認コマンド | 用途 |
|--------|-----------|--------------|------|
| Node.js | 18.0.0以上 | `node -v` | JavaScript実行環境 |
| pnpm | 8.15.0以上 | `pnpm -v` | パッケージマネージャー |
| Expo CLI | 最新版 | `npx expo --version` | React Native開発 |
| Supabase CLI | 最新版 | `supabase --version` | データベース管理 |
| Xcode | 14.0以上 | Xcodeを開いて確認 | iOSビルド（Mac必須） |
| Git | 2.30以上 | `git --version` | バージョン管理 |

---

## クイックスタート（ローカル開発）

### Step 1: リポジトリのクローン

```bash
# リポジトリをクローン
git clone https://github.com/your-org/beauty-pos.git

# ディレクトリに移動
cd beauty-pos
```

### Step 2: 依存関係のインストール

```bash
# pnpmがインストールされていない場合
npm install -g pnpm

# 依存関係をインストール
pnpm install
```

**確認ポイント:** エラーなく完了すれば成功です。

### Step 3: ローカルSupabaseの起動

```bash
# Dockerが起動していることを確認
docker ps

# Supabaseローカル環境を起動
pnpm supabase:start
```

起動後、以下のような出力が表示されます：

```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**この出力に表示される`anon key`を次のステップで使います。**

### Step 4: 環境変数の設定

```bash
# スタッフアプリ用の.envファイルを作成
cat > apps/staff/.env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=（Step 3で表示されたanon keyをここに貼り付け）
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
EOF

# 顧客アプリ用の.envファイルを作成
cat > apps/customer/.env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=（Step 3で表示されたanon keyをここに貼り付け）
EOF
```

### Step 5: データベースのセットアップ

```bash
# マイグレーション実行（テーブル作成）
pnpm db:migrate

# シードデータ投入（デモ用データ）
pnpm db:seed
```

### Step 6: 開発サーバーの起動

```bash
# 全パッケージの開発サーバー起動
pnpm dev
```

**確認方法:** ブラウザで `http://localhost:8081` にアクセスしてアプリが表示されれば成功です。

---

## Cloud Supabase（本番/ステージング）への接続

ローカルではなく、Supabase Cloud（本番環境）に接続する場合の手順です。

### Step 1: Supabaseアカウントの作成

1. [https://supabase.com](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubまたはメールでサインアップ

### Step 2: 新規プロジェクトの作成

1. ダッシュボード右上の「New Project」をクリック
2. 以下の情報を入力：

| 項目 | 入力内容 | 備考 |
|------|----------|------|
| Organization | 自分の組織を選択 | 初回は自動作成される |
| Project name | `beauty-pos-production` | 任意の名前 |
| Database Password | 強力なパスワード | **必ず控えておく** |
| Region | `Northeast Asia (Tokyo)` | 日本向けは東京推奨 |
| Pricing Plan | Free / Pro | Freeで始めてOK |

3. 「Create new project」をクリック
4. 作成完了まで1〜2分待機

### Step 3: API情報の取得

プロジェクトが作成されたら、接続情報を取得します。

1. 左メニューの「Project Settings」（歯車アイコン）をクリック
2. 「API」を選択
3. 以下の情報をメモ：

| 項目 | 場所 | 用途 |
|------|------|------|
| **Project URL** | `https://xxxxx.supabase.co` | EXPO_PUBLIC_SUPABASE_URL |
| **anon public** | Project API keys内 | EXPO_PUBLIC_SUPABASE_ANON_KEY |
| **service_role** | Project API keys内 | Edge Functions用（秘密） |

**注意:** `service_role`キーは絶対に公開しないでください。

### Step 4: ローカルCLIとの連携

```bash
# Supabase CLIにログイン
supabase login

# ブラウザが開くのでログイン認証を完了
```

```bash
# プロジェクトをリンク
supabase link --project-ref あなたのプロジェクトID

# プロジェクトIDはダッシュボードURLから取得:
# https://supabase.com/dashboard/project/xxxxxx ← このxxxxxxがID
```

### Step 5: マイグレーションの適用

```bash
# ローカルのマイグレーションをCloud Supabaseに適用
supabase db push

# 確認プロンプトで 'y' を入力
```

**確認方法:** Supabaseダッシュボード → Table Editor でテーブルが作成されていればOK

### Step 6: Edge Functionsのデプロイ

```bash
# すべてのEdge Functionsをデプロイ
supabase functions deploy

# 特定の関数のみデプロイする場合
supabase functions deploy create-checkout-session
supabase functions deploy send-line-notification
```

### Step 7: 環境変数の更新

```bash
# apps/staff/.env をCloud用に更新
cat > apps/staff/.env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=あなたのanon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx（本番の場合）
EOF
```

### Step 8: 接続テスト

```bash
# 開発サーバー起動
pnpm dev

# ログイン画面で認証が通ればCloud接続成功
```

---

## iPadでの動作確認

### 方法1: Expo Go（最も簡単）

開発中のアプリをiPadで即座に確認できます。

#### 前提条件
- iPadとPCが**同一のWi-Fiネットワーク**に接続されていること
- iPad App Storeから「Expo Go」アプリをインストール済み

#### 手順

**PCでの操作:**

```bash
# プロジェクトルートで開発サーバーを起動
pnpm dev

# または特定のアプリのみ
cd apps/staff && npx expo start
```

ターミナルにQRコードが表示されます。

**iPadでの操作:**

1. iPadの「カメラ」アプリを開く
2. ターミナルに表示されたQRコードを読み取る
3. 「Expo Goで開く」の通知をタップ
4. アプリが起動します

#### トラブルシューティング

| 問題 | 解決方法 |
|------|----------|
| QRコードが読めない | 同じWi-Fiか確認、ファイアウォール設定確認 |
| 「Unable to connect」 | PC側で `npx expo start --tunnel` を試す |
| アプリが起動しない | Expo Goを最新版に更新 |

### 方法2: Development Build（推奨・フル機能）

Expo Goでは使えないネイティブ機能（カメラ、Bluetooth等）を使う場合はこちら。

#### Step 1: EAS CLIのインストール

```bash
npm install -g eas-cli
eas login  # Expoアカウントでログイン
```

#### Step 2: Development Buildの作成

```bash
cd apps/staff

# iOSのDevelopment Buildを作成
eas build --profile development --platform ios

# ビルド完了まで15〜30分待機
```

#### Step 3: iPadへのインストール

1. ビルド完了後、メールまたはExpoダッシュボードからダウンロードリンクを取得
2. iPadのSafariでリンクを開く
3. 「インストール」をタップ
4. 設定 → 一般 → デバイス管理 で信頼を許可

#### Step 4: 開発サーバーへの接続

```bash
# PCで開発サーバー起動
cd apps/staff && npx expo start --dev-client
```

iPadでインストールしたアプリを開くと、開発サーバーに自動接続します。

### 方法3: シミュレータ（Mac + Xcode必須）

実機がなくてもiPadの動作を確認できます。

```bash
# iPadシミュレータで起動
cd apps/staff && npx expo run:ios --device "iPad Pro (12.9-inch)"

# 利用可能なシミュレータ一覧
xcrun simctl list devices
```

### iPadでの状態確認・デバッグ

#### React Native Debuggerを使用

```bash
# 開発サーバー起動時
npx expo start

# 'j' を押してデバッガーを開く
```

iPadアプリを2回シェイクするとデバッグメニューが表示されます。

#### Console.logの確認

```bash
# ターミナルにログが表示される
npx expo start

# または専用ログビューア
npx react-native log-ios
```

#### Supabase接続状態の確認

アプリ内で接続状態を確認するには、設定画面 → システム情報 で以下が表示されます：
- 接続先Supabase URL
- 認証状態
- 最終同期時刻

---

## 環境変数リファレンス

### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `EXPO_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase公開APIキー | `eyJhbGci...` |

### オプション環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe公開キー | `pk_live_xxx` |
| `EXPO_PUBLIC_LINE_CHANNEL_ID` | LINE Channel ID | `1234567890` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentryエラー監視 | `https://xxx@sentry.io/xxx` |

### Edge Functions用（Supabaseダッシュボードで設定）

```bash
# Supabaseダッシュボード → Settings → Edge Functions で設定
STRIPE_SECRET_KEY=sk_live_xxx
LINE_CHANNEL_ACCESS_TOKEN=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
SENDGRID_API_KEY=xxx
```

---

## 開発環境の切り替え

### ローカル ↔ Cloud の切り替え

```bash
# ローカル環境用
cp apps/staff/.env.local apps/staff/.env

# ステージング環境用
cp apps/staff/.env.staging apps/staff/.env

# 本番環境用
cp apps/staff/.env.production apps/staff/.env
```

**推奨: 各環境ファイルをあらかじめ用意しておく**

```
apps/staff/
├── .env              ← 現在有効な設定（.gitignore）
├── .env.local        ← ローカル開発用テンプレート
├── .env.staging      ← ステージング用
└── .env.production   ← 本番用（機密情報は含めない）
```

---

## 開発コマンド

### ルートコマンド

| コマンド | 説明 |
|----------|------|
| `pnpm dev` | 全パッケージの開発サーバー起動 |
| `pnpm build` | 全パッケージのビルド |
| `pnpm test` | 全パッケージのテスト実行 |
| `pnpm lint` | 全パッケージのリント |
| `pnpm typecheck` | 全パッケージの型チェック |
| `pnpm clean` | ビルド成果物削除 |

### Supabaseコマンド

| コマンド | 説明 |
|----------|------|
| `pnpm supabase:start` | ローカルSupabase起動 |
| `pnpm supabase:stop` | ローカルSupabase停止 |
| `pnpm db:migrate` | マイグレーション実行 |
| `pnpm db:reset` | DBリセット |
| `pnpm db:seed` | シードデータ投入 |

### パッケージ別コマンド

```bash
# APIパッケージのテスト
cd packages/api && pnpm test

# Coreパッケージのテスト
cd packages/core && pnpm test

# テストカバレッジ
cd packages/core && pnpm test:coverage
```

---

## データベーススキーマ

### 主要テーブル

| テーブル | 説明 |
|----------|------|
| `companies` | 会社（テナント）マスタ |
| `stores` | 店舗マスタ |
| `staff` | スタッフマスタ |
| `customers` | 顧客マスタ |
| `customer_kartes` | 顧客カルテ（髪質情報） |
| `color_recipes` | カラーレシピ |
| `perm_recipes` | パーマレシピ |
| `menus` | メニューマスタ |
| `menu_processes` | メニュー工程 |
| `products` | 商品マスタ |
| `reservations` | 予約 |
| `visits` | 来店 |
| `sales` | 売上ヘッダ |
| `sale_items` | 売上明細 |
| `sale_payments` | 支払い明細 |
| `coupons` | クーポン |
| `tickets` | 回数券 |
| `point_transactions` | ポイント履歴 |
| `shifts` | シフト |
| `attendances` | 勤怠 |
| `notifications` | 通知 |
| `subscriptions` | サブスクリプション |

### マルチテナント設計

全テーブルに`company_id`カラムを持ち、Row Level Security（RLS）でテナント分離を実現しています。

```sql
-- RLSポリシー例
CREATE POLICY "Users can only access their company data"
  ON customers
  FOR ALL
  USING (company_id = auth.jwt() ->> 'company_id');
```

---

## APIサービス一覧

`packages/api/src/services/`に31種のAPIサービスを実装しています。

### 認証・基盤

| サービス | ファイル | 主要メソッド |
|----------|----------|--------------|
| authService | authService.ts | `signIn`, `signUp`, `signOut`, `resetPassword` |
| companyService | companyService.ts | `get`, `update`, `getSettings` |
| storeService | storeService.ts | `getAll`, `create`, `update` |

### 顧客管理

| サービス | ファイル | 主要メソッド |
|----------|----------|--------------|
| customerService | customerService.ts | `search`, `create`, `update`, `getKarte`, `getColorRecipes` |
| pointService | pointService.ts | `getBalance`, `addPoints`, `usePoints` |
| memberRankService | memberRankService.ts | `getRank`, `checkUpgrade` |
| tagService | tagService.ts | `getAll`, `create`, `assignToCustomer` |

### 予約・来店

| サービス | ファイル | 主要メソッド |
|----------|----------|--------------|
| reservationService | reservationService.ts | `getByDate`, `create`, `confirm`, `cancel` |
| visitService | visitService.ts | `getToday`, `checkin`, `startService`, `complete` |

### 会計

| サービス | ファイル | 主要メソッド |
|----------|----------|--------------|
| saleService | saleService.ts | `create`, `getByDate`, `refund` |
| couponService | couponService.ts | `validate`, `apply`, `create` |
| ticketService | ticketService.ts | `getCustomerTickets`, `use`, `purchase` |

### スタッフ

| サービス | ファイル | 主要メソッド |
|----------|----------|--------------|
| staffService | staffService.ts | `getAll`, `create`, `update`, `getPermissions` |
| shiftService | shiftService.ts | `getWeek`, `create`, `clockIn`, `clockOut` |
| staffPerformanceService | staffPerformanceService.ts | `getSales`, `getRanking` |

### 通知

| サービス | ファイル | 主要メソッド |
|----------|----------|--------------|
| notificationService | notificationService.ts | `send`, `getHistory` |
| lineService | lineService.ts | `sendMessage`, `sendReminder` |
| smsService | smsService.ts | `send` |
| emailService | emailService.ts | `send` |
| reminderSchedulerService | reminderSchedulerService.ts | `schedule`, `cancel` |

### SaaS課金

| サービス | ファイル | 主要メソッド |
|----------|----------|--------------|
| subscriptionService | subscriptionService.ts | `getPlans`, `getPlan`, `getSubscription`, `changePlan` |

### その他

| サービス | ファイル | 主要メソッド |
|----------|----------|--------------|
| menuService | menuService.ts | `getAll`, `create`, `update` |
| productService | productService.ts | `getAll`, `create`, `adjustStock` |
| dailyReportService | dailyReportService.ts | `get`, `save` |
| aiService | aiService.ts | `simulateHairStyle`, `analyzeCustomer` |
| hairStyleService | hairStyleService.ts | `search`, `getCategories` |
| proposalService | proposalService.ts | `create`, `getForCustomer` |
| printService | printService.ts | `printReceipt` |
| featureSettingsService | featureSettingsService.ts | `get`, `update` |
| integrationSettingsService | integrationSettingsService.ts | `get`, `update` |
| cancellationService | cancellationService.ts | `getPolicy`, `applyFee` |

---

## 画面一覧

### Staff App（36画面）

#### 認証
- ログイン (`(auth)/login.tsx`)
- パスワードリセット

#### メインタブ
- ホーム (`(tabs)/index.tsx`)
- 来店一覧 (`(tabs)/visits.tsx`)
- 予約一覧 (`(tabs)/reservations.tsx`)
- 顧客一覧 (`(tabs)/customers.tsx`)
- 設定 (`(tabs)/settings.tsx`)

#### 詳細・操作
- 顧客詳細 (`customer/[id].tsx`)
- 来店詳細 (`visit/[id].tsx`)
- 予約作成 (`reservation/new.tsx`)
- 予約詳細 (`reservation/[id].tsx`)
- 会計 (`checkout.tsx`)

#### 管理（admin/）
- 店舗設定、メニュー管理、商品管理、スタッフ管理
- シフト・勤怠、クーポン、回数券、在庫
- 売上レポート、日報、月次レポート
- スタッフ別売上、顧客分析、売上履歴
- 外部連携、機能設定、権限管理
- プラン・課金、通知設定

### Customer App（5画面）

- ホーム (`index.tsx`)
- ヘアスタイルシミュレーション (`simulation.tsx`)
- ヘアカタログ (`gallery.tsx`)
- スタイル提案 (`proposal.tsx`)

---

## SaaSプラン

### プラン比較

| プラン | 月額 | 年額 | スタッフ | 店舗 | 顧客 | 予約/月 |
|--------|------|------|----------|------|------|---------|
| フリー | ¥0 | ¥0 | 2名 | 1店舗 | 100名 | 50件 |
| スターター | ¥4,980 | ¥49,800 | 5名 | 1店舗 | 1,000名 | 500件 |
| プロフェッショナル | ¥9,980 | ¥99,800 | 20名 | 3店舗 | 無制限 | 無制限 |
| エンタープライズ | ¥29,800 | ¥298,000 | 無制限 | 無制限 | 無制限 | 無制限 |

### プラン別機能

| 機能 | フリー | スターター | プロ | エンタープライズ |
|------|:------:|:----------:|:----:|:----------------:|
| 基本予約管理 | ✅ | ✅ | ✅ | ✅ |
| 顧客管理・カルテ | ✅ | ✅ | ✅ | ✅ |
| 会計・レシート | ✅ | ✅ | ✅ | ✅ |
| LINE/SMS通知 | ❌ | ✅ | ✅ | ✅ |
| クーポン・回数券 | ❌ | ✅ | ✅ | ✅ |
| ポイント機能 | ❌ | ✅ | ✅ | ✅ |
| シフト管理 | ❌ | ✅ | ✅ | ✅ |
| 売上レポート | 基本 | 詳細 | 詳細 | 詳細 |
| AI機能 | ❌ | ❌ | ✅ | ✅ |
| 優先サポート | ❌ | ❌ | ✅ | ✅ |
| カスタムブランディング | ❌ | ❌ | ❌ | ✅ |
| API連携 | ❌ | ❌ | ❌ | ✅ |

### 課金実装

```typescript
// packages/api/src/services/subscriptionService.ts

// プラン取得
const plans = await subscriptionService.getPlans();

// 現在のサブスクリプション取得
const subscription = await subscriptionService.getSubscription(companyId);

// プラン変更
await subscriptionService.changePlan(companyId, 'professional', 'monthly');

// 日割り計算
const proration = subscriptionService.calculateProratedAmount(
  currentPlan,
  newPlan,
  daysRemaining
);
```

---

## テスト

### テスト概要

| カテゴリ | テストスイート | テスト数 |
|---------|---------------|----------|
| ユニットテスト（Zustand Store） | 3 | 61 |
| ユニットテスト（ユーティリティ） | 2 | 79 |
| ユニットテスト（APIサービス） | 2 | 24 |
| 統合テスト（ビジネスフロー） | 11 | 227 |
| **合計** | **14** | **391** |

### テスト実行

```bash
# 全テスト実行
pnpm test

# 特定パッケージのテスト
cd packages/core && pnpm test
cd packages/api && pnpm test

# 特定のテストファイル
cd packages/api && pnpm test -- --testPathPattern="allBusinessFlows"

# ウォッチモード
pnpm test:watch

# カバレッジレポート
pnpm test:coverage
```

### テスト構成

#### ユニットテスト（164テスト）

**Zustand Store（61テスト）**
- `authStore.test.ts` - 認証ストア（ログイン、ログアウト、セッション管理）
- `saleStore.test.ts` - 会計ストア（カート操作、税計算、支払い処理）
- `uiStore.test.ts` - UIストア（モーダル、ローディング、通知）

**ユーティリティ（79テスト）**
- `validation.test.ts` - 入力バリデーション（電話番号、メール、日付等）
- `security.test.ts` - セキュリティ機能（XSS対策、サニタイズ等）

**APIサービス（24テスト）**
- `customerService.test.ts` - 顧客CRUD操作
- `subscriptionService.test.ts` - SaaSサブスクリプション管理

#### 統合テスト（227テスト）

| テストファイル | テスト数 | 対象 |
|---------------|---------|------|
| `allBusinessFlows.test.ts` | 48 | 全14業務フローの網羅的テスト |
| `bookingFlowIntegration.test.ts` | 15 | 予約・来店・会計フロー |
| `customerCancellationIntegration.test.ts` | 21 | 顧客・キャンセルポリシー |
| `reservationToSaleFlow.test.ts` | 9 | 予約→来店→売上基本フロー |
| `complexBusinessScenarios.test.ts` | 24 | 複合会計・複数支払い |
| `irregularScenarios.test.ts` | 18 | キャンセル・ブラックリスト |
| `coreServicesIntegration.test.ts` | 18 | 認証・会社・店舗・スタッフ |
| `operationsIntegration.test.ts` | 21 | シフト・来店・ポイント・タグ |
| `salesItemsIntegration.test.ts` | 21 | 回数券・クーポン・メニュー・商品 |
| `reportingIntegration.test.ts` | 15 | 通知・日報・会員ランク・印刷 |
| `externalServicesIntegration.test.ts` | 17 | AI・LINE・SMS・メール連携 |

### CRUD操作カバレッジ

各サービスのCRUD操作テスト状況：

| サービス | Create | Read | Update | Delete | 備考 |
|----------|:------:|:----:|:------:|:------:|------|
| reservationService | ✅ | ✅ | ✅ | ✅ | キャンセルは論理削除 |
| visitService | ✅ | ✅ | ✅ | ✅ | ステータス遷移でカバー |
| saleService | ✅ | ✅ | ✅ | ✅ | void処理でカバー |
| customerService | ✅ | ✅ | ✅ | ✅ | カルテ・写真含む |
| staffService | ✅ | ✅ | ✅ | ✅ | 店舗配属含む |
| menuService | ✅ | ✅ | ✅ | ✅ | カテゴリ・工程含む |
| productService | ✅ | ✅ | ✅ | ✅ | 在庫調整含む |
| ticketService | ✅ | ✅ | ✅ | ✅ | 使用・キャンセル含む |
| couponService | ✅ | ✅ | ✅ | - | 削除は実運用で稀 |
| pointService | ✅ | ✅ | ✅ | - | 付与・使用でカバー |
| shiftService | ✅ | ✅ | ✅ | ✅ | 週コピー機能含む |
| cancellationService | ✅ | ✅ | ✅ | - | ポリシー管理 |
| dailyReportService | ✅ | ✅ | ✅ | - | 締め処理でカバー |
| notificationService | ✅ | ✅ | ✅ | - | 既読処理でカバー |

### 統合テストシナリオ

**フロー1: 標準予約フロー**
```
新規予約 → 確認 → チェックイン → 施術開始 → 施術終了 → 会計 → チェックアウト
```

**フロー2: キャンセルフロー**
```
予約 → キャンセル（時間帯別料金: 48h前=0% / 24-48h=30% / 24h以内=50% / NoShow=100%）
```

**フロー3: 複合会計フロー**
```
メニュー+商品 → クーポン適用 → ポイント利用 → 複数支払い → 会計完了
```

**フロー4: 回数券フロー**
```
回数券購入 → 回数券使用 → 残数更新 → 完全消化 → ステータス更新
```

**フロー5: エンドツーエンド**
```
新規顧客登録 → 予約 → 来店 → 施術 → 会計 → ポイント付与 → 会員ランクアップ
```

### Zustandストアのテスト例

```typescript
// packages/core/src/stores/__tests__/saleStore.test.ts
import { useSaleStore } from '../saleStore';

describe('useSaleStore', () => {
  beforeEach(() => {
    useSaleStore.getState().reset();
  });

  it('should add item to cart', () => {
    const item = {
      id: 'item-1',
      type: 'menu',
      itemId: 'menu-1',
      name: 'カット',
      unitPrice: 5000,
      quantity: 1,
      taxRate: 10,
      staffAssignments: [],
      processAssignments: [],
      discounts: [],
    };

    useSaleStore.getState().addToCart(item);

    const cart = useSaleStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].name).toBe('カット');
  });

  it('should calculate totals correctly', () => {
    useSaleStore.getState().addToCart({
      id: 'item-1',
      type: 'menu',
      itemId: 'menu-1',
      name: 'カット',
      unitPrice: 5000,
      quantity: 1,
      taxRate: 10,
      staffAssignments: [],
      processAssignments: [],
      discounts: [],
    });

    const totals = useSaleStore.getState().getCartTotals();
    expect(totals.subtotal).toBe(5000);
    expect(totals.taxTotal).toBe(500);
    expect(totals.total).toBe(5500);
  });
});
```

---

## トラブルシューティング

### 環境構築時の問題

#### pnpm install でエラーが出る

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| `EACCES permission denied` | npm権限問題 | `sudo chown -R $USER ~/.npm` |
| `node version mismatch` | Node.jsバージョン不一致 | `nvm install 18 && nvm use 18` |
| `peer dependency conflicts` | パッケージ競合 | `pnpm install --force` |
| `ENOENT no such file` | キャッシュ破損 | `rm -rf node_modules && pnpm install` |

#### Supabase起動でエラーが出る

```bash
# Docker関連エラーの場合
docker ps  # Dockerが動作していることを確認

# ポート競合の場合
lsof -i :54321  # ポート使用状況を確認
supabase stop && supabase start  # 再起動

# 完全リセットする場合
supabase stop --no-backup
supabase start
```

#### マイグレーションエラー

```bash
# ローカルDBをリセット
supabase db reset

# Cloud Supabaseの場合はダッシュボードで確認
# Table Editor → SQL Editor でエラー確認
```

### Supabase接続の問題

#### 「Supabase client not initialized」エラー

**原因:** 環境変数が正しく設定されていない

**確認手順:**
```bash
# 環境変数ファイルが存在するか確認
cat apps/staff/.env

# 変数が正しいか確認
echo $EXPO_PUBLIC_SUPABASE_URL
```

**解決方法:**
1. `.env` ファイルが存在することを確認
2. URLとキーが正しいことを確認
3. 開発サーバーを再起動: `Ctrl+C` → `pnpm dev`

#### 「Invalid API key」エラー

**原因:** anon keyが間違っている

**解決方法:**
1. Supabaseダッシュボード → Settings → API
2. 「anon public」キーをコピー
3. `.env` ファイルを更新
4. 開発サーバー再起動

#### Cloud Supabaseに接続できない

```bash
# 接続テスト（URLが正しいか確認）
curl https://あなたのプロジェクトID.supabase.co/rest/v1/

# 正常なレスポンス例
{"message":"..."}
```

**チェックリスト:**
- [ ] URLが `https://` で始まっているか
- [ ] プロジェクトIDが正しいか
- [ ] ネットワーク接続があるか
- [ ] Supabaseプロジェクトがアクティブか（Freeプランは7日間非アクティブで一時停止）

### iPad・Expo関連の問題

#### QRコードをスキャンしてもアプリが開かない

**原因と解決方法:**

| チェック項目 | 確認方法 | 解決方法 |
|-------------|----------|----------|
| 同一Wi-Fi | iPadとPCのIPアドレス比較 | 同じネットワークに接続 |
| Expo Go | App Storeで確認 | 最新版にアップデート |
| ファイアウォール | PC設定を確認 | ポート19000-19002を開放 |
| VPN | 接続状況確認 | VPNを一時的に無効化 |

**代替手段: Tunnel接続**
```bash
# LAN接続がうまくいかない場合
npx expo start --tunnel
```

#### 「Unable to resolve host」エラー

```bash
# 開発サーバーのIPアドレスを確認
ifconfig | grep inet

# 明示的にホストを指定
npx expo start --host 192.168.x.x
```

#### アプリが真っ白になる / クラッシュする

**デバッグ手順:**

1. ターミナルでログを確認
```bash
npx expo start
# ログを監視しながら操作
```

2. デバッグメニューを開く（iPadを2回シェイク）
   - 「Debug Remote JS」でブラウザデバッガー起動
   - 「Show Performance Monitor」で負荷確認

3. キャッシュクリア
```bash
npx expo start --clear
```

#### 「Invariant Violation: Native module cannot be null」

**原因:** Expo Goでサポートされていないネイティブ機能を使用

**解決方法:**
Development Buildを作成する
```bash
cd apps/staff
eas build --profile development --platform ios
```

### データベースの問題

#### RLSポリシーエラー

```sql
-- エラー例: "new row violates row-level security policy"

-- 原因: ログインユーザーのcompany_idがデータと一致しない
-- 確認方法（SQL Editor）:
SELECT auth.jwt() ->> 'company_id';

-- 確認: データのcompany_idと一致しているか
SELECT company_id FROM customers LIMIT 1;
```

#### データが表示されない

**チェックリスト:**
1. ログインしているか確認
2. 正しい店舗/会社にアクセスしているか確認
3. シードデータが投入されているか確認

```bash
# シードデータ投入
pnpm db:seed
```

### 認証の問題

#### ログインできない

| エラーメッセージ | 原因 | 解決方法 |
|-----------------|------|----------|
| Invalid credentials | メール/パスワード間違い | 正しい情報を入力 |
| Email not confirmed | メール未確認 | 確認メールをクリック |
| User not found | ユーザー未登録 | 新規登録する |

#### セッションが切れる

```typescript
// デバッグ用: セッション状態を確認
import { getSupabaseClient } from '@beauty-pos/api';

const { data: { session } } = await getSupabaseClient().auth.getSession();
console.log('Session:', session);
```

### パフォーマンスの問題

#### アプリの動作が遅い

**対処法:**
1. 開発ビルドを使用（Expo Goより高速）
2. `console.log` を本番では削除
3. 大量データはページネーション

```bash
# パフォーマンス計測
npx expo start
# 'p' を押してPerformance Monitorを有効化
```

---

## よくある質問（FAQ）

### Q: ローカルとCloudのSupabaseを切り替えるには？

A: `.env` ファイルを切り替えます。

```bash
# ローカルに切り替え
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321

# Cloudに切り替え
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

### Q: テストデータをリセットするには？

```bash
# ローカルの場合
supabase db reset
pnpm db:seed

# Cloudの場合
# ダッシュボード → Table Editor → テーブル選択 → 全行削除
```

### Q: 複数のiPadで同時に動作確認するには？

同じ開発サーバーに複数台接続可能です。
- QRコードをそれぞれのiPadでスキャン
- リアルタイム同期も確認可能

### Q: 本番用のビルドを作るには？

```bash
cd apps/staff
eas build --profile production --platform ios
```

---

## デプロイ

### 本番環境構成

```
┌─────────────────────────────────────────────────────────────┐
│                     App Store / Google Play                 │
│                              ↓                              │
│ ┌─────────────────────┐  ┌─────────────────────┐           │
│ │     Staff App       │  │    Customer App     │           │
│ │  (React Native)     │  │   (React Native)    │           │
│ └──────────┬──────────┘  └──────────┬──────────┘           │
│            │                        │                       │
│            └────────────┬───────────┘                       │
│                         ↓                                   │
│              ┌──────────────────────┐                       │
│              │      Supabase        │                       │
│              │  ┌────────────────┐  │                       │
│              │  │  PostgreSQL    │  │                       │
│              │  │  + RLS         │  │                       │
│              │  └────────────────┘  │                       │
│              │  ┌────────────────┐  │                       │
│              │  │ Edge Functions │  │                       │
│              │  └────────────────┘  │                       │
│              │  ┌────────────────┐  │                       │
│              │  │    Storage     │  │                       │
│              │  └────────────────┘  │                       │
│              │  ┌────────────────┐  │                       │
│              │  │   Realtime     │  │                       │
│              │  └────────────────┘  │                       │
│              └──────────────────────┘                       │
│                         ↓                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │   Stripe    │ │    LINE     │ │   Twilio    │            │
│ │   決済      │ │   通知      │ │    SMS      │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### EAS Build設定

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### ビルドコマンド

```bash
# 開発ビルド
eas build --platform ios --profile development

# 本番ビルド
eas build --platform ios --profile production

# App Storeへ提出
eas submit --platform ios
```

---

## ライセンス

Copyright (c) 2025. All rights reserved.

---

## 関連ドキュメント

- [機能一覧詳細](./docs/FEATURES.md)
- [APIリファレンス](./docs/API_REFERENCE.md)
- [実装状況](./docs/IMPLEMENTATION_TODO.md)
- [データベース設計](./docs/database/)
