# 美容室向け高度分析POSシステム データベース設計書

**バージョン**: 1.0
**作成日**: 2025-11-30
**プロジェクト名**: Beauty POS

---

## 1. ER図

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           ER Diagram                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐            │
│  │  companies   │──────<│   stores     │──────<│    staff     │       │   customers  │            │
│  └──────────────┘   1:N └──────────────┘   N:M └──────────────┘       └──────────────┘            │
│         │                      │                     │                       │                     │
│         │                      │                     │                       │                     │
│         │                      ▼                     ▼                       ▼                     │
│         │               ┌──────────────┐      ┌──────────────┐       ┌──────────────┐            │
│         │               │ reservations │◄────►│    visits    │◄─────►│    sales     │            │
│         │               └──────────────┘      └──────────────┘       └──────────────┘            │
│         │                                            │                       │                     │
│         │                                            │                       ▼                     │
│         │                                            │               ┌──────────────┐            │
│         │                                            │               │  sale_items  │            │
│         │                                            │               └──────────────┘            │
│         │                                            │                       │                     │
│         │                                            │                       ▼                     │
│         │                                            │               ┌──────────────┐            │
│         │                                            │               │sale_item_staff│            │
│         │                                            │               │ _assignments │            │
│         │                                            │               └──────────────┘            │
│         │                                            │                                            │
│         ▼                                            ▼                                            │
│  ┌──────────────┐                            ┌──────────────┐                                     │
│  │    menus     │                            │conversation  │                                     │
│  └──────────────┘                            │  _records    │                                     │
│         │                                    └──────────────┘                                     │
│         ▼                                                                                          │
│  ┌──────────────┐                                                                                 │
│  │menu_processes│                                                                                 │
│  └──────────────┘                                                                                 │
│                                                                                                     │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐                                   │
│  │    tags      │──────<│  tag_items   │       │   products   │                                   │
│  └──────────────┘   1:N └──────────────┘       └──────────────┘                                   │
│                                                                                                     │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐                                   │
│  │   tickets    │──────<│ticket_usages │       │   coupons    │                                   │
│  └──────────────┘   1:N └──────────────┘       └──────────────┘                                   │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. テーブル定義

### 2.1 会社・店舗・スタッフ

#### companies（会社）
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_kana VARCHAR(100),
    postal_code VARCHAR(8),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    invoice_registration_number VARCHAR(20), -- インボイス登録番号
    plan VARCHAR(20) NOT NULL DEFAULT 'basic', -- basic, professional, enterprise
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### stores（店舗）
```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_kana VARCHAR(100),
    code VARCHAR(20), -- 店舗コード
    postal_code VARCHAR(8),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    business_hours JSONB, -- {"mon": {"open": "09:00", "close": "20:00"}, ...}
    holidays JSONB, -- {"regular": ["sunday"], "special": ["2025-01-01"]}
    seat_count INTEGER DEFAULT 1, -- セット面数
    reservation_interval INTEGER DEFAULT 30, -- 予約枠間隔（分）
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stores_company_id ON stores(company_id);
```

#### staff（スタッフ）
```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Supabase Auth連携
    employee_code VARCHAR(20),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    first_name_kana VARCHAR(50),
    last_name_kana VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'stylist', -- owner, manager, stylist, assistant
    rank VARCHAR(20), -- jr, stylist, top_stylist, director
    nomination_fee INTEGER DEFAULT 0, -- 指名料
    commission_rate DECIMAL(5,2), -- 歩合率
    license_number VARCHAR(50), -- 美容師免許番号
    license_expiry DATE,
    hire_date DATE,
    birth_date DATE,
    bio TEXT, -- 自己紹介
    specialties TEXT[], -- 得意分野
    sns_links JSONB, -- {"instagram": "...", "twitter": "..."}
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_staff_company_id ON staff(company_id);
CREATE INDEX idx_staff_user_id ON staff(user_id);
```

