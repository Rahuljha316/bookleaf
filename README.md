# BookLeaf Author Support & Communication Portal

A full-stack support and ticketing platform built for BookLeaf Publishing. It streamlines communication between published authors and support staff, featuring author royalty/book transparency, administrative queue management, and resilient AI-assisted ticket triage and response drafting.

For in-depth documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md), [API.md](./API.md), and [SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md).

---

## 1. Live Demo

- **Frontend Application:** [https://bookleaf-sigma.vercel.app](https://bookleaf-sigma.vercel.app)
- **Backend API:** [https://bookleaf-api-hzzp.onrender.com](https://bookleaf-api-hzzp.onrender.com)
- **API Health Check:** [https://bookleaf-api-hzzp.onrender.com/api/health](https://bookleaf-api-hzzp.onrender.com/api/health)

---

## 2. Key Features

- **Authentication & RBAC:** Secure JWT authentication via HTTP-only cookies (`SameSite=None`, `Secure`) with role-based route guards separating author and admin workflows.
- **Author Portal & Royalty Dashboard:** Authors can view published books, ISBNs, print partners, sales volumes, royalties earned, and pending payouts.
- **Ticket Lifecycle & Conversation:** Authors can submit tickets linked to specific books, track statuses (`Open`, `In Progress`, `Resolved`, `Closed`), and exchange messages with staff.
- **Admin Management Queue:** Multi-filter triage (status, priority, category, assignee, date range), priority-based queue ordering, ticket assignment, and status updates.
- **Private Staff Notes:** Administrators can record internal notes strictly hidden from author view and excluded from AI context.
- **AI-Powered Triage & Assistance:** Asynchronous auto-classification into 6 categories, priority calibration (`Critical` to `Low`), manual override protection, and on-demand Knowledge-Base-grounded draft replies.

---

## 3. Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, TypeScript, Sequelize ORM
- **Database:** PostgreSQL (hosted on Render)
- **AI Integration:** Google Gemini API (`@google/genai`) and OpenAI (`openai`) via adapter pattern
- **Deployment:** Vercel (Frontend SPA) and Render (Backend Web Service & PostgreSQL)

---

## 4. Evaluation & Demo Credentials

> **Notice:** The credentials below are pre-seeded test accounts intended strictly for evaluation and demo testing.

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Admin** | BookLeaf Admin | `admin@bookleaf.pub` | `admin123` | Full administrative queue, AI draft generation, internal notes |
| **Author 1** | Priya Sharma | `priya.sharma@email.com` | `author123` | 2 books, pending royalty payout, active ticket history |
| **Author 2** | Rohit Kapoor | `rohit.kapoor@email.com` | `author123` | 2 books, high sales volume |

*All 10 seeded authors use the demo password `author123`.*

---

## 5. Local Setup & Installation

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **npm**: `v10.x` or higher
- **PostgreSQL**: PostgreSQL 15+ running locally (default port: `5432`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Rahul-Bhoir/Bookleaf.git
cd bookleaf
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Key configuration values:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:password@localhost:5432/bookleaf_dev
JWT_SECRET=your-secure-random-jwt-secret-at-least-32-chars
COOKIE_SECURE=false

# AI Configuration (Gemini or OpenAI)
AI_PRIMARY_PROVIDER=openai
AI_FALLBACK_PROVIDERS=gemini
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

### 3. Database Migration & Seeding
```bash
# Run migrations
npm run db:migrate

# Seed demo dataset (1 admin, 10 authors, 18 books)
npm run db:seed

# Verify database schema & relationships
npm run db:verify
```

### 4. Running the Application
```bash
# Start all services concurrently (Shared package watch + API + Web)
npm run dev

# Or run services individually:
npm run dev:api     # Backend API on http://localhost:5000
npm run dev:web     # Frontend SPA on http://localhost:5173

# Run test verification suites
npm run auth:verify     # Authentication test suite
npm run ticket:verify   # Ticket management test suite
npm run typecheck       # Monorepo TypeScript check
```

---

## 6. Architecture Overview

BookLeaf uses an npm workspaces monorepo: `apps/web` (React SPA), `apps/api` (Express REST service), and `packages/shared` (TypeScript types and Zod schemas).

```mermaid
flowchart LR
    subgraph Client ["Client Layer"]
        Browser["React 18 SPA (Vercel)"]
    end
    subgraph Server ["Server Layer (Render)"]
        API["Express API Service"]
        Mgr["AI Provider Manager"]
    end
    subgraph Data ["Data & AI"]
        DB[(PostgreSQL on Render)]
        Gemini["Google Gemini (Primary)"]
        OpenAI["OpenAI (Fallback)"]
    end

    Browser <-->|"HTTPS / Cookies"| API
    API <-->|"Sequelize ORM"| DB
    API --> Mgr
    Mgr -->|"Grounded Drafts / Classify"| Gemini
    Mgr -.->|"Failover"| OpenAI
```

*For complete architecture specifications, see [ARCHITECTURE.md](./ARCHITECTURE.md).*

---

## 7. AI Integration

The AI triage pipeline is built with resilience, data privacy, and grounding controls:
- **Non-Blocking Classification:** Tickets commit immediately (`201 Created`); AI classification triggers asynchronously in the background. If AI providers fail, tickets default safely to `General Inquiry` / `Medium`.
- **Manual Override Protection:** If staff manually update category or priority, database override flags (`category_manually_overridden`, `priority_manually_overridden`) prevent subsequent AI predictions from replacing human triage.
- **Grounding & Guardrails:** Draft replies dynamically retrieve relevant BookLeaf policy sections and enforce the net-profit royalty policy (80% of net profit, never gross MRP) without hallucinating unannounced dates.
- **Privacy Isolation:** Internal staff notes are strictly excluded from AI prompts and author views.
- **Human-in-the-Loop:** Draft replies are generated on admin demand and are never sent automatically.
- **Provider Strategy:** In production, Google Gemini (`gemini-3.5-flash-lite`) serves as the primary provider with verified response generation; OpenAI is set as a configured fallback. Local environments default via `.env.example` to OpenAI (`gpt-4o-mini`) with Gemini fallback.

---

## 8. Deployment Configuration

The application is deployed across decoupled cloud platforms:

### Frontend — Vercel
- **Production URL:** [https://bookleaf-sigma.vercel.app](https://bookleaf-sigma.vercel.app)
- **Root Directory:** `./`
- **Build Command:** `npm run build:web`
- **Output Directory:** `apps/web/dist`
- **Environment Variables:** `VITE_API_URL=https://bookleaf-api-hzzp.onrender.com`

### Backend — Render
- **Production URL:** [https://bookleaf-api-hzzp.onrender.com](https://bookleaf-api-hzzp.onrender.com)
- **Service Type:** Web Service
- **Build Command:** `npm install && npm run build:api && npm run db:migrate:dist`
- **Start Command:** `npm run start:api`
- **Database:** Managed PostgreSQL instance hosted on Render.

---

## 9. Limitations & Future Improvements

- **File Attachments:** The ticket creation UI contains an attachment upload mock; file cloud storage (e.g., S3/GCS) is not implemented.
- **Background Job Durability:** Asynchronous ticket classification runs in-process via managed asynchronous promises. A production-grade deployment would utilize a persistent queue (e.g., Redis + BullMQ) to ensure persistence across restarts.
- **Real-Time Communication:** Ticket message updates currently use polling; WebSockets or Server-Sent Events (SSE) would provide instant delivery.
- **Advanced Retrieval:** Knowledge Base matching uses content- and category-based retrieval; vector search / embeddings could be added as policy documentation expands.

---

## 10. Additional Documentation

- **[API.md](./API.md):** Complete REST API specifications, schemas, query parameters, and error codes.
- **[ARCHITECTURE.md](./ARCHITECTURE.md):** System architecture, database schemas, model relationships, and design decisions.
- **[SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md):** Technical assignment approach, trade-offs, and prioritization write-up.
