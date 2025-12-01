-- Hair Style Categories table
CREATE TABLE hair_style_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hair_style_categories_company_id ON hair_style_categories(company_id);

CREATE TRIGGER update_hair_style_categories_updated_at
    BEFORE UPDATE ON hair_style_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE hair_style_categories ENABLE ROW LEVEL SECURITY;

-- Hair Styles (Catalog) table
CREATE TABLE hair_styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES hair_style_categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    length VARCHAR(20), -- 'short', 'medium', 'long'
    gender VARCHAR(20) DEFAULT 'unisex', -- 'male', 'female', 'unisex'
    image_url TEXT,
    thumbnail_url TEXT,
    tags TEXT[],
    source VARCHAR(30), -- 'original', 'pinterest', 'instagram', etc.
    source_url TEXT,
    popularity_score INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hair_styles_company_id ON hair_styles(company_id);
CREATE INDEX idx_hair_styles_category_id ON hair_styles(category_id);
CREATE INDEX idx_hair_styles_length ON hair_styles(length);
CREATE INDEX idx_hair_styles_tags ON hair_styles USING GIN(tags);

CREATE TRIGGER update_hair_styles_updated_at
    BEFORE UPDATE ON hair_styles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE hair_styles ENABLE ROW LEVEL SECURITY;

-- Hair Style Favorites (customer favorites)
CREATE TABLE hair_style_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    hair_style_id UUID NOT NULL REFERENCES hair_styles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, hair_style_id)
);

CREATE INDEX idx_hair_style_favorites_customer_id ON hair_style_favorites(customer_id);

ALTER TABLE hair_style_favorites ENABLE ROW LEVEL SECURITY;

-- Style Proposals (stylist proposals to customers)
CREATE TABLE style_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    staff_id UUID NOT NULL REFERENCES staff(id),
    hair_style_id UUID REFERENCES hair_styles(id) ON DELETE SET NULL,
    style_name VARCHAR(100) NOT NULL,
    description TEXT,
    reason TEXT, -- Why the stylist recommends this style
    image_url TEXT,
    simulation_id UUID REFERENCES hairstyle_simulations(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
    customer_feedback TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_style_proposals_customer_id ON style_proposals(customer_id);
CREATE INDEX idx_style_proposals_staff_id ON style_proposals(staff_id);
CREATE INDEX idx_style_proposals_visit_id ON style_proposals(visit_id);
CREATE INDEX idx_style_proposals_status ON style_proposals(status);

CREATE TRIGGER update_style_proposals_updated_at
    BEFORE UPDATE ON style_proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE style_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hair_style_categories
CREATE POLICY "Companies can view their own hair style categories"
    ON hair_style_categories FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM staff WHERE user_id = auth.uid()
    ));

CREATE POLICY "Companies can manage their own hair style categories"
    ON hair_style_categories FOR ALL
    USING (company_id IN (
        SELECT company_id FROM staff WHERE user_id = auth.uid()
    ));

-- RLS Policies for hair_styles
CREATE POLICY "Companies can view their own hair styles"
    ON hair_styles FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM staff WHERE user_id = auth.uid()
    ));

CREATE POLICY "Companies can manage their own hair styles"
    ON hair_styles FOR ALL
    USING (company_id IN (
        SELECT company_id FROM staff WHERE user_id = auth.uid()
    ));

-- RLS Policies for style_proposals
CREATE POLICY "Staff can view proposals for their company"
    ON style_proposals FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM staff WHERE user_id = auth.uid()
    ));

CREATE POLICY "Staff can manage proposals for their company"
    ON style_proposals FOR ALL
    USING (company_id IN (
        SELECT company_id FROM staff WHERE user_id = auth.uid()
    ));