#### staff_stores（スタッフ-店舗紐付け）
```sql
CREATE TABLE staff_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE, -- メイン店舗
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, store_id)
);

CREATE INDEX idx_staff_stores_staff_id ON staff_stores(staff_id);
CREATE INDEX idx_staff_stores_store_id ON staff_stores(store_id);
```

### 2.2 顧客管理

#### customers（顧客）
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_code VARCHAR(20),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    first_name_kana VARCHAR(50),
    last_name_kana VARCHAR(50),
    gender VARCHAR(10), -- male, female, other
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(255),
    postal_code VARCHAR(8),
    prefecture VARCHAR(10),
    city VARCHAR(50),
    street TEXT,
    building VARCHAR(100),
    referral_source VARCHAR(50), -- 来店きっかけ
    referral_customer_id UUID REFERENCES customers(id), -- 紹介者
    status VARCHAR(20) DEFAULT 'active', -- active, dormant, lost
    rank VARCHAR(20), -- bronze, silver, gold, platinum
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_spent DECIMAL(10,2) DEFAULT 0,
    points INTEGER DEFAULT 0,
    last_visit_at TIMESTAMP WITH TIME ZONE,
    next_visit_estimate DATE,
    visit_interval_days INTEGER, -- 平均来店間隔
    notes TEXT,
    -- 同意情報
    consent_privacy_policy BOOLEAN DEFAULT FALSE,
    consent_privacy_policy_at TIMESTAMP WITH TIME ZONE,
    consent_marketing BOOLEAN DEFAULT FALSE,
    consent_marketing_at TIMESTAMP WITH TIME ZONE,
    consent_photo_sns BOOLEAN DEFAULT FALSE,
    consent_photo_hp BOOLEAN DEFAULT FALSE,
    consent_photo_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_last_visit_at ON customers(last_visit_at);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);
CREATE INDEX idx_customers_name_kana ON customers(last_name_kana, first_name_kana);
```

#### customer_kartes（顧客カルテ）
```sql
CREATE TABLE customer_kartes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
    -- 髪質
    hair_thickness VARCHAR(20), -- thin, normal, thick
    hair_hardness VARCHAR(20), -- soft, normal, hard
    hair_volume VARCHAR(20), -- little, normal, much
    hair_curl_type VARCHAR(20), -- straight, wavy, curly, kinky
    hair_curl_level INTEGER, -- 1-5
    hair_damage_level INTEGER, -- 1-5
    hair_damage_notes TEXT,
    -- 白髪
    gray_hair_percentage INTEGER, -- 0-100
    gray_hair_distribution TEXT,
    gray_hair_growth_rate DECIMAL(3,1), -- cm/月
    recommended_visit_interval INTEGER, -- 推奨来店周期（日）
    -- 頭皮
    scalp_type VARCHAR(20), -- normal, dry, oily
    scalp_sensitivity BOOLEAN DEFAULT FALSE,
    scalp_notes TEXT,
    -- アレルギー
    allergies JSONB DEFAULT '[]', -- [{type, details, severity}]
    patch_test_required BOOLEAN DEFAULT FALSE,
    last_patch_test_date DATE,
    last_patch_test_result VARCHAR(20),
    -- 健康・配慮事項
    is_pregnant BOOLEAN DEFAULT FALSE,
    health_notes TEXT,
    wheelchair_required BOOLEAN DEFAULT FALSE,
    -- 嗜好
    occupation VARCHAR(50),
    lifestyle_notes TEXT,
    preferred_styles JSONB DEFAULT '[]', -- 好みのスタイル画像URL
    ng_styles JSONB DEFAULT '[]', -- NGスタイル画像URL
    conversation_topics TEXT, -- 会話ネタメモ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_kartes_customer_id ON customer_kartes(customer_id);
