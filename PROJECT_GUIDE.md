# Nexavise Sentinel Project Guide

## 1. What This Project Is

Nexavise Sentinel is a cybersecurity platform for understanding and reducing an organization's external attack surface.

It helps security teams:

- Discover internet-facing assets.
- Track domains, hosts, IP addresses, web applications, APIs, and cloud assets.
- Run authorized security scans.
- Normalize and prioritize vulnerability findings.
- Assign findings to analysts and track their status.
- Calculate project risk scores.
- Visualize possible attack paths.
- Generate executive and technical security reports.
- Manage users, integrations, settings, and audit logs.

This repository is an MVP application. Its scanner performs bounded, passive HTTP checks and never performs exploitation or destructive security testing.

## 2. How the Project Works

The application has two main parts:

```text
React frontend -> FastAPI backend -> persistent local repository or configured Supabase database
```

### End-to-end security workflow

```text
Project
  -> Authorized asset
  -> Asset discovery
  -> Background scan
  -> Normalized finding
  -> Risk calculation
  -> Attack path analysis
  -> Security report
```

Only assets marked as authorized should be discovered or scanned.

### User workflow

1. A user signs in with an email and password.
2. The backend finds the matching demo user.
3. The frontend stores the returned user and role in browser local storage.
4. The frontend sends the user's ID as the `X-User-Id` header on API requests.
5. The backend resolves that ID to a user.
6. Role dependencies decide whether an operation is allowed.
7. The frontend renders the appropriate navigation and pages.

## 3. Frontend Architecture

The frontend is in the `frontend/` directory.

### Important files

- `frontend/src/main.tsx`: React application entry point.
- `frontend/src/App.tsx`: Browser routes and the Admin route guard.
- `frontend/src/components/layout/AppLayout.tsx`: Authenticated application shell.
- `frontend/src/components/layout/Sidebar.tsx`: Main navigation and role-based Administration visibility.
- `frontend/src/components/layout/Navbar.tsx`: Project selector, notifications, profile menu, role badge, and logout.
- `frontend/src/lib/api.ts`: Shared API client and stored-user helpers.
- `frontend/src/pages/`: Dashboard, attack surface, scanning, vulnerabilities, attack paths, reports, login, and administration screens.
- `frontend/src/components/ui/`: Reusable UI components.
- `frontend/src/types/index.ts`: Shared TypeScript domain types.
- `frontend/src/data/mockData.ts`: Demo data used by the frontend and fallback UI.

### Routing

The main routes are:

- `/login`
- `/dashboard`
- `/attack-surface`
- `/scan-center`
- `/vulnerabilities`
- `/vulnerabilities/:id`
- `/attack-paths`
- `/reports`
- `/admin`

The `/admin` route only renders for an Admin user. Analysts are redirected to `/dashboard`.

### Frontend RBAC behavior

Both roles can access the main security workflow:

- Dashboard
- Attack Surface
- Scan Center
- Vulnerabilities
- Attack Paths
- Reports

Admins additionally get:

- Administration navigation item.
- User administration.
- Integrations.
- Audit logs.
- Platform settings.
- Project management.

Analysts do not see Administration and cannot use the Administration route.

## 4. Backend Architecture

The backend is in the `backend/` directory and is built with FastAPI.

### Important files

- `backend/main.py`: Creates the FastAPI application and registers routers.
- `backend/config.py`: Loads environment configuration.
- `backend/database.py`: Provides persistent local development storage and optional Supabase client setup.
- `backend/services/security_scanner.py`: Safe Python HTTP scanner with SSRF checks, response limits, and evidence-backed findings.
- `backend/deps.py`: Authentication lookup and authorization dependencies.
- `backend/schemas.py`: Pydantic request models and domain literals.
- `backend/routers/`: HTTP API route modules.
- `backend/services/`: Business logic for scanning, discovery, risk, and attack paths.
- `backend/supabase_schema.sql`: Planned relational database schema.

### API groups

- Authentication: `/api/auth`
- Projects: `/api/projects`
- Assets: `/api/assets`
- Discovery: `/api/discovery`
- Scans: `/api/scans`
- Findings: `/api/findings`
- Risk: `/api/risk`
- Attack paths: `/api/attack-paths`
- Reports: `/api/reports`
- Administration: `/api/users` and `/api/audit-logs`

### Backend RBAC behavior

The backend must enforce permissions independently of the frontend.

- `current_user()` reads `X-User-Id` and resolves the user.
- `require_admin()` allows only users whose role is `admin`.
- `require_analyst_or_admin()` allows supported security roles.
- Administration endpoints return HTTP 403 for Analysts.
- Project creation and project updates require Admin access.

Hiding a button or sidebar item is only a user-interface behavior. The backend dependency is the actual security boundary.

## 5. Technology Stack

### Frontend

