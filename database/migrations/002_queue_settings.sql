-- Migration 002: Manual Queue Design / Optional Configuration
-- Adds queue_settings, queue_custom_fields, and enhances existing tables

-- ============================================================
-- QUEUE SETTINGS (one row per queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS queue_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL UNIQUE REFERENCES queues(id) ON DELETE CASCADE,
    eligibility_enabled BOOLEAN DEFAULT FALSE,
    documents_required BOOLEAN DEFAULT FALSE,
    entry_limit_enabled BOOLEAN DEFAULT FALSE,
    entry_limit INT DEFAULT 100,
    schedule_enabled BOOLEAN DEFAULT FALSE,
    opens_at TIMESTAMP WITH TIME ZONE,
    closes_at TIMESTAMP WITH TIME ZONE,
    custom_fields_enabled BOOLEAN DEFAULT FALSE,
    skip_max_distance INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_queue_settings_queue_id ON queue_settings(queue_id);

-- ============================================================
-- QUEUE CUSTOM FIELDS
-- ============================================================
CREATE TABLE IF NOT EXISTS queue_custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'dropdown', 'date', 'checkbox')),
    field_options JSONB,
    required BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_queue_custom_fields_queue_id ON queue_custom_fields(queue_id);

-- ============================================================
-- ENHANCE DOCUMENT_REQUIREMENTS
-- ============================================================
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS template_path TEXT;
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS template_file_name VARCHAR(255);
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS accepted_types VARCHAR(255) DEFAULT 'JPG,PNG,PDF';
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS max_file_size INT DEFAULT 5242880;
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS verification_mode VARCHAR(20) DEFAULT 'upload_only' CHECK (verification_mode IN ('upload_only', 'admin_review', 'auto_match'));
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS match_fields JSONB;
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- ============================================================
-- ELIGIBILITY FILES - add queue_type_id for per-sub-queue eligibility
-- ============================================================
ALTER TABLE eligibility_files ADD COLUMN IF NOT EXISTS queue_type_id UUID REFERENCES queue_types(id) ON DELETE CASCADE;

-- ============================================================
-- DOCUMENT REQUIREMENTS - add queue_type_id for per-sub-queue docs
-- ============================================================
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS queue_type_id UUID REFERENCES queue_types(id) ON DELETE CASCADE;

-- ============================================================
-- QUEUE MEMBERS - add custom_data for custom field values
-- ============================================================
ALTER TABLE queue_members ADD COLUMN IF NOT EXISTS custom_data JSONB;

-- ============================================================
-- QUEUE MEMBERS - add eligibility_checked flag
-- ============================================================
ALTER TABLE queue_members ADD COLUMN IF NOT EXISTS eligibility_checked BOOLEAN DEFAULT FALSE;
ALTER TABLE queue_members ADD COLUMN IF NOT EXISTS documents_verified BOOLEAN DEFAULT FALSE;

-- ============================================================
-- HELPER: updated_at trigger for new tables
-- ============================================================
CREATE TRIGGER update_queue_settings_updated_at BEFORE UPDATE ON queue_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
