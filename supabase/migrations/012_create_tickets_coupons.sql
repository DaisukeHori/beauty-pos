-- Ticket Types table
CREATE TABLE ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    valid_days INTEGER,
    applicable_menu_tag_ids UUID[],
    applicable_menu_ids UUID[],
    is_gift BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ticket_types_company_id ON ticket_types(company_id);

CREATE TRIGGER update_ticket_types_updated_at
    BEFORE UPDATE ON ticket_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    remaining_count INTEGER NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    sale_id UUID REFERENCES sales(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_code ON tickets(code);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Ticket Usages table
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

ALTER TABLE ticket_usages ENABLE ROW LEVEL SECURITY;

-- Coupons table
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    type VARCHAR(20) NOT NULL,
    value INTEGER NOT NULL,
    max_discount INTEGER,
    min_purchase INTEGER,
    applicable_menu_tag_ids UUID[],
    applicable_menu_ids UUID[],
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    per_customer_limit INTEGER,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_company_id ON coupons(company_id);
CREATE INDEX idx_coupons_code ON coupons(code);

CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Coupon Usages table
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

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- Add foreign key to sale_discounts for coupon_id
ALTER TABLE sale_discounts ADD CONSTRAINT fk_sale_discounts_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id);

-- Point Transactions table
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    sale_id UUID REFERENCES sales(id),
    type VARCHAR(20) NOT NULL,
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_point_transactions_customer_id ON point_transactions(customer_id);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Update customer points trigger
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
