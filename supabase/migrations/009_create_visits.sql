-- Visits table
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    reservation_id UUID REFERENCES reservations(id),
    primary_staff_id UUID NOT NULL REFERENCES staff(id),
    nomination_type VARCHAR(10) NOT NULL,
    visit_number INTEGER,
    check_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    check_out_at TIMESTAMP WITH TIME ZONE,
    wait_time_minutes INTEGER,
    service_start_at TIMESTAMP WITH TIME ZONE,
    service_end_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'checked_in',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_visits_company_id ON visits(company_id);
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_store_id ON visits(store_id);
CREATE INDEX idx_visits_check_in_at ON visits(check_in_at);

CREATE TRIGGER update_visits_updated_at
    BEFORE UPDATE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Customer Photos table
CREATE TABLE customer_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    type VARCHAR(20) NOT NULL,
    angle VARCHAR(20),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customer_photos_customer_id ON customer_photos(customer_id);
CREATE INDEX idx_customer_photos_visit_id ON customer_photos(visit_id);

ALTER TABLE customer_photos ENABLE ROW LEVEL SECURITY;
