# Nexavise Sentinel Backend

FastAPI MVP backend for the existing React dashboard. It supports the full demo workflow:

`authorized asset -> discovery -> scan -> normalized findings -> risk -> attack path -> report`

## Run locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Open Swagger at <http://127.0.0.1:8000/docs>.

The default `.env` runs in demo mode with an in-memory repository, so no database setup is required. Replace the placeholder Supabase values to initialize the Supabase client. The current routers still use the demo repository for deterministic internship data; creating the schema alone does not switch CRUD persistence to Supabase yet.

## Connect Supabase and create tables

1. Create a project at <https://supabase.com/dashboard> and wait until its database is ready.
2. Open **Project Settings -> API** and copy the **Project URL** and an API key. For this server, use a server-only key and never expose it in React or commit it to Git.
3. Copy `.env.example` to `.env` and set:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-server-only-key
CORS_ORIGINS=http://localhost:5173
DEMO_MODE=true
```

4. In Supabase, open **SQL Editor -> New query**, paste [supabase_schema.sql](supabase_schema.sql), and click **Run**. The script creates the requested tables, constraints, indexes, roles, and a demo organization.
5. Restart FastAPI and check <http://127.0.0.1:8000/api/health>. It should return `{"status":"ok","mode":"supabase"}` when the URL and key are valid.

The SQL schema is ready for persistence, but this MVP intentionally keeps API reads and writes in `DemoStore`. To make data survive restarts, the router operations must be changed from `store.assets`, `store.findings`, and similar lists to Supabase queries such as `store.supabase.table("assets").select("*").execute()`. Do that migration before using real customer data. Keep `DEMO_MODE=true` for the internship walkthrough until the repository layer is migrated and tested.

## Demo login

- Admin: `alex@nexavise.io` / `demo`
- Analyst: `priya@nexavise.io` / `demo`

Use the returned user ID as `X-User-Id` on protected requests. The demo defaults to admin `u1` when the header is omitted.

## Example workflow

```powershell
$headers = @{ "X-User-Id" = "u1" }
Invoke-RestMethod http://127.0.0.1:8000/api/assets -Headers $headers
Invoke-RestMethod "http://127.0.0.1:8000/api/discovery?assetId=a1" -Method Post -Headers $headers
$scan = Invoke-RestMethod http://127.0.0.1:8000/api/scans -Method Post -Headers $headers -ContentType "application/json" -Body '{"projectId":"proj-1","assetId":"a3","scanner":"nuclei","options":{"severity":["critical","high"]}}'
Invoke-RestMethod http://127.0.0.1:8000/api/risk/overview -Headers $headers
Invoke-RestMethod http://127.0.0.1:8000/api/attack-paths/analyze -Method Post -Headers $headers
Invoke-RestMethod http://127.0.0.1:8000/api/reports -Method Post -Headers $headers -ContentType "application/json" -Body '{"projectId":"proj-1","reportType":"combined"}'
```

Real Nmap/Nuclei execution is intentionally not enabled by default. The background task emits safe mock results and never runs exploitation or destructive actions.