```

#### customer_photos（顧客写真）
```sql
CREATE TABLE customer_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    type VARCHAR(20) NOT NULL, -- before, after, style_reference
    angle VARCHAR(20), -- front, left, right, back
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_photos_customer_id ON customer_photos(customer_id);
CREATE INDEX idx_customer_photos_visit_id ON customer_photos(visit_id);
```

#### color_recipes（カラーレシピ）
```sql
CREATE TABLE color_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    staff_id UUID REFERENCES staff(id),
    area VARCHAR(20) NOT NULL, -- root, mid, end, highlight, lowlight, all
    brand VARCHAR(50),
    color_name VARCHAR(50),
    color_number VARCHAR(20),
    amount_g DECIMAL(5,1),
    developer_percent DECIMAL(4,1),
    developer_amount_g DECIMAL(5,1),
    additives JSONB, -- [{name, amount}]
    processing_time INTEGER, -- 放置時間（分）
    heat_applied BOOLEAN DEFAULT FALSE,
    result_notes TEXT,
    result_rating INTEGER, -- 1-5
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_color_recipes_customer_id ON color_recipes(customer_id);
CREATE INDEX idx_color_recipes_visit_id ON color_recipes(visit_id);
```

#### perm_recipes（パーマレシピ）
```sql
CREATE TABLE perm_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    staff_id UUID REFERENCES staff(id),
    perm_type VARCHAR(30), -- cold, digital, air, creep, straight
    rod_sizes JSONB, -- [{area, size, count}]
    winding_pattern TEXT,
    solution1_brand VARCHAR(50),
    solution1_type VARCHAR(30),
    solution1_time INTEGER, -- 分
    solution2_brand VARCHAR(50),
    solution2_type VARCHAR(30),
    solution2_time INTEGER, -- 分
    heat_temp INTEGER, -- デジタルパーマの温度
    heat_time INTEGER, -- 加温時間
    result_notes TEXT,
    result_rating INTEGER, -- 1-5
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_perm_recipes_customer_id ON perm_recipes(customer_id);
CREATE INDEX idx_perm_recipes_visit_id ON perm_recipes(visit_id);
```

### 2.3 メニュー・商品

#### menu_categories（メニューカテゴリ）
```sql
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_company_id ON menu_categories(company_id);
```

#### menus（メニュー）
```sql
CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(id),
    code VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price INTEGER NOT NULL,
    -- 髪の長さ別料金
    price_short INTEGER,
    price_medium INTEGER,
    price_long INTEGER,
    -- 追加料金
    long_charge INTEGER DEFAULT 0, -- ロング料金
    -- 時間
    duration_minutes INTEGER NOT NULL, -- 所要時間
    -- 生産性按分設定
    productivity_rate_primary DECIMAL(5,2) DEFAULT 100, -- 主担当の生産性率
    productivity_rate_worker1 DECIMAL(5,2) DEFAULT 0, -- 作業担当1の生産性率
    productivity_rate_worker2 DECIMAL(5,2) DEFAULT 0, -- 作業担当2の生産性率
    -- その他
    tax_rate DECIMAL(4,2) DEFAULT 10,
    is_set_menu BOOLEAN DEFAULT FALSE,
    set_menu_items JSONB, -- セットメニューの内容 [{menu_id, discount}]
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menus_company_id ON menus(company_id);
CREATE INDEX idx_menus_category_id ON menus(category_id);
```

#### processes（作業工程マスタ）
```sql
CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    default_productivity_rate DECIMAL(5,2) DEFAULT 100,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_processes_company_id ON processes(company_id);
```

#### menu_processes（メニュー-工程紐付け）
```sql
CREATE TABLE menu_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    productivity_amount INTEGER NOT NULL, -- この工程の生産性金額
    default_worker1_rate DECIMAL(5,2) DEFAULT 100, -- デフォルトの担当1比率
    default_worker2_rate DECIMAL(5,2) DEFAULT 0, -- デフォルトの担当2比率
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_id, process_id)
);

CREATE INDEX idx_menu_processes_menu_id ON menu_processes(menu_id);
```

#### products（商品）
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(30), -- JANコード等
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    description TEXT,
    price INTEGER NOT NULL,
    cost INTEGER, -- 原価
    tax_rate DECIMAL(4,2) DEFAULT 10,
    stock_quantity INTEGER DEFAULT 0,
    reorder_point INTEGER, -- 発注点
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_code ON products(code);
```

