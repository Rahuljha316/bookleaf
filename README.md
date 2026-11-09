# BookLeaf Author Support Portal

A full-stack support and ticketing platform for authors and administrators, featuring AI-assisted ticket classification and draft response generation.

For complete architectural decisions and database schema design, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Monorepo Structure

```text
bookleaf/
├── apps/
│   ├── web/                 # React frontend (Vite + Tailwind CSS + shadcn/ui)
│   └── api/                 # Express backend (TypeScript + Sequelize ready)
├── packages/
│   └── shared/              # Shared TypeScript types and Zod schemas
├── ARCHITECTURE.md          # Architectural decisions & system specifications
├── README.md                # Project documentation & operational commands
├── .gitignore               # Root git ignore
├── .env.example             # Root environment template
└── package.json             # Root npm workspaces configuration
```

---

## 2. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher
- **PostgreSQL**: PostgreSQL 15+ installed locally (service running on default port `5432`)

---

## 3. Local PostgreSQL Setup

### 1. Create Local Database
Create a database named `bookleaf_dev` using `psql` or `createdb`:

```bash
# Using psql:
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE bookleaf_dev;"
```

### 2. Configure Environment Variables
Configure `.env` in the root of the project (copy from `.env.example`):

```bash
cp .env.example .env
```

```env
# Backend API Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database (Local PostgreSQL — SSL disabled)
DATABASE_URL=postgres://postgres:your_password@localhost:5432/bookleaf_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bookleaf_dev
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# AI Provider Configuration (Google Gemini)
GEMINI_API_KEY=your-gemini-api-key-here

# Authentication — JWT
JWT_SECRET=bookleaf-dev-jwt-secret-change-in-production-must-be-32-chars
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false

# Initial Admin Seeding
ADMIN_EMAIL=admin@bookleaf.pub
ADMIN_PASSWORD=admin123
ADMIN_NAME=BookLeaf Admin

# Frontend Configuration (Vite)
VITE_API_URL=http://localhost:5000
```

> **Neon Production Configuration**: For cloud deployment on Neon, see the production reference section in `.env.example`. Set `DATABASE_URL` to your Neon connection string (with `?sslmode=require`) and set `DB_SSL=true`. Local development keeps `DB_SSL=false`.

### 3. Database Migration and Seeding

Run database migrations to initialize tables and relationships:
```bash
npm run db:migrate
```

Run seeders to populate initial dataset (1 admin, 10 authors, 18 books):
```bash
npm run db:seed
```

Verify schema, model associations, and dataset integrity:
```bash
npm run db:verify
```

---

## 4. Installation

Install all workspace dependencies from the root directory:

```bash
npm install
```

---

## 5. Development Commands

### Run Full Stack Development (Shared Watch + Backend + Frontend)
Starts the shared workspace TypeScript compiler in watch mode (`tsc --watch`), the Express API with hot-reload (`tsx watch`, port 5000), and the Vite development server with HMR (port 5173).

> **Note**: An npm `predev` lifecycle script automatically builds `@bookleaf/shared` before starting processes, ensuring the compiled shared module exists before the API or frontend starts.

```bash
npm run dev
```

### Run Applications Separately

```bash
# Watch and recompile shared workspace types and schemas on change
npm run dev:shared

# Start backend API only (watches changes via tsx)
npm run dev:api

# Start frontend Web only (Vite HMR)
npm run dev:web
```

### Verify Running Backend API
With the API running (`npm run dev:api`), execute integration test suites:

```bash
# Run Authentication test suite (16 tests)
npm run auth:verify

# Run Ticket Management test suite (31 tests)
npm run ticket:verify
```

---

## 6. Build and Type Checking

### TypeScript Type Checking across all packages

```bash
npm run typecheck
```

### Production Build

```bash
# Build all workspaces (shared package -> api -> web)
npm run build

# Build individual applications
npm run build:shared
npm run build:api
npm run build:web
```

---

## 7. Verification Endpoints

- **Backend Health Check:** `http://localhost:5000/api/health`
  - Returns `{"status":"ok","message":"BookLeaf Author Support Portal API is running",...}`
- **Frontend Web UI:** `http://localhost:5173`
  - Shows portal status and live health check verification against the API.

---

## 8. Authentication API

> Base path: `/api/auth`
> All requests and responses use `Content-Type: application/json`.
> The JWT is stored in an **HTTP-only cookie** (`bookleaf_token`). Include `credentials: 'include'` (or `withCredentials: true`) from the frontend.

