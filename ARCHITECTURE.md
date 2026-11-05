# BookLeaf Author Support Portal — Architecture

## 1. Project Overview

- **Author Portal:** Authors log in to view their profile, books, royalties, raise support tickets and track ticket conversations and status.
- **Admin Portal:** Admins manage all tickets — assign them, update status/category/priority, add private internal notes and respond to authors.
- **AI Assistance:** Automatically classify tickets and suggest priority on creation. Generate draft replies for admins on demand. AI-generated replies are never sent automatically — an admin must review and approve before sending.

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Sequelize |
| Authentication | JWT + bcrypt |
| Validation | Zod |
| Forms | React Hook Form |
| Icons | Lucide React |
| AI/LLM | *Pending decision* |

## 3. Repository Structure

Single monorepo with npm workspaces:

```
bookleaf/
├── apps/
│   ├── web/            # Single React app (author + admin portals)
│   └── api/            # Express backend
├── packages/
│   └── shared/         # Shared TypeScript types and Zod schemas
├── package.json        # Workspace root
├── .gitignore
├── .env.example
├── ARCHITECTURE.md
└── README.md
```

- One React application serves both portals using role-based routes and layouts (`/author/*`, `/admin/*`).
- One Express API serves all endpoints.
- Shared types and validation schemas live in `packages/shared/`.

## 4. Backend Architecture

Modular MVC/service structure:

```
api/src/
├── config/             # Database connection, environment variables
├── models/             # Sequelize models and associations
├── modules/
│   ├── auth/           # Login, JWT, password verification
│   ├── authors/        # Author profile, books
│   ├── tickets/        # Ticket CRUD, messages, internal notes
│   └── ai/             # Classification, priority, draft responses
├── middleware/          # authenticate, authorize, validate, errorHandler
├── utils/              # Shared helpers (API response format, etc.)
├── app.ts              # Express app setup
└── server.ts           # Server entry point
```

Each module contains its own routes, controller and service files.

**Responsibilities:**

- **Routes:** Define endpoints, attach middleware.
- **Controllers:** Parse requests, call services, send responses.
- **Services:** Business logic, database queries, AI calls.
- **Models:** Sequelize model definitions and associations.
- **Middleware:** JWT verification, role checks, Zod validation, global error handling.

**Not using:** Repository pattern, DTO classes, microservices, separate AI gateway.

## 5. Database Design

### Tables

| Table | Purpose |
|---|---|
| `users` | All users (authors and admins) with a `role` field |
| `books` | Books belonging to authors |
| `tickets` | Support tickets raised by authors |
| `ticket_messages` | Conversation messages on a ticket (author and admin) |
| `ticket_internal_notes` | Private admin-only notes on a ticket |

### Key Design Decisions

- **Primary keys:** Auto-increment integers for all tables.
- **Single `users` table** with `role` enum (`author` | `admin`). Author-specific fields are nullable — null for admin accounts.
- **Business IDs preserved:** `author_id` (e.g. `AUTH001`) and `book_id` (e.g. `BK001`) stored as unique columns alongside internal integer primary keys.
- **All source fields preserved:** The `users` table stores every author field from the JSON dataset (name, email, phone, city, joined_date). The `books` table stores every book field (title, isbn, genre, publication_date, status, mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned, royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on).
- **Book ownership:** `books.author_user_id` → FK to `users.id`.
- **Ticket → Book association:** `tickets.book_id` is a nullable FK. Null means a general/account-level query.
- **Ticket assignment:** `tickets.assigned_to` — nullable FK to `users.id`. Backend business logic must enforce that the assigned user has `role = 'admin'`.
- **AI fields on tickets:** `ai_category` and `ai_priority` store the AI suggestion. `category` and `priority` store the active (possibly admin-overridden) values.
- **`available_on`:** Stored as a PostgreSQL text array (`TEXT[]`) on the `books` table. No join table.
- **Internal notes protection:** `ticket_messages` and `ticket_internal_notes` remain separate tables. Internal notes are never returned by any author-accessible endpoint. Enforced at the service/controller layer.
- **Seed passwords:** All seeded author accounts use password `author123` (bcrypt hashed). Admin accounts use `admin123`. Documented in README.

### Ticket Categories (from assignment)

