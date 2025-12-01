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
- [開発コマンド](#開発コマンド)
- [データベーススキーマ](#データベーススキーマ)
- [APIサービス一覧](#apiサービス一覧)
- [画面一覧](#画面一覧)
- [SaaSプラン](#saasプラン)
- [テスト](#テスト)
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

- Node.js 18.0.0以上
- pnpm 8.15.0以上
- Expo CLI
- Supabase CLI
- Xcode（iOSビルド用）

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/beauty-pos.git
cd beauty-pos
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 環境変数の設定

各アプリに`.env`ファイルを作成します。

**apps/staff/.env**
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

**apps/customer/.env**
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Supabaseのセットアップ

```bash
# Supabaseローカル起動
pnpm supabase:start

# マイグレーション実行
pnpm db:migrate

# シードデータ投入（オプション）
pnpm db:seed
```

### 5. 開発サーバー起動

```bash
# 全パッケージの開発サーバー起動
pnpm dev

# スタッフアプリのみ起動
cd apps/staff && pnpm dev

# 顧客アプリのみ起動
cd apps/customer && pnpm dev
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

| パッケージ | テストスイート | テスト数 |
|-----------|---------------|----------|
| @beauty-pos/core | 5 | 140 |
| @beauty-pos/api | 2 | 24 |
| **合計** | **7** | **164** |

### テスト実行

```bash
# 全テスト実行
pnpm test

# 特定パッケージのテスト
cd packages/core && pnpm test
cd packages/api && pnpm test

# ウォッチモード
pnpm test:watch

# カバレッジレポート
pnpm test:coverage
```

### テスト構成

#### Core パッケージ
- `stores/__tests__/authStore.test.ts` - 認証ストアテスト
- `stores/__tests__/saleStore.test.ts` - 会計ストアテスト
- `stores/__tests__/uiStore.test.ts` - UIストアテスト
- `utils/__tests__/validation.test.ts` - バリデーションテスト
- `utils/__tests__/security.test.ts` - セキュリティテスト

#### API パッケージ
- `__tests__/customerService.test.ts` - 顧客サービステスト
- `__tests__/subscriptionService.test.ts` - サブスクリプションテスト

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