#### materials（材料）
```sql
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(30),
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    category VARCHAR(30), -- color, perm, treatment, shampoo, etc
    unit VARCHAR(10), -- g, ml, piece
    cost_per_unit DECIMAL(10,2),
    stock_quantity DECIMAL(10,2) DEFAULT 0,
    reorder_point DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_materials_company_id ON materials(company_id);
```

### 2.4 予約・来店

#### reservations（予約）
```sql
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    staff_id UUID NOT NULL REFERENCES staff(id),
    nomination_type VARCHAR(10) NOT NULL, -- nominated, free
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    estimated_total INTEGER,
    status VARCHAR(20) DEFAULT 'confirmed', -- pending, confirmed, checked_in, in_progress, completed, cancelled, no_show
    source VARCHAR(20) DEFAULT 'app', -- app, phone, walk_in, hotpepper, etc
    notes TEXT,
    internal_notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    checked_out_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reservations_company_id ON reservations(company_id);
CREATE INDEX idx_reservations_store_id ON reservations(store_id);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_staff_id ON reservations(staff_id);
CREATE INDEX idx_reservations_start_time ON reservations(start_time);
CREATE INDEX idx_reservations_status ON reservations(status);
```

#### reservation_menus（予約-メニュー紐付け）
```sql
CREATE TABLE reservation_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id),
    quantity INTEGER DEFAULT 1,
    hair_length VARCHAR(10), -- short, medium, long
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reservation_menus_reservation_id ON reservation_menus(reservation_id);
```

#### visits（来店）
```sql
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    reservation_id UUID REFERENCES reservations(id),
    primary_staff_id UUID NOT NULL REFERENCES staff(id),
    nomination_type VARCHAR(10) NOT NULL, -- nominated, free
    visit_number INTEGER, -- この顧客の何回目の来店か
    check_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    check_out_at TIMESTAMP WITH TIME ZONE,
    wait_time_minutes INTEGER, -- 待ち時間
    service_start_at TIMESTAMP WITH TIME ZONE,
    service_end_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'checked_in', -- checked_in, in_service, completed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_visits_company_id ON visits(company_id);
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_store_id ON visits(store_id);
CREATE INDEX idx_visits_check_in_at ON visits(check_in_at);
```

### 2.5 会計・売上

#### sales（売上）
```sql
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    visit_id UUID REFERENCES visits(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    primary_staff_id UUID NOT NULL REFERENCES staff(id),
    nomination_type VARCHAR(10) NOT NULL, -- nominated, free
    nomination_fee INTEGER DEFAULT 0,
    receipt_number VARCHAR(20) NOT NULL,
    invoice_number VARCHAR(20), -- インボイス番号
    subtotal INTEGER NOT NULL,
    discount_total INTEGER DEFAULT 0,
    tax_total INTEGER NOT NULL,
    total INTEGER NOT NULL,
    points_used INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed', -- completed, refunded, partially_refunded
    notes TEXT,
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_company_id ON sales(company_id);
CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_primary_staff_id ON sales(primary_staff_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_receipt_number ON sales(receipt_number);
```

#### sale_items（売上明細）
```sql
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL, -- menu, product
    item_id UUID NOT NULL, -- menu.id or product.id
    name VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price INTEGER NOT NULL,
    hair_length VARCHAR(10), -- short, medium, long
    hair_length_charge INTEGER DEFAULT 0,
    subtotal INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    tax_rate DECIMAL(4,2) NOT NULL,
    tax_amount INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
```

#### sale_item_staff_assignments（売上明細-スタッフ割当）
```sql
CREATE TABLE sale_item_staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id),
    role VARCHAR(20) NOT NULL, -- primary, worker1, worker2
    sales_amount INTEGER DEFAULT 0, -- 売上計上額
    productivity_amount INTEGER DEFAULT 0, -- 生産性計上額
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_item_staff_assignments_sale_item_id ON sale_item_staff_assignments(sale_item_id);
CREATE INDEX idx_sale_item_staff_assignments_staff_id ON sale_item_staff_assignments(staff_id);
```