- React 19: Component-based user interface.
- TypeScript: Static typing for frontend code.
- Vite: Development server and production bundler.
- React Router: Client-side page routing.
- Tailwind CSS: Utility-first styling.
- Lucide React: Interface icons.
- Recharts: Charts and data visualization.
- date-fns: Date formatting and date utilities.
- clsx: Conditional CSS class composition.
- Oxlint: Frontend linting.

### Backend

- Python 3.11 or newer: Backend runtime.
- FastAPI: REST API framework.
- Uvicorn: ASGI development and production server.
- Pydantic: Request validation and typed schemas.
- Supabase Python client: Optional database client integration.
- PostgreSQL/Supabase: Planned persistent database layer.

### Development and deployment

- npm: Frontend dependency and script management.
- Python virtual environment: Backend dependency isolation.
- Swagger/OpenAPI: Automatically available at `/docs`.
- Vercel: Referenced deployment target for the frontend.

## 6. Authentication and Session Terms

### Authentication

Authentication answers: "Who is the user?"

The demo login checks the submitted email and password against users in `DemoStore`.

### Authorization

Authorization answers: "What is this user allowed to do?"

Authorization is enforced using the user's role and backend dependencies.

### Session

The current frontend session is stored in browser local storage using:

- `nexavise_user`: Serialized user object.
- `nexavise_access_token`: Demo token, currently the user ID.

This is suitable for the demo only. It is not a production JWT session.

### X-User-Id

`X-User-Id` is the current demo authentication mechanism. The frontend sends it with protected API requests so the backend can identify the current user.

### Role

A role is a permission category assigned to a user.

Supported roles:

- `admin`: Full platform access.
- `analyst`: Security operations access without administration privileges.

## 7. Security Domain Terminology

### Organization

The customer or company that owns projects, assets, findings, and scans.

### Project

A security assessment scope. A project groups related assets, scans, findings, risk data, and reports.

### Asset

A system or resource being monitored, such as a domain, host, IP address, API, web application, or cloud resource.

### Asset authorization

A safety control indicating whether an asset is approved for discovery or scanning. Unauthorized assets must not be scanned.

### Attack surface

The collection of externally reachable assets and services that could be exposed to attackers.

### Discovery

The process of finding or enriching asset information, such as services, technologies, ports, or host details.

### Scan

A bounded passive HTTP assessment performed against an authorized asset. The backend uses `httpx` and HTML parsing instead of external Nmap or Nuclei binaries.

### Scanner

The backend scanner is named `Nexavise HTTP Scanner`. The UI may retain its existing scanner selector for compatibility, but no external scanner application is executed.

### Finding

A normalized security issue discovered during a scan or assessment.

### Severity

The seriousness of a finding. Supported values include:

- Critical
- High
- Medium
- Low
- Informational

### Finding status

The current workflow state of a finding. Examples include:

- Open
- Confirmed
- In progress
- Resolved
- False positive
- Accepted risk

### Assignment

The analyst or user responsible for working on a finding.

### Status history

The record of changes made to a finding's status over time.

### Risk score

A calculated value used to prioritize security work. It considers factors such as severity, internet exposure, and asset criticality.

### Risk breakdown

The individual components contributing to a risk score, such as base severity, internet exposure, and asset criticality.

### Attack path

A possible chain of weaknesses or reachable systems that could allow an attacker to move toward a sensitive target.

### Report

A generated summary of project security information. Reports can contain executive summaries, technical findings, assets, risk information, and attack paths.

### Audit log

A record of security-sensitive actions such as login, logout, project changes, or administration activity.

### Integration

An external service connected to the platform, such as Jira, Slack, Nmap, or Nuclei.

## 8. Data and Persistence Terms

### DemoStore

The in-memory repository used by the current MVP. It contains demo users, projects, assets, findings, and audit logs.

Data in `DemoStore` is lost when the backend restarts.

### Supabase

The configured hosted PostgreSQL option. The current local development fallback is a persistent SQLite collection store so API data survives refreshes and backend restarts without requiring external infrastructure.

### Repository layer

The part of an application responsible for reading and writing data. A future production version should move database operations behind a repository layer instead of accessing in-memory lists directly.

## 9. Running the Project

### Start the backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Backend URLs:

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/api/health`

### Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

- `http://localhost:5173/login`

### Validate the project

```powershell
cd frontend
npm run build

cd ..\backend
python -m compileall -q .
```

## 10. Important MVP Limitations

This project is a demo/internship MVP and is not production-ready authentication infrastructure.

Current limitations include:

- Demo passwords are stored in plain text.
- The access token is only a user ID, not a signed JWT.
- The default backend behavior uses an in-memory store.
- Data resets when the backend restarts.
- Supabase persistence requires valid `SUPABASE_URL` and `SUPABASE_KEY` configuration and a repository migration for production deployment.
- Real Nmap and Nuclei execution is disabled.
- Rate limiting and refresh tokens are not implemented.
- Organization-level row security is not fully implemented.

Before production use, add secure password hashing, signed token validation, refresh-token handling, rate limiting, persistent repository methods, Supabase Row Level Security, and automated authorization tests.
