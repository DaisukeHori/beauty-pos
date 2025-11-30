-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_code VARCHAR(20),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    first_name_kana VARCHAR(50),
    last_name_kana VARCHAR(50),
    gender VARCHAR(10),
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(255),
    postal_code VARCHAR(8),
    prefecture VARCHAR(10),
    city VARCHAR(50),
    street TEXT,
    building VARCHAR(100),
    referral_source VARCHAR(50),
    referral_customer_id UUID REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'active',
    rank VARCHAR(20),
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_spent DECIMAL(10,2) DEFAULT 0,
    points INTEGER DEFAULT 0,
    last_visit_at TIMESTAMP WITH TIME ZONE,
    next_visit_estimate DATE,
    visit_interval_days INTEGER,
    notes TEXT,
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

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customer Kartes table
CREATE TABLE customer_kartes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
    hair_thickness VARCHAR(20),
    hair_hardness VARCHAR(20),
    hair_volume VARCHAR(20),
    hair_curl_type VARCHAR(20),
    hair_curl_level INTEGER,
    hair_damage_level INTEGER,
    hair_damage_notes TEXT,
    gray_hair_percentage INTEGER,
    gray_hair_distribution TEXT,
    gray_hair_growth_rate DECIMAL(3,1),
    recommended_visit_interval INTEGER,
    scalp_type VARCHAR(20),
    scalp_sensitivity BOOLEAN DEFAULT FALSE,
    scalp_notes TEXT,
    allergies JSONB DEFAULT '[]',
    patch_test_required BOOLEAN DEFAULT FALSE,
    last_patch_test_date DATE,
    last_patch_test_result VARCHAR(20),
    is_pregnant BOOLEAN DEFAULT FALSE,
    health_notes TEXT,
    wheelchair_required BOOLEAN DEFAULT FALSE,
    occupation VARCHAR(50),
    lifestyle_notes TEXT,
    preferred_styles JSONB DEFAULT '[]',
    ng_styles JSONB DEFAULT '[]',
    conversation_topics TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_kartes_customer_id ON customer_kartes(customer_id);

CREATE TRIGGER update_customer_kartes_updated_at
    BEFORE UPDATE ON customer_kartes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE customer_kartes ENABLE ROW LEVEL SECURITY;
