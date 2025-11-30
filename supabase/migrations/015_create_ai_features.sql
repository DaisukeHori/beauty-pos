-- Conversation Recordings table
CREATE TABLE conversation_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES visits(id),
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_recordings_visit_id ON conversation_recordings(visit_id);

CREATE TRIGGER update_conversation_recordings_updated_at
    BEFORE UPDATE ON conversation_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE conversation_recordings ENABLE ROW LEVEL SECURITY;

-- Conversation Transcripts table
CREATE TABLE conversation_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES conversation_recordings(id) ON DELETE CASCADE,
    full_text TEXT NOT NULL,
    segments JSONB,
    language VARCHAR(10) DEFAULT 'ja',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_transcripts_recording_id ON conversation_transcripts(recording_id);

ALTER TABLE conversation_transcripts ENABLE ROW LEVEL SECURITY;

-- Conversation Analyses table
CREATE TABLE conversation_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES conversation_recordings(id) ON DELETE CASCADE,
    summary TEXT,
    topics TEXT[],
    sentiment VARCHAR(20),
    sentiment_score DECIMAL(3,2),
    upsell_opportunities JSONB,
    crosssell_opportunities JSONB,
    key_insights TEXT[],
    next_visit_suggestions TEXT[],
    conversation_quality_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversation_analyses_recording_id ON conversation_analyses(recording_id);

ALTER TABLE conversation_analyses ENABLE ROW LEVEL SECURITY;

-- AI Suggestions table
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES visits(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    type VARCHAR(30) NOT NULL,
    suggestion TEXT NOT NULL,
    confidence DECIMAL(3,2),
    context JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    shown_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_suggestions_visit_id ON ai_suggestions(visit_id);
CREATE INDEX idx_ai_suggestions_customer_id ON ai_suggestions(customer_id);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Hairstyle Simulations table
CREATE TABLE hairstyle_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_photo_url TEXT NOT NULL,
    style_image_url TEXT NOT NULL,
    style_source VARCHAR(30),
    generated_image_url TEXT,
    thumbnail_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    customer_approved BOOLEAN,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hairstyle_simulations_customer_id ON hairstyle_simulations(customer_id);

ALTER TABLE hairstyle_simulations ENABLE ROW LEVEL SECURITY;
