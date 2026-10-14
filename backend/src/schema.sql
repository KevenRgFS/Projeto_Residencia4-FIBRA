CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    hubspot_id TEXT UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone VARCHAR(20),
    job_title VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'gestor', 'analista', 'empresa')),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
    last_access_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    hubspot_id TEXT UNIQUE,
    name VARCHAR(160) NOT NULL,
    legal_name VARCHAR(200),
    cnpj VARCHAR(14) UNIQUE,
    cnae VARCHAR(20),
    cnae_description VARCHAR(160),
    phone VARCHAR(20),
    email VARCHAR(254),
    responsible VARCHAR(120),
    sector VARCHAR(100),
    size VARCHAR(30) CHECK (size IS NULL OR size IN ('mei', 'micro', 'pequena', 'media', 'grande')),
    organization_type VARCHAR(30) CHECK (organization_type IS NULL OR organization_type IN ('empresa', 'startup', 'governo', 'academia', 'servicos')),
    union_name VARCHAR(120),
    employee_count INTEGER CHECK (employee_count IS NULL OR employee_count >= 0),
    registration_status VARCHAR(30),
    potential VARCHAR(20) NOT NULL DEFAULT 'medio' CHECK (potential IN ('baixo', 'medio', 'alto')),
    source VARCHAR(30) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS company_addresses (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    postal_code VARCHAR(8),
    street VARCHAR(160),
    number VARCHAR(20),
    complement VARCHAR(120),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state CHAR(2),
    region VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_contacts (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    cpf VARCHAR(11),
    job_title VARCHAR(100),
    email VARCHAR(254),
    phone VARCHAR(20),
    gender VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, email)
);

CREATE TABLE IF NOT EXISTS actions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('capacitacao', 'consultoria', 'evento', 'missao', 'workshop', 'meetup', 'programa_aceleracao', 'outro')),
    start_date DATE NOT NULL,
    end_date DATE,
    target_audience VARCHAR(160),
    description TEXT,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS participations (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES company_contacts(id) ON DELETE SET NULL,
    action_id BIGINT NOT NULL REFERENCES actions(id) ON DELETE RESTRICT,
    participation_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'inscrito' CHECK (status IN ('inscrito', 'presente', 'concluiu', 'cancelou')),
    hours_dedicated NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (hours_dedicated >= 0),
    satisfaction SMALLINT CHECK (satisfaction BETWEEN 1 AND 5),
    perceived_impact SMALLINT CHECK (perceived_impact BETWEEN 1 AND 5),
    recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_interactions (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id BIGINT REFERENCES company_contacts(id) ON DELETE SET NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'telefone', 'reuniao', 'whatsapp', 'outro')),
    type VARCHAR(30) NOT NULL CHECK (type IN ('prospeccao', 'suporte', 'follow_up', 'outro')),
    result VARCHAR(300),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS engagement_scores (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    score NUMERIC(4,2) NOT NULL CHECK (score BETWEEN 0 AND 10),
    risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('baixo', 'medio', 'alto')),
    suggested_action TEXT,
    is_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason TEXT,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_runs (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    records_processed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS data_quality_issues (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(30) NOT NULL,
    source_record_id TEXT,
    issue TEXT NOT NULL,
    payload JSONB,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    resource VARCHAR(80) NOT NULL,
    resource_id TEXT,
    ip_address INET,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_merges (
    id BIGSERIAL PRIMARY KEY,
    kept_company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    merged_company_id BIGINT NOT NULL,
    merged_company_snapshot JSONB NOT NULL,
    merged_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (kept_company_id <> merged_company_id)
);

CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_size ON companies(size);
CREATE INDEX IF NOT EXISTS idx_participations_company_date ON participations(company_id, participation_date DESC);
CREATE INDEX IF NOT EXISTS idx_participations_action_date ON participations(action_id, participation_date);
CREATE INDEX IF NOT EXISTS idx_interactions_company_date ON crm_interactions(company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_company_date ON engagement_scores(company_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);