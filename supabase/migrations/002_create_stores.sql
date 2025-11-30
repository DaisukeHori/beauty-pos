-- Stores table
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_kana VARCHAR(100),
    code VARCHAR(20),
    postal_code VARCHAR(8),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    business_hours JSONB DEFAULT '{}',
    holidays JSONB DEFAULT '{}',
    seat_count INTEGER DEFAULT 1,
    reservation_interval INTEGER DEFAULT 30,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stores_company_id ON stores(company_id);

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