### Endpoints

| Method | Path | Auth required | Roles | Description |
|--------|------|--------------|-------|-------------|
| `POST` | `/api/auth/login` | No | — | Log in with email & password. Sets JWT cookie. |
| `POST` | `/api/auth/logout` | No (best-effort) | — | Clears the JWT cookie. |
| `GET`  | `/api/auth/me` | Yes | author, admin | Returns the authenticated user (no `password_hash`). |

### POST /api/auth/login

**Request body:**
```json
{
  "email": "author@example.com",
  "password": "secret"
}
```

**Success `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "author_id": "AUTH001",
      "role": "author",
      "name": "Jane Doe",
      "email": "author@example.com",
      "phone": null,
      "city": null,
      "joined_date": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Failure `401`:**
```json
{ "success": false, "message": "Invalid email or password" }
```

**Validation failure `400`:**
```json
{ "success": false, "message": "Must be a valid email address" }
```

### POST /api/auth/logout

No request body required.

**Success `200`:**
```json
{ "success": true, "message": "Logged out successfully" }
```

### GET /api/auth/me

Requires the `bookleaf_token` cookie.

**Success `200`:**
```json
{
  "success": true,
  "message": "Authenticated user retrieved",
  "data": { "user": { ... } }
}
```

**Unauthenticated `401`:**
```json
{ "success": false, "message": "Authentication required. Please log in." }
```

---

### Additional API Endpoints

| Method | Path | Auth required | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | No | — | API health check and environment status. |
| `GET` | `/api/books` | Yes | `author` | Lists only books belonging to the authenticated author, including publication and royalty fields. |
| `GET` | `/api/admin/admins` | Yes | `admin` | Lists administrator accounts for ticket assignment and queue filtering. |

### Middleware Reference

| Middleware | File | Usage |
|---|---|---|
| `authenticate` | `middleware/authenticate.ts` | Verifies JWT cookie, populates `req.user` |
| `authorize(...roles)` | `middleware/authorize.ts` | Restricts route to listed roles |
| `validate(schema)` | `middleware/validate.ts` | Validates `req.body` via Zod schema |
| `errorHandler` | `middleware/errorHandler.ts` | Global catch-all error handler |

**Example — protecting a route:**
```ts
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

router.get('/admin/tickets', authenticate, authorize('admin'), handler);
router.get('/profile',       authenticate, authorize('author', 'admin'), handler);
```

---

### Required Environment Variables (Authentication)

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | *(dev fallback)* | Min 32-char random string; **change in production** |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime (`7d`, `1h`, etc.) |
| `COOKIE_SECURE` | No | `false` | Set `true` in production (HTTPS only) |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Frontend origin for CORS + cookie credentials |

---

### Auth Verification

```bash
# With the API running (npm run dev:api), in another terminal:
npm run auth:verify
```

---

## 9. Ticket Management API

> All ticket endpoints require authentication (`bookleaf_token` HTTP-only cookie).  
> Requests and responses use `Content-Type: application/json`.  
> Author IDs are never accepted from request payloads; the author is strictly derived from `req.user.id`.  
> Private internal notes (`ticket_internal_notes`) are strictly isolated and never returned to authors.

### Endpoint Overview

#### Author Endpoints

| Method | Path | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/tickets` | Yes | `author` | Create a support ticket with subject, description, and optional book ID. |
| `GET` | `/api/tickets` | Yes | `author` | List author's own tickets with pagination and optional status filter. |
| `GET` | `/api/tickets/:id` | Yes | `author` | Get single ticket details and conversation messages (internal notes omitted). |
| `POST` | `/api/tickets/:id/messages` | Yes | `author` | Post a public message/reply to author's own ticket. |

#### Admin Endpoints