#### sale_item_process_assignments（売上明細-工程別担当割当）
```sql
CREATE TABLE sale_item_process_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id),
    staff_id UUID NOT NULL REFERENCES staff(id),
    productivity_amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_item_process_assignments_sale_item_id ON sale_item_process_assignments(sale_item_id);
CREATE INDEX idx_sale_item_process_assignments_staff_id ON sale_item_process_assignments(staff_id);
```

#### sale_payments（売上支払い）
```sql
CREATE TABLE sale_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL, -- cash, credit_card, debit_card, electronic_money, qr_code, gift_card, prepaid, accounts_receivable
    amount INTEGER NOT NULL,
    card_brand VARCHAR(20), -- visa, mastercard, jcb, amex
    terminal_transaction_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_payments_sale_id ON sale_payments(sale_id);
```

#### sale_discounts（売上割引）
```sql
CREATE TABLE sale_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES sale_items(id), -- NULLなら全体割引
    type VARCHAR(20) NOT NULL, -- percentage, amount, coupon
    value INTEGER NOT NULL, -- 割引率または割引額
    amount INTEGER NOT NULL, -- 実際の割引額
    coupon_id UUID REFERENCES coupons(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_discounts_sale_id ON sale_discounts(sale_id);
```

#### refunds（返金）
```sql
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id),
    refund_number VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    refund_method VARCHAR(30) NOT NULL,
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refunds_sale_id ON refunds(sale_id);
```

#### refund_items（返金明細）
```sql
CREATE TABLE refund_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES sale_items(id),
    quantity INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refund_items_refund_id ON refund_items(refund_id);
```

#### accounts_receivable（売掛金）
```sql
CREATE TABLE accounts_receivable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    sale_id UUID REFERENCES sales(id),
    amount INTEGER NOT NULL,
    balance INTEGER NOT NULL, -- 残高
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid, overdue
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_receivable_customer_id ON accounts_receivable(customer_id);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);
```

#### accounts_receivable_payments（売掛金入金）
```sql
CREATE TABLE accounts_receivable_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accounts_receivable_id UUID NOT NULL REFERENCES accounts_receivable(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_by UUID REFERENCES staff(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ar_payments_ar_id ON accounts_receivable_payments(accounts_receivable_id);
```

### 2.6 回数券・クーポン・ポイント

#### ticket_types（回数券タイプ）
```sql
CREATE TABLE ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- 販売価格
    total_count INTEGER NOT NULL, -- 回数
    valid_days INTEGER, -- 有効期間（日）
    applicable_menu_tag_ids UUID[], -- 適用可能メニュータグ
    applicable_menu_ids UUID[], -- 適用可能メニュー（個別指定）
    is_gift BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ticket_types_company_id ON ticket_types(company_id);
```

#### tickets（回数券）
```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    remaining_count INTEGER NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active', -- active, used, expired
    sale_id UUID REFERENCES sales(id), -- 購入時の売上
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_code ON tickets(code);
CREATE INDEX idx_tickets_status ON tickets(status);
```

#### ticket_usages（回数券使用履歴）
```sql
CREATE TABLE ticket_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    sale_id UUID NOT NULL REFERENCES sales(id),
    sale_item_id UUID NOT NULL REFERENCES sale_items(id),
    count_used INTEGER DEFAULT 1,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ticket_usages_ticket_id ON ticket_usages(ticket_id);
CREATE INDEX idx_ticket_usages_sale_id ON ticket_usages(sale_id);
```

#### coupons（クーポン）
```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    type VARCHAR(20) NOT NULL, -- percentage, amount
    value INTEGER NOT NULL,
    max_discount INTEGER, -- 最大割引額
    min_purchase INTEGER, -- 最低購入額
    applicable_menu_tag_ids UUID[],
    applicable_menu_ids UUID[],
    usage_limit INTEGER, -- 使用回数上限
    usage_count INTEGER DEFAULT 0,
    per_customer_limit INTEGER, -- 1顧客あたりの使用上限
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_company_id ON coupons(company_id);
CREATE INDEX idx_coupons_code ON coupons(code);
```

