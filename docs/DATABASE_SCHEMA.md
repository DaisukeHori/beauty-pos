# Beauty POS データベーススキーマ・リレーションガイド

エンジニア向けのデータベース構造、テーブル間の関係性、CSVインポート/エクスポートのフィールドマッピングについて説明します。

## 目次

1. [エンティティ関係図（ER図）](#エンティティ関係図er図)
2. [テーブル一覧](#テーブル一覧)
3. [テーブル詳細](#テーブル詳細)
4. [リレーション詳細](#リレーション詳細)
5. [CSVインポート/エクスポート仕様](#csvインポートエクスポート仕様)
6. [キーフィールド一覧](#キーフィールド一覧)

---

## エンティティ関係図（ER図）

```
┌─────────────┐
│  companies  │ ← 会社（テナント）
└──────┬──────┘
       │ 1:N
       ├──────────────────┬──────────────────┬──────────────────┐
       ▼                  ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   stores    │    │    staff    │    │  customers  │    │    menus    │
│   (店舗)    │    │  (スタッフ)  │    │   (顧客)    │    │  (メニュー)  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │                  │                  │                  │
       │    ┌─────────────┴─────┐            │           ┌──────┴──────┐
       │    ▼                   ▼            │           ▼             ▼
       │  ┌─────────────┐  ┌─────────────┐   │    ┌─────────────┐ ┌─────────────┐
       │  │staff_stores │  │   shifts    │   │    │menu_process │ │menu_categor │
       │  │(スタッフ店舗)│  │  (シフト)   │   │    │(メニュー工程)│ │(メニューカテ)│
       │  └─────────────┘  └─────────────┘   │    └─────────────┘ └─────────────┘
       │                                     │
       │                                     │
       └────────────┬───────────────────────┬┘
                    ▼                       ▼
             ┌─────────────┐         ┌─────────────┐
             │reservations │         │customer_kart│
             │  (予約)     │         │(顧客カルテ) │
             └──────┬──────┘         └─────────────┘
                    │
                    ▼
             ┌─────────────┐
             │   visits    │ ← 来店記録
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │    sales    │ ← 売上
             └──────┬──────┘
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ sale_items  │ │sale_payments│ │sale_discount│
│ (売上明細)  │ │  (支払い)   │ │  (割引)    │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 補助エンティティ

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  products   │     │  materials  │     │  processes  │
│   (商品)    │     │   (材料)    │     │   (工程)    │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    tags     │     │   coupons   │     │   tickets   │
│   (タグ)    │     │ (クーポン)  │     │ (チケット)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## テーブル一覧

### コアテーブル（マルチテナント）

| テーブル名 | 説明 | 主キー | ビジネスキー |
|-----------|------|--------|------------|
| `companies` | 会社（テナント） | id (UUID) | - |
| `stores` | 店舗 | id (UUID) | - |
| `staff` | スタッフ | id (UUID) | employee_code |
| `customers` | 顧客 | id (UUID) | customer_code |

### メニュー・商品

| テーブル名 | 説明 | 主キー | ビジネスキー |
|-----------|------|--------|------------|
| `menu_categories` | メニューカテゴリ | id (UUID) | name |
| `menus` | メニュー | id (UUID) | code |
| `processes` | 工程 | id (UUID) | code |
| `menu_processes` | メニュー工程（中間テーブル） | id (UUID) | - |
| `products` | 商品 | id (UUID) | code |
| `materials` | 材料 | id (UUID) | code |

### 予約・来店

| テーブル名 | 説明 | 主キー | ビジネスキー |
|-----------|------|--------|------------|
| `reservations` | 予約 | id (UUID) | - |
| `visits` | 来店記録 | id (UUID) | - |

### 売上・会計

| テーブル名 | 説明 | 主キー | ビジネスキー |
|-----------|------|--------|------------|
| `sales` | 売上 | id (UUID) | sale_number |
| `sale_items` | 売上明細 | id (UUID) | - |
| `sale_payments` | 支払い | id (UUID) | - |
| `sale_discounts` | 割引 | id (UUID) | - |
| `sale_item_staff_assignments` | スタッフ売上配分 | id (UUID) | - |
| `sale_item_process_assignments` | 工程別生産性 | id (UUID) | - |
| `refunds` | 返金 | id (UUID) | refund_number |
| `accounts_receivable` | 売掛金 | id (UUID) | - |

### チケット・クーポン

| テーブル名 | 説明 | 主キー | ビジネスキー |
|-----------|------|--------|------------|
| `tickets` | 回数券・プリペイド | id (UUID) | - |
| `ticket_usages` | チケット使用履歴 | id (UUID) | - |
| `coupons` | クーポン | id (UUID) | code |
| `coupon_usages` | クーポン使用履歴 | id (UUID) | - |
| `point_transactions` | ポイント取引 | id (UUID) | - |

### タグ・カルテ

| テーブル名 | 説明 | 主キー | ビジネスキー |
|-----------|------|--------|------------|
| `tags` | タグ | id (UUID) | name |
| `tag_items` | タグ適用（中間テーブル） | id (UUID) | - |
| `customer_kartes` | 顧客カルテ | id (UUID) | - |
| `customer_photos` | 顧客写真 | id (UUID) | - |
| `color_recipes` | カラーレシピ | id (UUID) | - |
| `perm_recipes` | パーマレシピ | id (UUID) | - |

---

## テーブル詳細

### companies（会社）

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,                    -- 会社名
  name_kana VARCHAR(255),                        -- 会社名カナ
  postal_code VARCHAR(10),                       -- 郵便番号
  address TEXT,                                  -- 住所
  phone VARCHAR(20),                             -- 電話番号
  email VARCHAR(255),                            -- メールアドレス
  website VARCHAR(255),                          -- Webサイト
  logo_url TEXT,                                 -- ロゴURL
  settings JSONB DEFAULT '{}',                   -- 設定
  subscription_plan VARCHAR(50) DEFAULT 'free', -- プラン
  subscription_status VARCHAR(50) DEFAULT 'trial', -- ステータス
  stripe_customer_id VARCHAR(255),              -- Stripe顧客ID
  stripe_subscription_id VARCHAR(255),          -- StripeサブスクリプションID
  trial_ends_at TIMESTAMP WITH TIME ZONE,       -- トライアル終了日
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### stores（店舗）

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,                    -- 店舗名
  name_kana VARCHAR(255),                        -- 店舗名カナ
  postal_code VARCHAR(10),                       -- 郵便番号
  address TEXT,                                  -- 住所
  phone VARCHAR(20),                             -- 電話番号
  email VARCHAR(255),                            -- メールアドレス
  business_hours JSONB DEFAULT '{}',             -- 営業時間
  holidays JSONB DEFAULT '[]',                   -- 定休日
  settings JSONB DEFAULT '{}',                   -- 設定
  is_active BOOLEAN DEFAULT TRUE,                -- 有効フラグ
  sort_order INTEGER DEFAULT 0,                  -- 表示順
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### staff（スタッフ）

```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),        -- Supabase Auth ユーザーID
  employee_code VARCHAR(50) NOT NULL,            -- スタッフコード ★ビジネスキー
  last_name VARCHAR(100) NOT NULL,               -- 姓
  first_name VARCHAR(100) NOT NULL,              -- 名
  last_name_kana VARCHAR(100),                   -- セイ
  first_name_kana VARCHAR(100),                  -- メイ
  email VARCHAR(255),                            -- メールアドレス
  phone VARCHAR(20),                             -- 電話番号
  avatar_url TEXT,                               -- アバターURL
  role VARCHAR(50) DEFAULT 'staff',              -- 役職（owner/manager/staff）
  rank VARCHAR(50),                              -- ランク
  nomination_fee INTEGER DEFAULT 0,              -- 指名料
  hire_date DATE,                                -- 入社日
  birth_date DATE,                               -- 生年月日
  skills JSONB DEFAULT '[]',                     -- スキル
  settings JSONB DEFAULT '{}',                   -- 設定
  is_active BOOLEAN DEFAULT TRUE,                -- 有効フラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, employee_code)
);
```

### customers（顧客）

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_code VARCHAR(50) NOT NULL,            -- 顧客コード ★ビジネスキー
  last_name VARCHAR(100) NOT NULL,               -- 姓
  first_name VARCHAR(100) NOT NULL,              -- 名
  last_name_kana VARCHAR(100),                   -- セイ
  first_name_kana VARCHAR(100),                  -- メイ
  email VARCHAR(255),                            -- メールアドレス
  phone VARCHAR(20),                             -- 電話番号
  postal_code VARCHAR(10),                       -- 郵便番号
  address TEXT,                                  -- 住所
  birth_date DATE,                               -- 生年月日
  gender VARCHAR(20),                            -- 性別（male/female/other）
  occupation VARCHAR(100),                       -- 職業
  memo TEXT,                                     -- メモ
  referral_source VARCHAR(100),                  -- 紹介元
  preferred_staff_id UUID REFERENCES staff(id),  -- 担当スタッフ
  total_visits INTEGER DEFAULT 0,                -- 来店回数
  total_spend INTEGER DEFAULT 0,                 -- 利用合計
  points_balance INTEGER DEFAULT 0,              -- ポイント残高
  last_visit_at TIMESTAMP WITH TIME ZONE,        -- 最終来店日
  privacy_consent BOOLEAN DEFAULT FALSE,         -- プライバシー同意
  marketing_consent BOOLEAN DEFAULT FALSE,       -- マーケティング同意
  is_active BOOLEAN DEFAULT TRUE,                -- 有効フラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, customer_code)
);
```

### menus（メニュー）

```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id), -- カテゴリ
  code VARCHAR(50) NOT NULL,                     -- メニューコード ★ビジネスキー
  name VARCHAR(255) NOT NULL,                    -- メニュー名
  description TEXT,                              -- 説明
  base_price INTEGER NOT NULL,                   -- 基本価格
  price_short INTEGER,                           -- ショート価格
  price_medium INTEGER,                          -- ミディアム価格
  price_long INTEGER,                            -- ロング価格
  duration_minutes INTEGER DEFAULT 30,           -- 所要時間（分）
  is_set_menu BOOLEAN DEFAULT FALSE,             -- セットメニューフラグ
  set_items JSONB DEFAULT '[]',                  -- セット内容
  tax_rate NUMERIC(5,2) DEFAULT 10.00,          -- 税率
  is_ticket_eligible BOOLEAN DEFAULT TRUE,       -- チケット適用可
  is_coupon_eligible BOOLEAN DEFAULT TRUE,       -- クーポン適用可
  is_nomination_required BOOLEAN DEFAULT FALSE,  -- 指名必須
  sort_order INTEGER DEFAULT 0,                  -- 表示順
  is_active BOOLEAN DEFAULT TRUE,                -- 有効フラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, code)
);
```

### products（商品）

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,                -- カテゴリ
  code VARCHAR(50) NOT NULL,                     -- 商品コード ★ビジネスキー
  name VARCHAR(255) NOT NULL,                    -- 商品名
  brand VARCHAR(100),                            -- ブランド
  description TEXT,                              -- 説明
  unit VARCHAR(20) DEFAULT '個',                 -- 単位
  cost_price INTEGER DEFAULT 0,                  -- 原価
  selling_price INTEGER NOT NULL,                -- 販売価格
  stock_quantity INTEGER DEFAULT 0,              -- 在庫数
  min_stock_level INTEGER DEFAULT 0,             -- 最低在庫
  is_for_sale BOOLEAN DEFAULT TRUE,              -- 販売用フラグ
  is_for_internal_use BOOLEAN DEFAULT FALSE,     -- 店内使用フラグ
  tax_rate NUMERIC(5,2) DEFAULT 10.00,          -- 税率
  image_url TEXT,                                -- 画像URL
  sort_order INTEGER DEFAULT 0,                  -- 表示順
  is_active BOOLEAN DEFAULT TRUE,                -- 有効フラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, code)
);
```

### sales（売上）

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id),  -- 店舗
  visit_id UUID REFERENCES visits(id),           -- 来店記録
  customer_id UUID REFERENCES customers(id),     -- 顧客
  sale_number VARCHAR(50) NOT NULL,              -- 伝票番号 ★ビジネスキー
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 売上日時
  subtotal INTEGER DEFAULT 0,                    -- 小計
  discount_total INTEGER DEFAULT 0,              -- 割引合計
  tax_total INTEGER DEFAULT 0,                   -- 税合計
  total INTEGER DEFAULT 0,                       -- 合計
  points_used INTEGER DEFAULT 0,                 -- 使用ポイント
  points_earned INTEGER DEFAULT 0,               -- 付与ポイント
  status VARCHAR(50) DEFAULT 'completed',        -- ステータス
  notes TEXT,                                    -- 備考
  created_by UUID REFERENCES staff(id),          -- 作成者
  voided_at TIMESTAMP WITH TIME ZONE,            -- 取消日時
  voided_by UUID REFERENCES staff(id),           -- 取消者
  void_reason TEXT,                              -- 取消理由
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, sale_number)
);
```

### sale_items（売上明細）

```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,                -- アイテム種別（menu/product）
  item_id UUID,                                  -- 参照アイテムID
  name VARCHAR(255) NOT NULL,                    -- 名前
  quantity INTEGER DEFAULT 1,                    -- 数量
  unit_price INTEGER NOT NULL,                   -- 単価
  hair_length VARCHAR(20),                       -- 髪の長さ
  hair_length_charge INTEGER DEFAULT 0,          -- 長さ追加料金
  discount_amount INTEGER DEFAULT 0,             -- 割引額
  tax_rate NUMERIC(5,2) DEFAULT 10.00,          -- 税率
  tax_amount INTEGER DEFAULT 0,                  -- 税額
  subtotal INTEGER DEFAULT 0,                    -- 小計
  nomination_type VARCHAR(50),                   -- 指名タイプ
  nomination_fee INTEGER DEFAULT 0,              -- 指名料
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## リレーション詳細

### 外部キー関係一覧

```
companies (親)
├── stores.company_id
├── staff.company_id
├── customers.company_id
├── menus.company_id
├── menu_categories.company_id
├── products.company_id
├── materials.company_id
├── processes.company_id
├── tags.company_id
├── coupons.company_id
├── tickets.company_id
├── reservations.company_id
├── visits.company_id
├── sales.company_id
├── refunds.company_id
├── shifts.company_id
├── attendances.company_id
├── subscriptions.company_id
├── notifications.company_id
├── notification_templates.company_id
└── audit_logs.company_id

stores (親)
├── staff_stores.store_id
├── reservations.store_id
├── visits.store_id
├── sales.store_id
├── shifts.store_id
└── attendances.store_id

staff (親)
├── staff_stores.staff_id
├── customers.preferred_staff_id
├── reservations.staff_id
├── visits.staff_id
├── sales.created_by
├── sales.voided_by
├── shifts.staff_id
├── attendances.staff_id
├── sale_item_staff_assignments.staff_id
├── sale_item_process_assignments.staff_id
├── color_recipes.created_by
├── perm_recipes.created_by
├── refunds.created_by
├── refunds.approved_by
└── audit_logs.staff_id

customers (親)
├── reservations.customer_id
├── visits.customer_id
├── sales.customer_id
├── tickets.customer_id
├── customer_kartes.customer_id
├── customer_photos.customer_id
├── color_recipes.customer_id
├── perm_recipes.customer_id
├── accounts_receivable.customer_id
├── coupon_usages.customer_id
├── point_transactions.customer_id
├── ai_suggestions.customer_id
├── hairstyle_simulations.customer_id
└── conversation_analyses.customer_id

menus (親)
├── menu_processes.menu_id
└── (JSON参照: reservations.menu_ids)

menu_categories (親)
└── menus.category_id

processes (親)
├── menu_processes.process_id
└── sale_item_process_assignments.process_id

sales (親)
├── sale_items.sale_id
├── sale_payments.sale_id
├── sale_discounts.sale_id
├── ticket_usages.sale_id
├── coupon_usages.sale_id
├── refunds.sale_id
├── accounts_receivable.sale_id
├── point_transactions.sale_id
└── tickets.purchase_sale_id

sale_items (親)
├── sale_item_staff_assignments.sale_item_id
├── sale_item_process_assignments.sale_item_id
├── sale_discounts.sale_item_id
└── ticket_usages.sale_item_id

visits (親)
├── sales.visit_id
├── customer_photos.visit_id
├── color_recipes.visit_id
├── perm_recipes.visit_id
├── ai_suggestions.visit_id
├── hairstyle_simulations.visit_id
└── conversation_recordings.visit_id

reservations (親)
└── visits.reservation_id

tags (親)
├── tags.parent_id (自己参照)
└── tag_items.tag_id

tickets (親)
└── ticket_usages.ticket_id

coupons (親)
└── coupon_usages.coupon_id

shifts (親)
└── attendances.shift_id

conversation_recordings (親)
└── conversation_transcripts.recording_id

conversation_transcripts (親)
└── conversation_analyses.transcript_id

conversation_analyses (親)
└── ai_suggestions.analysis_id

notification_templates (親)
└── notifications.template_id
```

### 主要なリレーションパターン

#### 1. マルチテナント構造
全てのビジネステーブルは `company_id` で分離されています。

```sql
-- RLS (Row Level Security) の例
CREATE POLICY "company_isolation" ON customers
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

#### 2. 店舗スタッフの多対多関係
```
staff ←→ staff_stores ←→ stores
```

#### 3. 売上の階層構造
```
sales (売上)
  ├── sale_items (明細)
  │     ├── sale_item_staff_assignments (スタッフ配分)
  │     └── sale_item_process_assignments (工程配分)
  ├── sale_payments (支払い)
  └── sale_discounts (割引)
```

#### 4. 顧客カルテ構造
```
customers (顧客)
  ├── customer_kartes (基本カルテ)
  ├── customer_photos (写真)
  ├── color_recipes (カラーレシピ)
  └── perm_recipes (パーマレシピ)
```

---

## CSVインポート/エクスポート仕様

### 対応エンティティ

| エンティティ | テーブル名 | インポートキー | 対応アクション |
|------------|-----------|--------------|--------------|
| 商品 | products | code（商品コード） | create/update/delete |
| メニュー | menus | code（メニューコード） | create/update/delete |
| メニューカテゴリ | menu_categories | name（カテゴリ名） | create/update/delete |
| スタッフ | staff | employee_code（スタッフコード） | create/update/delete |
| 顧客 | customers | customer_code（顧客コード） | create/update/delete |
| 売上 | sales | sale_number（伝票番号） | create/update/delete |
| 売上明細 | sale_items | id | create/update/delete |
| 予約 | reservations | id | create/update/delete |
| タグ | tags | name（タグ名） | create/update/delete |
| クーポン | coupons | code（クーポンコード） | create/update/delete |
| チケット | tickets | id | create/update/delete |
| 材料 | materials | code（材料コード） | create/update/delete |
| 工程 | processes | code（工程コード） | create/update/delete |

### CSVフォーマット

#### ヘッダー構造
```csv
_action,ID,商品コード,商品名,...
```

- `_action`: 操作種別（create/update/delete）。省略時は create
- `ID`: UUID。更新/削除時に使用。新規作成時は空欄可

#### エンコーディング
- UTF-8 with BOM
- 改行: LF または CRLF
- 区切り文字: カンマ（,）
- クォート: ダブルクォート（"）

### フィールドマッピング詳細

#### products（商品）

| CSVヘッダー | DBフィールド | 型 | 必須 | 説明 |
|-----------|-------------|-----|------|------|
| ID | id | string | - | UUID |
| 商品コード | code | string | ○ | ビジネスキー |
| 商品名 | name | string | ○ | |
| カテゴリ | category | string | ○ | |
| ブランド | brand | string | - | |
| 説明 | description | string | - | |
| 単位 | unit | string | - | デフォルト: 個 |
| 原価 | cost_price | number | - | |
| 販売価格 | selling_price | number | ○ | |
| 在庫数 | stock_quantity | number | - | |
| 最低在庫 | min_stock_level | number | - | |
| 販売用 | is_for_sale | boolean | - | true/false |
| 店内使用 | is_for_internal_use | boolean | - | |
| 税率 | tax_rate | number | - | パーセント |
| 画像URL | image_url | string | - | |
| 表示順 | sort_order | number | - | |
| 有効 | is_active | boolean | - | |

#### menus（メニュー）

| CSVヘッダー | DBフィールド | 型 | 必須 | 説明 |
|-----------|-------------|-----|------|------|
| ID | id | string | - | UUID |
| メニューコード | code | string | ○ | ビジネスキー |
| メニュー名 | name | string | ○ | |
| カテゴリID | category_id | string | - | menu_categories.id |
| 説明 | description | string | - | |
| 基本価格 | base_price | number | ○ | |
| ショート価格 | price_short | number | - | |
| ミディアム価格 | price_medium | number | - | |
| ロング価格 | price_long | number | - | |
| 所要時間（分） | duration_minutes | number | - | |
| セットメニュー | is_set_menu | boolean | - | |
| 税率 | tax_rate | number | - | |
| チケット適用 | is_ticket_eligible | boolean | - | |
| クーポン適用 | is_coupon_eligible | boolean | - | |
| 指名必須 | is_nomination_required | boolean | - | |
| 表示順 | sort_order | number | - | |
| 有効 | is_active | boolean | - | |

#### staff（スタッフ）

| CSVヘッダー | DBフィールド | 型 | 必須 | 説明 |
|-----------|-------------|-----|------|------|
| ID | id | string | - | UUID |
| スタッフコード | employee_code | string | ○ | ビジネスキー |
| 姓 | last_name | string | ○ | |
| 名 | first_name | string | ○ | |
| セイ | last_name_kana | string | - | |
| メイ | first_name_kana | string | - | |
| メール | email | string | - | |
| 電話番号 | phone | string | - | |
| 役職 | role | string | - | owner/manager/staff |
| ランク | rank | string | - | |
| 指名料 | nomination_fee | number | - | |
| 入社日 | hire_date | date | - | YYYY-MM-DD |
| 生年月日 | birth_date | date | - | YYYY-MM-DD |
| 有効 | is_active | boolean | - | |

#### customers（顧客）

| CSVヘッダー | DBフィールド | 型 | 必須 | 説明 |
|-----------|-------------|-----|------|------|
| ID | id | string | - | UUID |
| 顧客コード | customer_code | string | ○ | ビジネスキー |
| 姓 | last_name | string | ○ | |
| 名 | first_name | string | ○ | |
| セイ | last_name_kana | string | - | |
| メイ | first_name_kana | string | - | |
| メール | email | string | - | |
| 電話番号 | phone | string | - | |
| 郵便番号 | postal_code | string | - | 123-4567 |
| 住所 | address | string | - | |
| 生年月日 | birth_date | date | - | YYYY-MM-DD |
| 性別 | gender | string | - | male/female/男性/女性 |
| 職業 | occupation | string | - | |
| メモ | memo | string | - | |
| 紹介元 | referral_source | string | - | |
| 担当スタッフID | preferred_staff_id | string | - | staff.id |
| 来店回数 | total_visits | number | - | |
| 利用合計 | total_spend | number | - | |
| ポイント残高 | points_balance | number | - | |
| 最終来店日 | last_visit_at | date | - | |
| プライバシー同意 | privacy_consent | boolean | - | |
| マーケティング同意 | marketing_consent | boolean | - | |
| 有効 | is_active | boolean | - | |

#### sales（売上）

| CSVヘッダー | DBフィールド | 型 | 必須 | 説明 |
|-----------|-------------|-----|------|------|
| ID | id | string | - | UUID |
| 伝票番号 | sale_number | string | ○ | ビジネスキー |
| 店舗ID | store_id | string | ○ | stores.id |
| 来店ID | visit_id | string | - | visits.id |
| 顧客ID | customer_id | string | - | customers.id |
| 売上日時 | sale_date | date | ○ | ISO 8601 |
| 小計 | subtotal | number | - | |
| 割引合計 | discount_total | number | - | |
| 税合計 | tax_total | number | - | |
| 合計 | total | number | ○ | |
| 使用ポイント | points_used | number | - | |
| 付与ポイント | points_earned | number | - | |
| ステータス | status | string | - | completed/voided/完了/取消 |
| 備考 | notes | string | - | |
| 作成者ID | created_by | string | - | staff.id |

#### sale_items（売上明細）

| CSVヘッダー | DBフィールド | 型 | 必須 | 説明 |
|-----------|-------------|-----|------|------|
| ID | id | string | - | UUID |
| 売上ID | sale_id | string | ○ | sales.id |
| アイテム種別 | item_type | string | ○ | menu/product/メニュー/商品 |
| アイテムID | item_id | string | - | menus.id または products.id |
| 名前 | name | string | ○ | |
| 数量 | quantity | number | - | デフォルト: 1 |
| 単価 | unit_price | number | ○ | |
| 髪の長さ | hair_length | string | - | short/medium/long |
| 長さ追加料金 | hair_length_charge | number | - | |
| 割引額 | discount_amount | number | - | |
| 税率 | tax_rate | number | - | |
| 税額 | tax_amount | number | - | |
| 小計 | subtotal | number | - | |
| 指名タイプ | nomination_type | string | - | first/repeat/指名/フリー |
| 指名料 | nomination_fee | number | - | |

---

## キーフィールド一覧

CSVインポート時、IDを指定しない場合はビジネスキーでレコードを特定し、更新または新規作成を行います。

| エンティティ | ビジネスキー | DBフィールド | CSVヘッダー | ユニーク制約 |
|------------|------------|-------------|-----------|------------|
| products | 商品コード | code | 商品コード | company_id + code |
| menus | メニューコード | code | メニューコード | company_id + code |
| menu_categories | カテゴリ名 | name | カテゴリ名 | company_id + name |
| staff | スタッフコード | employee_code | スタッフコード | company_id + employee_code |
| customers | 顧客コード | customer_code | 顧客コード | company_id + customer_code |
| sales | 伝票番号 | sale_number | 伝票番号 | company_id + sale_number |
| tags | タグ名 | name | タグ名 | company_id + name |
| coupons | クーポンコード | code | クーポンコード | company_id + code |
| materials | 材料コード | code | 材料コード | company_id + code |
| processes | 工程コード | code | 工程コード | company_id + code |

### インポート処理フロー

```
1. CSVパース
   ↓
2. セキュリティチェック（SQLインジェクション、XSS）
   ↓
3. データ型バリデーション
   ↓
4. 必須フィールドチェック
   ↓
5. ビジネスキーで既存レコード検索
   ↓
6. 存在する場合 → UPDATE
   存在しない場合 → INSERT
   _action = delete の場合 → DELETE
```

---

## セキュリティ考慮事項

### 入力バリデーション

CSVインポート時に以下のセキュリティチェックを実施:

1. **SQLインジェクション検出**
   - SELECT, INSERT, UPDATE, DELETE等のキーワード
   - シングルクォート、セミコロン、コメント記号
   - 1=1 等の条件式

2. **XSS検出**
   - `<script>` タグ
   - javascript: URI
   - イベントハンドラ属性（onclick, onerror等）
   - data: URI

3. **データ型検証**
   - 数値: 範囲チェック、負数制御
   - 日付: 1900-2100年の範囲
   - メール: RFC準拠形式
   - 電話番号: 10-20桁
   - UUID: 正規表現検証

### RLS（Row Level Security）

全テーブルで `company_id` による行レベルセキュリティを適用。テナント間のデータ分離を保証。

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `packages/api/src/services/csvService.ts` | CSVインポート/エクスポートサービス |
| `packages/api/src/utils/csvValidator.ts` | セキュリティバリデーション |
| `packages/api/src/types/database.ts` | TypeScript型定義 |
| `supabase/functions/import-csv/index.ts` | インポートEdge Function |
| `supabase/functions/export-csv/index.ts` | エクスポートEdge Function |
| `apps/staff/app/admin/data-management.tsx` | 管理画面UI |
| `supabase/migrations/*.sql` | データベースマイグレーション |
