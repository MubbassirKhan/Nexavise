-- Nexavise Sentinel MVP schema for Supabase PostgreSQL.
-- Run this entire file in Supabase Dashboard -> SQL Editor.
-- IDs are text because the demo API currently uses values such as proj-1 and asset-abc123.

create table if not exists roles (
    id text primary key,
    name text unique not null check (name in ('admin', 'analyst')),
    created_at timestamptz not null default now()
);

create table if not exists organizations (
    id text primary key,
    name text not null,
    created_at timestamptz not null default now()
);

create table if not exists users (
    id text primary key,
    organization_id text references organizations(id) on delete set null,
    role_id text references roles(id) on delete restrict,
    name text not null,
    email text unique not null,
    password_hash text,
    created_at timestamptz not null default now()
);

create table if not exists projects (
    id text primary key,
    organization_id text references organizations(id) on delete cascade,
    name text not null,
    description text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists assets (
    id text primary key,
    project_id text not null references projects(id) on delete cascade,
    domain text,
    ip inet,
    url text,
    hostname text not null,
    type text not null,
    status text not null default 'unknown' check (status in ('active', 'inactive', 'unknown')),
    exposure text not null default 'internal' check (exposure in ('internet', 'internal', 'dmz')),
    criticality smallint not null default 3 check (criticality between 1 and 5),
    authorized boolean not null default false,
    last_seen timestamptz,
    tags jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists technologies (
    id text primary key,
    name text unique not null
);

create table if not exists asset_services (
    id text primary key,
    asset_id text not null references assets(id) on delete cascade,
    port integer not null check (port between 1 and 65535),
    protocol text not null default 'tcp' check (protocol in ('tcp', 'udp')),
    service text not null,
    state text not null default 'open' check (state in ('open', 'closed', 'filtered')),
    version text
);

create table if not exists scans (
    id text primary key,
    project_id text not null references projects(id) on delete cascade,
    asset_id text not null references assets(id) on delete cascade,
    scanner text not null check (scanner in ('nmap', 'nuclei')),
    status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress smallint not null default 0 check (progress between 0 and 100),
    options jsonb not null default '{}'::jsonb,
    authorized boolean not null,
    started_at timestamptz,
    completed_at timestamptz,
    findings_count integer not null default 0,
    new_findings integer not null default 0,
    created_by text references users(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists scan_jobs (
    id text primary key,
    scan_id text not null references scans(id) on delete cascade,
    status text not null default 'queued',
    worker_name text,
    error_message text,
    created_at timestamptz not null default now(),
    finished_at timestamptz
);

create table if not exists scan_results (
    id text primary key,
    scan_id text not null references scans(id) on delete cascade,
    asset_id text not null references assets(id) on delete cascade,
    result_type text not null,
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists vulnerabilities (
    id text primary key,
    title text not null,
    description text not null default '',
    severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
    cve text,
    remediation text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists findings (
    id text primary key,
    project_id text not null references projects(id) on delete cascade,
    asset_id text not null references assets(id) on delete cascade,
    scan_id text references scans(id) on delete set null,
    vulnerability_id text references vulnerabilities(id) on delete set null,
    title text not null,
    description text not null default '',
    severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
    status text not null default 'open' check (status in ('open', 'confirmed', 'false_positive', 'accepted_risk', 'in_progress', 'resolved')),
    risk_score smallint not null default 0 check (risk_score between 0 and 100),
    risk_breakdown jsonb not null default '{}'::jsonb,
    scanner text not null check (scanner in ('nmap', 'nuclei')),
    evidence text not null default '',
    technical_details text not null default '',
    why_risky text not null default '',
    remediation text not null default '',
    affected_service text,
    affected_port integer,
    assigned_to text references users(id) on delete set null,
    discovered_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    dedup_key text generated always as (asset_id || ':' || lower(title)) stored,
    unique (dedup_key)
);

create table if not exists finding_evidence (
    id text primary key,
    finding_id text not null references findings(id) on delete cascade,
    evidence text not null,
    created_at timestamptz not null default now()
);

create table if not exists finding_status_history (
    id text primary key,
    finding_id text not null references findings(id) on delete cascade,
    status text not null,
    changed_by text references users(id) on delete set null,
    note text,
    changed_at timestamptz not null default now()
);

create table if not exists risk_scores (
    id text primary key,
    project_id text not null references projects(id) on delete cascade,
    asset_id text references assets(id) on delete cascade,
    finding_id text references findings(id) on delete cascade,
    score smallint not null check (score between 0 and 100),
    explanation text not null,
    breakdown jsonb not null default '{}'::jsonb,
    calculated_at timestamptz not null default now()
);

create table if not exists attack_paths (
    id text primary key,
    project_id text not null references projects(id) on delete cascade,
    name text not null,
    description text not null default '',
    risk_score smallint not null check (risk_score between 0 and 100),
    severity text not null,
    entry_point text not null,
    target text not null,
    hops integer not null default 0,
    why_risky text not null default '',
    mitigations jsonb not null default '[]'::jsonb,
    discovered_at timestamptz not null default now()
);

create table if not exists attack_path_nodes (
    id text primary key,
    attack_path_id text not null references attack_paths(id) on delete cascade,
    node_type text not null,
    label text not null,
    risk_score smallint,
    severity text,
    x integer not null default 0,
    y integer not null default 0
);

create table if not exists attack_path_edges (
    id text primary key,
    attack_path_id text not null references attack_paths(id) on delete cascade,
    source_node_id text not null references attack_path_nodes(id) on delete cascade,
    target_node_id text not null references attack_path_nodes(id) on delete cascade,
    label text
);

create table if not exists audit_logs (
    id text primary key,
    user_id text references users(id) on delete set null,
    action text not null,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists reports (
    id text primary key,
    project_id text not null references projects(id) on delete cascade,
    report_type text not null check (report_type in ('executive', 'technical', 'combined')),
    content jsonb not null default '{}'::jsonb,
    generated_by text references users(id) on delete set null,
    generated_at timestamptz not null default now()
);

create index if not exists assets_project_id_idx on assets(project_id);
create index if not exists assets_authorized_idx on assets(project_id, authorized);
create index if not exists scans_project_id_idx on scans(project_id);
create index if not exists findings_project_status_idx on findings(project_id, status);
create index if not exists findings_asset_id_idx on findings(asset_id);
create index if not exists audit_logs_created_at_idx on audit_logs(created_at desc);

insert into roles (id, name) values ('role-admin', 'admin'), ('role-analyst', 'analyst') on conflict (name) do nothing;
insert into organizations (id, name) values ('org-1', 'Nexavise Demo Organization') on conflict (id) do nothing;
