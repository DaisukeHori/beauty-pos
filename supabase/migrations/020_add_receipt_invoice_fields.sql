-- Add receipt and invoice fields to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS invoice_registration_number VARCHAR(20);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS receipt_header TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS receipt_footer TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS receipt_note TEXT;

-- Add company-level invoice settings
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invoice_registration_number VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_office_name VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER DEFAULT 4;

-- Create receipt_settings table for detailed customization
CREATE TABLE IF NOT EXISTS receipt_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    paper_width INTEGER DEFAULT 80, -- 80mm or 58mm
    show_logo BOOLEAN DEFAULT TRUE,
    show_barcode BOOLEAN DEFAULT TRUE,
    show_qr_code BOOLEAN DEFAULT FALSE,
    logo_position VARCHAR(20) DEFAULT 'center', -- left, center, right
    font_size VARCHAR(10) DEFAULT 'medium', -- small, medium, large
    header_lines JSONB DEFAULT '[]',
    footer_lines JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id)
);

CREATE INDEX idx_receipt_settings_store_id ON receipt_settings(store_id);

CREATE TRIGGER update_receipt_settings_updated_at
    BEFORE UPDATE ON receipt_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE receipt_settings ENABLE ROW LEVEL SECURITY;

-- Add tax rate tracking to sale_items for invoice compliance
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_category VARCHAR(20) DEFAULT 'standard'; -- standard(10%), reduced(8%)

-- Create invoice_numbers for sequential invoice numbering
CREATE TABLE IF NOT EXISTS invoice_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    last_number INTEGER DEFAULT 0,
    prefix VARCHAR(20) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, fiscal_year)
);

CREATE INDEX idx_invoice_numbers_store_fiscal ON invoice_numbers(store_id, fiscal_year);

ALTER TABLE invoice_numbers ENABLE ROW LEVEL SECURITY;

-- Add invoice number to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_10_amount INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_8_amount INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_10_base INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_8_base INTEGER DEFAULT 0;

-- Create cash_drawer_logs for cash management
CREATE TABLE IF NOT EXISTS cash_drawer_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id),
    log_type VARCHAR(20) NOT NULL, -- open, close, deposit, withdraw, adjustment
    amount INTEGER NOT NULL,
    balance_before INTEGER,
    balance_after INTEGER,
    denomination JSONB DEFAULT '{}', -- 金種別内訳
    notes TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cash_drawer_logs_store_date ON cash_drawer_logs(store_id, logged_at);

ALTER TABLE cash_drawer_logs ENABLE ROW LEVEL SECURITY;

-- Create daily_reports for end-of-day summary
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    total_sales INTEGER DEFAULT 0,
    total_cash INTEGER DEFAULT 0,
    total_card INTEGER DEFAULT 0,
    total_electronic_money INTEGER DEFAULT 0,
    total_qr_payment INTEGER DEFAULT 0,
    total_credit INTEGER DEFAULT 0, -- 売掛
    total_discount INTEGER DEFAULT 0,
    total_refund INTEGER DEFAULT 0,
    total_tax_10 INTEGER DEFAULT 0,
    total_tax_8 INTEGER DEFAULT 0,
    customer_count INTEGER DEFAULT 0,
    new_customer_count INTEGER DEFAULT 0,
    average_spend INTEGER DEFAULT 0,
    cash_in_drawer INTEGER DEFAULT 0,
    cash_difference INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open', -- open, closed
    closed_by UUID REFERENCES staff(id),
    closed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, report_date)
);

CREATE INDEX idx_daily_reports_store_date ON daily_reports(store_id, report_date);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY receipt_settings_company_isolation ON receipt_settings
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE company_id = (
                SELECT company_id FROM staff WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY invoice_numbers_company_isolation ON invoice_numbers
    FOR ALL USING (
        company_id = (SELECT company_id FROM staff WHERE user_id = auth.uid())
    );

CREATE POLICY cash_drawer_logs_company_isolation ON cash_drawer_logs
    FOR ALL USING (
        company_id = (SELECT company_id FROM staff WHERE user_id = auth.uid())
    );

CREATE POLICY daily_reports_company_isolation ON daily_reports
    FOR ALL USING (
        company_id = (SELECT company_id FROM staff WHERE user_id = auth.uid())
    );
