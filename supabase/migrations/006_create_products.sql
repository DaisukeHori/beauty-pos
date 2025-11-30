-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(30),
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    description TEXT,
    price INTEGER NOT NULL,
    cost INTEGER,
    tax_rate DECIMAL(4,2) DEFAULT 10,
    stock_quantity INTEGER DEFAULT 0,
    reorder_point INTEGER,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_code ON products(code);

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Materials table
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(30),
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    category VARCHAR(30),
    unit VARCHAR(10),
    cost_per_unit DECIMAL(10,2),
    stock_quantity DECIMAL(10,2) DEFAULT 0,
    reorder_point DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_materials_company_id ON materials(company_id);

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
