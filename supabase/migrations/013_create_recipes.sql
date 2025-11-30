-- Color Recipes table
CREATE TABLE color_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    staff_id UUID REFERENCES staff(id),
    area VARCHAR(20) NOT NULL,
    brand VARCHAR(50),
    color_name VARCHAR(50),
    color_number VARCHAR(20),
    amount_g DECIMAL(5,1),
    developer_percent DECIMAL(4,1),
    developer_amount_g DECIMAL(5,1),
    additives JSONB,
    processing_time INTEGER,
    heat_applied BOOLEAN DEFAULT FALSE,
    result_notes TEXT,
    result_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_color_recipes_customer_id ON color_recipes(customer_id);
CREATE INDEX idx_color_recipes_visit_id ON color_recipes(visit_id);

ALTER TABLE color_recipes ENABLE ROW LEVEL SECURITY;

-- Perm Recipes table
CREATE TABLE perm_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    staff_id UUID REFERENCES staff(id),
    perm_type VARCHAR(30),
    rod_sizes JSONB,
    winding_pattern TEXT,
    solution1_brand VARCHAR(50),
    solution1_type VARCHAR(30),
    solution1_time INTEGER,
    solution2_brand VARCHAR(50),
    solution2_type VARCHAR(30),
    solution2_time INTEGER,
    heat_temp INTEGER,
    heat_time INTEGER,
    result_notes TEXT,
    result_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_perm_recipes_customer_id ON perm_recipes(customer_id);
CREATE INDEX idx_perm_recipes_visit_id ON perm_recipes(visit_id);

ALTER TABLE perm_recipes ENABLE ROW LEVEL SECURITY;