| Method | Path | Auth Required | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/tickets` | Yes | `admin` | List all tickets with filters (status, priority, category, assigned_to, created_from, created_to) & pagination. |
| `GET` | `/api/admin/tickets/:id` | Yes | `admin` | Get complete ticket details including public messages and private internal notes. |
| `PATCH` | `/api/admin/tickets/:id` | Yes | `admin` | Update status, category, priority, or assigned admin. |
| `POST` | `/api/admin/tickets/:id/messages` | Yes | `admin` | Post a public admin response message to a ticket. |
| `POST` | `/api/admin/tickets/:id/notes` | Yes | `admin` | Add a private internal note to a ticket (visible to admins only). |
| `POST` | `/api/admin/tickets/:id/ai-draft` | Yes | `admin` | Generate a Knowledge Base-grounded draft for admin review; does not send or persist the reply. |

---

### Author Endpoint Details

#### POST `/api/tickets`
Creates a support ticket for the authenticated author. Automatically sets initial status to `Open` and `ai_classification_status` to `pending`.

**Request body:**
```json
{
  "subject": "Royalty statement discrepancy",
  "description": "My October sales count does not match the payout amount.",
  "book_id": 4
}
```
*(book_id is optional; when supplied, Book ownership by the author is validated)*

**Success `201`:**
```json
{
  "success": true,
  "message": "Ticket created successfully.",
  "data": {
    "ticket": {
      "id": 12,
      "ticket_number": "TICK-1012",
      "author_user_id": 1,
      "book_id": 4,
      "assigned_to": null,
      "subject": "Royalty statement discrepancy",
      "description": "My October sales count does not match the payout amount.",
      "category": "General Inquiry",
      "priority": "Medium",
      "status": "Open",
      "ai_classification_status": "pending",
      "created_at": "2026-11-06T00:00:00.000Z",
      "updated_at": "2026-11-06T00:00:00.000Z"
    }
  }
}
```

**Errors:**
- `400`: Invalid payload (e.g. empty subject or description).
- `403`: Book belongs to another author (`You do not have permission to link this book to a ticket.`).
- `404`: Specified book does not exist.

#### GET `/api/tickets`
Returns only the authenticated author's tickets with pagination metadata.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)
- `status` (`Open` | `In Progress` | `Resolved` | `Closed`)

**Success `200`:**
```json
{
  "success": true,
  "message": "Tickets retrieved.",
  "data": {
    "tickets": [
      {
        "id": 12,
        "ticket_number": "TICK-1012",
        "subject": "Royalty statement discrepancy",
        "status": "Open",
        "priority": "Medium",
        "category": "General Inquiry",
        "book": { "id": 4, "title": "Whispers of the Wind", "book_id": "BK004" },
        "assignedAdmin": null,
        "created_at": "2026-11-06T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

#### GET `/api/tickets/:id`
Retrieves ticket details and public conversation stream. Returns `404` if the ticket belongs to a different author to prevent resource enumeration.

**Success `200`:**
```json
{
  "success": true,
  "message": "Ticket retrieved.",
  "data": {
    "ticket": {
      "id": 12,
      "ticket_number": "TICK-1012",
      "subject": "Royalty statement discrepancy",
      "description": "...",
      "status": "Open",
      "author": { "id": 1, "name": "Jane Author", "email": "author@example.com" },
      "book": { "id": 4, "title": "Whispers of the Wind", "book_id": "BK004" },
      "messages": [
        {
          "id": 1,
          "ticket_id": 12,
          "message": "Here is an update on my question.",
          "is_ai_assisted": false,
          "created_at": "2026-11-06T00:05:00.000Z",
          "sender": { "id": 1, "name": "Jane Author", "role": "author" }
        }
      ]
    }
  }
}
```

#### POST `/api/tickets/:id/messages`
Adds a public message from the author to their own ticket.

**Request body:**
```json
{
  "message": "I found the payment receipt from last week."
}
```

---

### Admin Endpoint Details

#### GET `/api/admin/tickets`
Lists all support tickets across all authors with filtering and pagination.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)
- `status` (`Open` | `In Progress` | `Resolved` | `Closed`)
- `priority` (`Critical` | `High` | `Medium` | `Low`)
- `category` (`Royalty & Payments` | `ISBN & Metadata Issues` | `Printing & Quality` | `Distribution & Availability` | `Book Status & Production Updates` | `General Inquiry`)
- `assigned_to` (integer user ID)
- `created_from` (optional inclusive start date, `YYYY-MM-DD`, UTC calendar day)
- `created_to` (optional inclusive end date, `YYYY-MM-DD`, UTC calendar day)

Date bounds can be combined with the other filters. If both are supplied, `created_from` must be on or before `created_to`. By default, the queue orders unresolved tickets before resolved/closed tickets, then by priority (Critical → High → Medium → Low), and then oldest first within each priority.

#### GET `/api/admin/tickets/:id`
Retrieves full ticket details including conversation messages and private staff internal notes.

**Success `200`:**
```json
{
  "success": true,
  "message": "Ticket retrieved.",
  "data": {
    "ticket": {
      "id": 12,
      "ticket_number": "TICK-1012",
      "messages": [ ... ],
      "internalNotes": [
        {
          "id": 1,
          "ticket_id": 12,
          "note": "Author bank account was updated yesterday; verifying ledger.",
          "created_at": "2026-11-06T00:10:00.000Z",
          "admin": { "id": 2, "name": "Support Admin" }
        }
      ]
    }
  }
}
```

#### PATCH `/api/admin/tickets/:id`
Updates ticket status, category, priority, or assigned admin. Validates that `assigned_to` belongs to an admin account.

**Request body:**
```json
{
  "status": "In Progress",
  "category": "Royalty & Payments",
  "priority": "High",
  "assigned_to": 2
}
```

**Errors:**
- `400`: Assignee is not an admin user (`Only admin users can be assigned to tickets.`).
- `404`: Ticket or assignee not found.

#### POST `/api/admin/tickets/:id/messages`
Sends a public reply from the admin team to the ticket author.

**Request body:**
```json
{
  "message": "We have credited the remaining balance to your registered account."
}
```

#### POST `/api/admin/tickets/:id/notes`
Creates a private internal note visible exclusively to administrators.

**Request body:**
```json
{
  "note": "Issue resolved with finance team. Author confirmed transaction ID."
}
```

---

### Ticket API Verification

```bash
# With the API running (npm run dev:api), in another terminal:
npm run --workspace=@bookleaf/api ticket:verify
```

---

## 10. Deployment Configuration

**Live demo status:** No deployed URL is included in this source archive. Add the public frontend URL only after deployment and end-to-end verification. Configure production secrets privately, run migrations, and seed the supplied dataset before sharing the demo.


Both frontend and backend are independently deployable from this repository.

### Frontend Deployment (Vercel / Netlify)

- **Framework Preset:** Vite
- **Root Directory:** `apps/web` (or root with workspace build command)
- **Build Command:** `npm run build:web` (or if root directory is set to `apps/web`: `npm run build`)
- **Output Directory:** `dist` (inside `apps/web`)
- **Environment Variables:**
  - `VITE_API_URL`: Backend origin (e.g., `https://api.bookleaf.onrender.com`). The frontend appends `/api` automatically unless the value already ends in `/api`. If omitted, the app uses the same-origin `/api` path (works with the local Vite proxy).

### Backend Deployment (Render)

- **Service Type:** Web Service
- **Root Directory:** `.` (repository root, to resolve `@bookleaf/shared` workspace dependency)
- **Build Command:** `npm run build:api`
- **Start Command:** `npm run start --workspace=@bookleaf/api` (runs `node dist/server.js`)
- **Environment Variables:**
  - `NODE_ENV`: `production`
  - `PORT`: `10000` (Render default or specified by Render)
  - `CORS_ORIGIN`: URL of the deployed frontend (e.g., `https://bookleaf.vercel.app`)
  - `DATABASE_URL`: Neon PostgreSQL connection string
  - `DB_SSL`: `true`
  - `JWT_SECRET`: Secure random string of at least 32 characters
  - `COOKIE_SECURE`: `true` in production HTTPS deployments
  - `AI_PRIMARY_PROVIDER`: `openai` or `gemini`
  - `AI_FALLBACK_PROVIDERS`: comma-separated fallback providers (for example `gemini`)
  - `OPENAI_API_KEY` and/or `GEMINI_API_KEY`: server-side provider credentials for the configured providers
  - `OPENAI_MODEL` / `GEMINI_MODEL`: optional model overrides
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: initial admin seed credentials; use a strong production password

---

## 11. AI System Architecture & Capabilities

The BookLeaf portal implements an intelligent assistance pipeline designed for resilience, strict data privacy, and accurate knowledge grounding.

### Dual-Provider Architecture & Resilient Fallback

- **Default Primary Provider:** OpenAI (`gpt-4o-mini`), selected in `.env.example` as a cost-conscious model for classification and concise support drafts. The model/provider can be changed through environment configuration.
- **Configured Fallback:** Google Gemini (`gemini-3.8-flash`) is listed as the default fallback in `.env.example`. It can also be selected as the primary provider.
- **Automatic Failover:** `AIProviderManager` tries the configured providers in order and continues to the next provider when an adapter reports a retryable, invalid-output, timeout, rate-limit, or provider failure. If no configured provider succeeds, the ticket workflow remains available and admins can respond manually.

### Auto-Classification & Admin Override Lifecycle

1. **Non-Blocking Creation:** Authors submit tickets without waiting for AI processing (`POST /api/tickets` returns `201` immediately). AI classification runs in the background.
2. **Active Categorization:** On successful classification, the AI result populates the active `category` and `priority` fields so tickets immediately appear in the correct admin queues and filters.
3. **Auditability:** Original AI predictions are stored separately in `ai_suggested_category` and `ai_suggested_priority`.
4. **Independent Per-Field Overrides:** If an administrator modifies `category` before classification finishes, the admin's category is preserved while AI can still populate `priority` (and vice-versa). Overrides are tracked persistently in the database (`category_manually_overridden`, `priority_manually_overridden`).
5. **Graceful Degradation:** If all AI providers fail, tickets default to `General Inquiry` / `Medium` with `ai_classification_status: failed`. Admins can manually categorize tickets with zero operational disruption.

### Priority Level Calibration

Prompts are calibrated across all 6 categories with clear priority definitions:
- **Critical:** Complete publication blockers or catastrophic platform/launch issues causing severe harm.
- **High:** Substantial operational issues directly affecting revenue or author deliverables. ISBN errors are High priority under the BookLeaf Knowledge Base, as are genuinely overdue royalty payouts and significant printing or distribution issues.
- **Medium:** Standard operational support inquiries, routine production updates, or metadata adjustments (for example, a routine book-status question or an author-bio update). The assignment does not specify a general production turnaround window, so the classifier must not invent one. *A self-service workaround is not required for Medium priority.*
- **Low:** General informational questions, platform navigation, or casual queries.

### AI Reply Draft Generation & Grounding

- **Human-in-the-Loop:** Drafts are generated only on admin demand. Drafts are never sent automatically to authors.
- **Dynamic Knowledge Base Retrieval:** `getRelevantKBSections()` injects only policy sections relevant to the ticket's effective category and inquiry content, optimizing token usage.
- **Bounded conversation context:** Reply drafting includes at most the 15 most recent public messages and a 12,000-character conversation budget (with a 3,000-character per-message cap). The original ticket description and linked-book facts are retained. This keeps prompt size predictable while prioritizing recent discussion.
- **Anti-Hallucination Constraints:**
  - Enforces the BookLeaf royalty formula: **80% of NET PROFIT** (MRP minus printing, platform commission, and shipping), never 80% of gross MRP.
  - Prohibits hallucinating specific calendar quarter dates (e.g. inventing June 30 or March 31 dates unless stated in ticket/book data).
  - Prohibits claiming unexecuted actions (such as stating bank transfers have already disbursed or inventory has re-synced).
  - Restricts 48-hour SLAs strictly to overdue royalty escalations with finance, ISBN errors, and retailer stock re-syncs.
- **Strict Privacy Isolation:** Private internal notes (`ticket_internal_notes`) are strictly excluded from AI draft prompts and are never visible to authors.

---

## 12. Test Credentials & Verification

### Sample Test Accounts

All accounts are seeded from `FULLSTACK-SAMPLEDATA (1) (1) (1).json`:

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Admin** | BookLeaf Admin | `admin@bookleaf.pub` | `admin123` | Full access to queue, filters, AI drafts, internal notes |
| **Author** | Priya Sharma | `priya.sharma@example.com` | `author123` | 2 books, royalty discrepancy query |
| **Author** | Aravind Subramaniam | `aravind.subramaniam@example.com` | `author123` | 3 books, distribution out-of-stock query |
| **Author** | Meera Patel | `meera.patel@example.com` | `author123` | 1 book, production typesetting query |
| **Author** | Rohan Das | `rohan.das@example.com` | `author123` | 2 books, printing defect query |

### Running Tests & Verification

```bash
# 1. Run all unit and integration tests (mocked providers, no external API calls)
npm run test --workspace=@bookleaf/api

# 2. Run TypeScript typechecking across all packages
npm run typecheck

# 3. Build all packages for production
npm run build
```




## Known Limitations

- Support-query file attachments are represented in the author form UI; actual file storage/upload is not implemented, which is optional in the assignment.
- No public live-demo URL is included in this source archive. A deployment must be completed and verified before a URL can be published.
- AI quality is covered by mocked adapter/service tests, but a measured accuracy score against a separately labelled real-ticket evaluation set is not included.
- AI reply context is bounded to recent public conversation messages; older conversation details are not automatically summarized. The original ticket description and linked-book facts remain included.
- Provider usage/cost telemetry is not currently exposed as an operational dashboard.