#### coupon_usages（クーポン使用履歴）
```sql
CREATE TABLE coupon_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    sale_id UUID NOT NULL REFERENCES sales(id),
    discount_amount INTEGER NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX idx_coupon_usages_customer_id ON coupon_usages(customer_id);
```

#### point_transactions（ポイント履歴）
```sql
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    sale_id UUID REFERENCES sales(id),
    type VARCHAR(20) NOT NULL, -- earn, use, expire, adjust
    points INTEGER NOT NULL, -- プラスまたはマイナス
    balance_after INTEGER NOT NULL,
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_point_transactions_customer_id ON point_transactions(customer_id);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at);
```

### 2.7 汎用タグシステム

#### tags（タグ）
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#808080', -- HEXカラー
    icon VARCHAR(30),
    parent_id UUID REFERENCES tags(id),
    applicable_to TEXT[] NOT NULL, -- customer, staff, menu, product, etc
    sort_order INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tags_company_id ON tags(company_id);
CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_tags_applicable_to ON tags USING GIN(applicable_to);
```

#### tag_items（タグ-エンティティ紐付け）
```sql
CREATE TABLE tag_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type VARCHAR(30) NOT NULL, -- customer, staff, menu, product, sale, etc
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tag_id, entity_type, entity_id)
);

CREATE INDEX idx_tag_items_tag_id ON tag_items(tag_id);
CREATE INDEX idx_tag_items_entity ON tag_items(entity_type, entity_id);
```

### 2.8 シフト・勤怠

#### shifts（シフト）
```sql
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    staff_id UUID NOT NULL REFERENCES staff(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, confirmed, completed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, staff_id, date)
);

CREATE INDEX idx_shifts_store_id ON shifts(store_id);
CREATE INDEX idx_shifts_staff_id ON shifts(staff_id);
CREATE INDEX idx_shifts_date ON shifts(date);
```

#### attendances（勤怠）
```sql
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'present', -- present, absent, late, early_leave, holiday
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

CREATE INDEX idx_attendances_staff_id ON attendances(staff_id);
CREATE INDEX idx_attendances_date ON attendances(date);
```

### 2.9 AI・会話分析

#### conversation_recordings（会話録音）
```sql
CREATE TABLE conversation_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES visits(id),
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'processing', -- processing, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_recordings_visit_id ON conversation_recordings(visit_id);
```

#### conversation_transcripts（会話文字起こし）
```sql
CREATE TABLE conversation_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES conversation_recordings(id) ON DELETE CASCADE,
    full_text TEXT NOT NULL,
    segments JSONB, -- [{start, end, text, speaker}]
    language VARCHAR(10) DEFAULT 'ja',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_transcripts_recording_id ON conversation_transcripts(recording_id);
```

#### conversation_analyses（会話分析）
```sql
CREATE TABLE conversation_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES conversation_recordings(id) ON DELETE CASCADE,
    summary TEXT,
    topics TEXT[],
    sentiment VARCHAR(20), -- positive, neutral, negative
    sentiment_score DECIMAL(3,2),
    upsell_opportunities JSONB, -- [{timing, suggestion, confidence}]
    crosssell_opportunities JSONB, -- [{product, reason, confidence}]
    key_insights TEXT[],
    next_visit_suggestions TEXT[],
    conversation_quality_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_analyses_recording_id ON conversation_analyses(recording_id);
