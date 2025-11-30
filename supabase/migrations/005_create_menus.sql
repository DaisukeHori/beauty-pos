-- Menu Categories table
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

CREATE TRIGGER update_menu_categories_updated_at
    BEFORE UPDATE ON menu_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Menus table
CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(id),
    code VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price INTEGER NOT NULL,
    price_short INTEGER,
    price_medium INTEGER,
    price_long INTEGER,
    long_charge INTEGER DEFAULT 0,
    duration_minutes INTEGER NOT NULL,
    productivity_rate_primary DECIMAL(5,2) DEFAULT 100,
    productivity_rate_worker1 DECIMAL(5,2) DEFAULT 0,
    productivity_rate_worker2 DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(4,2) DEFAULT 10,
    is_set_menu BOOLEAN DEFAULT FALSE,
    set_menu_items JSONB,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menus_company_id ON menus(company_id);
CREATE INDEX idx_menus_category_id ON menus(category_id);

CREATE TRIGGER update_menus_updated_at
    BEFORE UPDATE ON menus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Processes table
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

CREATE TRIGGER update_processes_updated_at
    BEFORE UPDATE ON processes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

-- Menu Processes junction table
CREATE TABLE menu_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    productivity_amount INTEGER NOT NULL,
    default_worker1_rate DECIMAL(5,2) DEFAULT 100,
    default_worker2_rate DECIMAL(5,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_id, process_id)
);

CREATE INDEX idx_menu_processes_menu_id ON menu_processes(menu_id);

ALTER TABLE menu_processes ENABLE ROW LEVEL SECURITY;
