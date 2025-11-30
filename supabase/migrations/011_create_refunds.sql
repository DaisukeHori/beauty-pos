-- Refunds table
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

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Refund Items table
CREATE TABLE refund_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES sale_items(id),
    quantity INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refund_items_refund_id ON refund_items(refund_id);

ALTER TABLE refund_items ENABLE ROW LEVEL SECURITY;

-- Accounts Receivable table
CREATE TABLE accounts_receivable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    sale_id UUID REFERENCES sales(id),
    amount INTEGER NOT NULL,
    balance INTEGER NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_receivable_customer_id ON accounts_receivable(customer_id);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);

CREATE TRIGGER update_accounts_receivable_updated_at
    BEFORE UPDATE ON accounts_receivable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;

-- Accounts Receivable Payments table
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

ALTER TABLE accounts_receivable_payments ENABLE ROW LEVEL SECURITY;
