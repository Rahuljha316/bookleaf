# BookLeaf Author Support Portal

A full-stack support and ticketing platform for authors and administrators, featuring AI-assisted ticket classification and draft response generation.

For complete architectural decisions and database schema design, see [ARCHITECTURE.md](file:///e:/bookleaf/ARCHITECTURE.md).

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

---

## 3. Installation

Install all workspace dependencies from the root directory:

```bash
npm install
```

---

## 4. Development Commands

### Run Frontend & Backend Concurrently
Starts both the Express API (port 5000) and the Vite development server (port 5173):

```bash
npm run dev
```

### Run Applications Separately

```bash
# Start backend API only (watches changes via tsx)
npm run dev:api

# Start frontend Web only (Vite HMR)
npm run dev:web
```

---

## 5. Build and Type Checking

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

## 6. Verification Endpoints

- **Backend Health Check:** `http://localhost:5000/api/health`
  - Returns `{"status":"ok","message":"BookLeaf Author Support Portal API is running",...}`
- **Frontend Web UI:** `http://localhost:5173`
  - Shows portal status and live health check verification against the API.

---

## 7. Deployment Configuration

Both frontend and backend are independently deployable from this repository.

### Frontend Deployment (Vercel / Netlify)

- **Framework Preset:** Vite
- **Root Directory:** `apps/web` (or root with workspace build command)
- **Build Command:** `npm run build:web` (or if root directory is set to `apps/web`: `npm run build`)
- **Output Directory:** `dist` (inside `apps/web`)
- **Environment Variables:**
  - `VITE_API_URL`: URL of the deployed backend API (e.g., `https://api.bookleaf.onrender.com`)

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
  - `JWT_SECRET`: Secure random string