`Royalty & Payments` | `ISBN & Metadata Issues` | `Printing & Quality` | `Distribution & Availability` | `Book Status & Production Updates` | `General Inquiry`

### Ticket Priorities (from assignment)

`Critical` | `High` | `Medium` | `Low`

### Ticket Statuses (from assignment)

`Open` | `In Progress` | `Resolved` | `Closed`

### Relationships

```
users (author) ──1:N──► books
users (author) ──1:N──► tickets
books          ──1:N──► tickets (optional)
tickets        ──1:N──► ticket_messages
tickets        ──1:N──► ticket_internal_notes
users          ──1:N──► ticket_messages (sender)
users (admin)  ──1:N──► ticket_internal_notes (author of note)
users (admin)  ──1:N──► tickets (assigned_to)
```

### Indexes

- `users.email` — unique
- `users.author_id` — unique (where not null)
- `books.book_id` — unique
- `books.isbn` — unique (confirmed: all 18 ISBNs in the supplied dataset are unique)
- `tickets.author_user_id` — for author ticket lookups
- `tickets.status`, `tickets.priority`, `tickets.created_at` — for admin filtering/sorting
- `ticket_messages.ticket_id` — for message retrieval
- `ticket_internal_notes.ticket_id` — for notes retrieval

## 6. Authentication & Authorization

- **Login:** Email + password. JWT issued on success.
- **JWT payload:** User ID, role, email.
- **Middleware:** `authenticate` verifies the JWT on all protected routes. `authorize(role)` restricts endpoints by role.
- **Author isolation:** Every author-scoped query filters by the authenticated user's ID. An author cannot access another author's tickets, books or data.
- **Admin access:** Admins can access all tickets, messages and internal notes.
- **Token storage:** JWT stored in an HTTP-only cookie. Requires appropriate CORS configuration (credentials, allowed origins), secure cookie settings (HttpOnly, SameSite, Secure in production) and CSRF protection.
- **Refresh tokens:** Not implementing. Single access token via HTTP-only cookie is sufficient for this scope.

## 7. AI Integration

### Functions

| Function | Trigger | Input | Output |
|---|---|---|---|
| Classify + suggest priority | Ticket creation | Subject, description, book status | Category, priority, confidence |
| Generate draft response | Admin clicks "Generate" | Subject, description, category, book details, knowledge base | Draft response text |

### Rules

- Classification and priority are returned in a **single AI call**.
- Draft response generation is a **separate call**, triggered only by admin action.
- AI **never sends replies automatically**. The admin must review, edit and approve.
- If the AI call fails, the ticket is still created. Category and priority default to null/unclassified. The admin classifies manually.
- The BookLeaf knowledge base is stored as a dedicated file/constant in the AI module. No vector database or embeddings.

### AI Provider

*Pending decision.* Options: OpenAI (`gpt-4o-mini`) or Anthropic (`claude-3-5-haiku`).

## 8. Real-Time Updates

- Start with **polling** (~30 seconds) on ticket detail pages.
- No Socket.IO or WebSocket implementation initially.
- Upgrade to SSE or WebSockets only if time permits.

## 9. API Documentation

- Document all endpoints in the **README** with method, path, auth requirements and description.
- No Swagger setup initially. Add only if time permits after core functionality is complete.

## 10. Scope Boundaries

### In scope

- Author login, profile, books, royalties display.
- Full ticket lifecycle: create → classify → assign → respond → resolve/close.
- AI classification, priority suggestion and draft response generation.
- Admin ticket queue with filtering by status, category, priority, date.
- Internal notes (admin-only).
- Polling-based ticket updates.
- Seed script loading the provided JSON dataset.
- README documentation.

### Out of scope

- Redis, message queues, Kubernetes, Docker (for development).
- Vector databases, embeddings, RAG pipelines.
- Microservices or separate AI gateway.
- Refresh tokens or complex session management.
- File upload (UI placeholder only — actual upload is bonus per the assignment).
- Social login, OTP, OAuth.

---

## Pending Decisions

| Decision | Options | Notes |
|---|---|---|
| AI provider | OpenAI `gpt-4o-mini` / Anthropic `claude-3-5-haiku` / other | Decide once API key availability is confirmed. Do not assume a paid subscription. |
| Deployment targets | Vercel + Railway / Vercel + Render / other | Decision deferred to deployment phase. Must support free tier. |

