-- Sales table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    visit_id UUID REFERENCES visits(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    primary_staff_id UUID NOT NULL REFERENCES staff(id),
    nomination_type VARCHAR(10) NOT NULL,
    nomination_fee INTEGER DEFAULT 0,
    receipt_number VARCHAR(20) NOT NULL,
    invoice_number VARCHAR(20),
    subtotal INTEGER NOT NULL,
    discount_total INTEGER DEFAULT 0,
    tax_total INTEGER NOT NULL,
    total INTEGER NOT NULL,
    points_used INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
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
CREATE INDEX idx_sales_store_date ON sales(store_id, created_at);
CREATE INDEX idx_sales_staff_date ON sales(primary_staff_id, created_at);

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Sale Items table
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL,
    item_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price INTEGER NOT NULL,
    hair_length VARCHAR(10),
    hair_length_charge INTEGER DEFAULT 0,
    subtotal INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    tax_rate DECIMAL(4,2) NOT NULL,
    tax_amount INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Sale Item Staff Assignments table
CREATE TABLE sale_item_staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id),
    role VARCHAR(20) NOT NULL,
    sales_amount INTEGER DEFAULT 0,
    productivity_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_item_staff_assignments_sale_item_id ON sale_item_staff_assignments(sale_item_id);
CREATE INDEX idx_sale_item_staff_assignments_staff_id ON sale_item_staff_assignments(staff_id);

ALTER TABLE sale_item_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Sale Item Process Assignments table
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

ALTER TABLE sale_item_process_assignments ENABLE ROW LEVEL SECURITY;

-- Sale Payments table
CREATE TABLE sale_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL,
    amount INTEGER NOT NULL,
    card_brand VARCHAR(20),
    terminal_transaction_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_payments_sale_id ON sale_payments(sale_id);

ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;

-- Sale Discounts table (forward reference to coupons)
CREATE TABLE sale_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES sale_items(id),
    type VARCHAR(20) NOT NULL,
    value INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    coupon_id UUID,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sale_discounts_sale_id ON sale_discounts(sale_id);

ALTER TABLE sale_discounts ENABLE ROW LEVEL SECURITY;