```

#### ai_suggestions（AI提案）
```sql
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES visits(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    type VARCHAR(30) NOT NULL, -- upsell, crosssell, hairstyle, product, next_visit
    suggestion TEXT NOT NULL,
    confidence DECIMAL(3,2),
    context JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, shown, accepted, dismissed
    shown_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_suggestions_visit_id ON ai_suggestions(visit_id);
CREATE INDEX idx_ai_suggestions_customer_id ON ai_suggestions(customer_id);
```

#### hairstyle_simulations（ヘアスタイルシミュレーション）
```sql
CREATE TABLE hairstyle_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_photo_url TEXT NOT NULL,
    style_image_url TEXT NOT NULL,
    style_source VARCHAR(30), -- pinterest, upload, catalog
    generated_image_url TEXT,
    thumbnail_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    customer_approved BOOLEAN,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hairstyle_simulations_customer_id ON hairstyle_simulations(customer_id);
```

### 2.10 通知

#### notification_templates（通知テンプレート）
```sql
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- reservation_reminder, birthday, thank_you, ticket_expiry, etc
    channel VARCHAR(20) NOT NULL, -- line, email, sms, push
    subject VARCHAR(200),
    body TEXT NOT NULL,
    variables TEXT[], -- 利用可能な変数リスト
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_company_id ON notification_templates(company_id);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
```

#### notifications（通知履歴）
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    staff_id UUID REFERENCES staff(id),
    template_id UUID REFERENCES notification_templates(id),
    type VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    recipient VARCHAR(255) NOT NULL, -- email, phone number, line id
    subject VARCHAR(200),
    body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

### 2.11 監査ログ

#### audit_logs（監査ログ）
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID,
    staff_id UUID,
    action VARCHAR(20) NOT NULL, -- create, update, delete
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- パーティショニング（月次）
-- 本番環境では以下のようにパーティショニングを設定
-- CREATE TABLE audit_logs (...) PARTITION BY RANGE (created_at);
```

### 2.12 サブスクリプション

#### subscription_plans（定額プラン）
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- 月額
    billing_interval VARCHAR(10) DEFAULT 'month', -- month, year
    usage_limit INTEGER, -- 月間使用回数上限（NULLで無制限）
    applicable_menu_tag_ids UUID[],
    applicable_menu_ids UUID[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_company_id ON subscription_plans(company_id);
```

#### customer_subscriptions（顧客サブスクリプション）
```sql
CREATE TABLE customer_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active', -- active, paused, cancelled, expired
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0, -- 今期の使用回数
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_subscriptions_customer_id ON customer_subscriptions(customer_id);
CREATE INDEX idx_customer_subscriptions_status ON customer_subscriptions(status);
```

---

## 3. RLS (Row Level Security) ポリシー

### 3.1 基本ポリシー

```sql
-- 全テーブルでRLSを有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ... 他のテーブルも同様

-- 会社単位の分離ポリシー（例: customers）
CREATE POLICY "company_isolation" ON customers
    FOR ALL
    USING (
        company_id = (
            SELECT company_id FROM staff
            WHERE user_id = auth.uid()
        )
    );

-- スタッフ自身のデータアクセス
CREATE POLICY "staff_own_data" ON staff
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "staff_same_company" ON staff
    FOR SELECT
    USING (
        company_id = (
            SELECT company_id FROM staff
            WHERE user_id = auth.uid()
        )
    );
```

### 3.2 ロールベースポリシー

```sql
-- 管理者のみ変更可能（例: menus）
CREATE POLICY "admin_write_menus" ON menus
    FOR ALL
    USING (
        company_id = (SELECT company_id FROM staff WHERE user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
    );

-- 売上データは作成のみ（更新不可）
CREATE POLICY "sales_insert_only" ON sales
    FOR INSERT
    WITH CHECK (
        company_id = (SELECT company_id FROM staff WHERE user_id = auth.uid())
    );

CREATE POLICY "sales_select" ON sales
    FOR SELECT
    USING (
        company_id = (SELECT company_id FROM staff WHERE user_id = auth.uid())
    );
```

---

## 4. トリガー・関数

### 4.1 更新日時自動更新

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに適用
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ... 他のテーブルも同様
```

### 4.2 顧客統計更新

```sql
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers
    SET
        total_visits = (
            SELECT COUNT(*) FROM visits
            WHERE customer_id = NEW.customer_id
            AND status = 'completed'
        ),
        total_spent = (
            SELECT COALESCE(SUM(total), 0) FROM sales
            WHERE customer_id = NEW.customer_id
            AND status = 'completed'
        ),
        last_visit_at = (
            SELECT MAX(check_in_at) FROM visits
            WHERE customer_id = NEW.customer_id
        ),
        updated_at = NOW()
    WHERE id = NEW.customer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_on_sale
    AFTER INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_stats();
```

### 4.3 ポイント残高更新

```sql
CREATE OR REPLACE FUNCTION update_customer_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers
    SET points = NEW.balance_after,
        updated_at = NOW()
    WHERE id = NEW.customer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_points_on_transaction
    AFTER INSERT ON point_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_points();
```

### 4.4 タグ使用数更新

```sql
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tag_usage
    AFTER INSERT OR DELETE ON tag_items
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_usage_count();
```

### 4.5 監査ログ自動記録

```sql
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_staff_id UUID;
BEGIN
    -- スタッフ情報取得
    SELECT id, company_id INTO v_staff_id, v_company_id
    FROM staff WHERE user_id = auth.uid();

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (company_id, staff_id, action, entity_type, entity_id, new_values)
        VALUES (v_company_id, v_staff_id, 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (company_id, staff_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (v_company_id, v_staff_id, 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (company_id, staff_id, action, entity_type, entity_id, old_values)
        VALUES (v_company_id, v_staff_id, 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 重要テーブルに適用
CREATE TRIGGER audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
```

---

## 5. インデックス戦略

### 5.1 複合インデックス

```sql
-- 予約検索の高速化
CREATE INDEX idx_reservations_store_date ON reservations(store_id, start_time);
CREATE INDEX idx_reservations_staff_date ON reservations(staff_id, start_time);

-- 売上分析の高速化
CREATE INDEX idx_sales_store_date ON sales(store_id, created_at);
CREATE INDEX idx_sales_staff_date ON sales(primary_staff_id, created_at);

-- 顧客検索の高速化
CREATE INDEX idx_customers_search ON customers(company_id, last_name_kana, first_name_kana);
```

### 5.2 部分インデックス

```sql
-- アクティブな予約のみ
CREATE INDEX idx_reservations_active ON reservations(start_time)
    WHERE status NOT IN ('cancelled', 'completed', 'no_show');

-- アクティブな回数券のみ
CREATE INDEX idx_tickets_active ON tickets(customer_id)
    WHERE status = 'active';
```

### 5.3 GINインデックス

```sql
-- タグ検索
CREATE INDEX idx_tags_applicable_to_gin ON tags USING GIN(applicable_to);

-- JSONB検索
CREATE INDEX idx_customer_kartes_allergies ON customer_kartes USING GIN(allergies);
```

---

## 6. マイグレーション順序

```
001_create_companies.sql
002_create_stores.sql
003_create_staff.sql
004_create_staff_stores.sql
005_create_customers.sql
006_create_customer_kartes.sql
007_create_customer_photos.sql
008_create_menu_categories.sql
009_create_menus.sql
010_create_processes.sql
011_create_menu_processes.sql
012_create_products.sql
013_create_materials.sql
014_create_tags.sql
015_create_tag_items.sql
016_create_reservations.sql
017_create_reservation_menus.sql
018_create_visits.sql
019_create_sales.sql
020_create_sale_items.sql
021_create_sale_item_staff_assignments.sql
022_create_sale_item_process_assignments.sql
023_create_sale_payments.sql
024_create_sale_discounts.sql
025_create_refunds.sql
026_create_refund_items.sql
027_create_accounts_receivable.sql
028_create_ticket_types.sql
029_create_tickets.sql
030_create_ticket_usages.sql
031_create_coupons.sql
032_create_coupon_usages.sql
033_create_point_transactions.sql
034_create_color_recipes.sql
035_create_perm_recipes.sql
036_create_shifts.sql
037_create_attendances.sql
038_create_conversation_recordings.sql
039_create_conversation_transcripts.sql
040_create_conversation_analyses.sql
041_create_ai_suggestions.sql
042_create_hairstyle_simulations.sql
043_create_notification_templates.sql
044_create_notifications.sql
045_create_subscription_plans.sql
046_create_customer_subscriptions.sql
047_create_audit_logs.sql
048_create_rls_policies.sql
049_create_triggers.sql
050_create_indexes.sql
```

---

**以上**
