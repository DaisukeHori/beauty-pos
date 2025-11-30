-- Staff table
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    employee_code VARCHAR(20),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    first_name_kana VARCHAR(50),
    last_name_kana VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'stylist',
    rank VARCHAR(20),
    nomination_fee INTEGER DEFAULT 0,
    commission_rate DECIMAL(5,2),
    license_number VARCHAR(50),
    license_expiry DATE,
    hire_date DATE,
    birth_date DATE,
    bio TEXT,
    specialties TEXT[],
    sns_links JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_staff_company_id ON staff(company_id);
CREATE INDEX idx_staff_user_id ON staff(user_id);

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Staff-Stores junction table
CREATE TABLE staff_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, store_id)
);

CREATE INDEX idx_staff_stores_staff_id ON staff_stores(staff_id);
CREATE INDEX idx_staff_stores_store_id ON staff_stores(store_id);

ALTER TABLE staff_stores ENABLE ROW LEVEL SECURITY;
