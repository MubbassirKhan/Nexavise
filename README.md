# Nexavise Sentinel

Nexavise Sentinel is a cybersecurity dashboard for managing an organization’s attack surface, authorized assets, security scans, normalized findings, risk scores, attack paths, and vulnerability reports.

This repository contains:

- `frontend/`: React, TypeScript, Vite, Tailwind CSS dashboard
- `backend/`: FastAPI REST API with demo data, scan workers, risk calculation, and reporting
- `backend/supabase_schema.sql`: PostgreSQL schema for Supabase

## Features

- Admin and Analyst login roles
- Project and asset management
- Explicit asset authorization before discovery or scanning
- Safe mock discovery results
- Nmap and Nuclei scan workflows using background tasks
- Finding normalization, deduplication, assignment, and status history
- Risk overview and top-risk calculations
- Attack path graph generation
- Executive and technical report generation
- Audit logging for security-sensitive actions
- Swagger API documentation

## Requirements

- Python 3.11 or newer
- Node.js 18 or newer
- npm
- Optional: Supabase project

## Quick Start

Open two PowerShell terminals from the repository root.

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend URLs:

- API: <http://127.0.0.1:8000>
- Swagger: <http://127.0.0.1:8000/docs>
- Health: <http://127.0.0.1:8000/api/health>

### 2. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173/login>.

## Demo Login

Admin:

```text
Email: alex@nexavise.io
Password: demo
```

Analyst:

```text
Email: priya@nexavise.io
Password: demo
```

The frontend sends the logged-in user ID as the `X-User-Id` header to protected backend endpoints. Logout calls `POST /api/auth/logout`, clears the browser session, and records an audit event.

## Environment Configuration

Backend environment variables belong in `backend/.env`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-server-only-key
CORS_ORIGINS=http://localhost:5173
DEMO_MODE=true
```

Frontend can optionally use a custom API URL in `frontend/.env`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

Never commit real credentials. Never expose a server-only Supabase key in frontend code. If a key has been exposed, rotate it in the Supabase dashboard.

## Supabase Database Setup

1. Create a project at <https://supabase.com/dashboard>.
2. Copy the Project URL and a server-only API key from **Project Settings -> API**.
3. Put them in `backend/.env`.
4. Open **SQL Editor** in Supabase.
5. Paste and run [backend/supabase_schema.sql](backend/supabase_schema.sql).
6. Restart FastAPI.
7. Check `/api/health`. A valid initialized client reports `mode: "supabase"`.

The SQL file creates the requested tables, relationships, constraints, indexes, roles, and demo organization.

### Current persistence status

The MVP currently uses an in-memory `DemoStore` for API reads and writes. Supabase client initialization and the PostgreSQL schema are included, but the routers have not yet been migrated to Supabase queries. Data in the current demo store is reset when the backend restarts. Do not use this mode for real customer data until repository operations are migrated and tested against Supabase.

## End-to-End Workflow

The intended workflow is:

```text
authorized asset
        -> discovery
        -> background scan
        -> normalized findings
        -> risk score
        -> attack path
        -> executive/technical report
```

Only assets with `authorized: true` can be discovered or scanned. Real Nmap and Nuclei execution is intentionally disabled in the MVP; safe mock results are generated in a background task instead.

## Main API Groups

All API routes are documented automatically at `/docs`.

- Authentication: `/api/auth/login`, `/api/auth/logout`
- Projects: `/api/projects`
- Assets: `/api/assets`
- Discovery: `/api/discovery`
- Scans: `/api/scans`
- Findings: `/api/findings`
- Risk: `/api/risk/overview`, `/api/risk/top`
- Attack paths: `/api/attack-paths`
- Reports: `/api/reports`
- Administration: `/api/users`, `/api/audit-logs`

Example authenticated request:

```powershell
$headers = @{ "X-User-Id" = "u1" }
Invoke-RestMethod http://127.0.0.1:8000/api/projects -Headers $headers
```

## Useful Commands

Frontend production build:

```powershell
cd frontend
npm run build
```

Backend syntax check:

```powershell
cd backend
python -m compileall -q .
```

## Project Structure

```text
Nexavise/
├── README.md
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── deps.py
│   ├── schemas.py
│   ├── supabase_schema.sql
│   ├── routers/
│   ├── services/
│   └── README.md
└── frontend/
    ├── package.json
    └── src/
        ├── components/
        ├── data/
        ├── lib/api.ts
        ├── pages/
        └── types/
```

## Security Notes

This project is an internship/demo MVP. It does not implement production-grade password hashing, JWT validation, refresh tokens, rate limiting, or full organization-level authorization. The scanner layer performs safe mock checks only and does not implement exploitation, persistence, credential theft, or destructive actions.

Before production use, add Supabase Auth or secure password hashing, signed token validation, row-level security policies, persistent repository methods, job queue management, secret rotation procedures, and comprehensive tests.
