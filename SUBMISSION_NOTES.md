# Technical Assignment Submission Notes — BookLeaf Portal

## 1. Overall Development Approach

The solution was built as an integrated, type-safe monorepo (`npm workspaces`) comprising `@bookleaf/web` (React SPA), `@bookleaf/api` (Express backend), and `@bookleaf/shared` (TypeScript types and Zod schemas). Development proceeded systematically:
1. **Data Modeling & Seeding:** Defined relational schemas in PostgreSQL via Sequelize migrations and wrote an idempotent seed script mapping the provided dataset of authors and books.
2. **Core Domain APIs:** Developed authenticated author operations (book/royalty dashboard, ticket creation, conversation history) and administrative capabilities (multi-filter triage queue, ticket assignment, status progression, internal notes).
3. **Resilient AI Pipeline:** Designed an adapter-driven provider management system supporting Google Gemini and OpenAI with non-blocking execution, override preservation, and policy-grounded draft replies.
4. **End-to-End Verification & Cloud Deployment:** Validated contracts with automated script suites (`auth:verify`, `ticket:verify`, `db:verify`) and deployed frontend to Vercel and backend/database to Render.

---

## 2. Main Priorities and Justification

- **Robust End-to-End Workflow:** Priority was placed on ensuring authors have complete visibility into their book metadata and royalties, while admins possess a high-utility queue to filter, prioritize, and communicate.
- **Data Isolation & Privacy:** Enforced strict separation between public conversation streams and internal staff notes (`ticket_internal_notes`). Private notes are never returned to authors and are strictly excluded from AI prompts.
- **Fail-Safe User Experience:** Support submission must never fail due to third-party LLM latency or outages. Ticket creation commits immediately, while AI classification executes asynchronously with graceful degradation to default categories.
- **Human-in-the-Loop AI:** Draft responses are strictly generated on admin demand and never dispatched automatically, preventing hallucinated author commitments.

---

## 3. Key Architecture Decisions

- **Unified Frontend with Role Guards:** A single React 18 SPA handles both author and admin portals, utilizing context-based authentication and role-based route guards (`/author/*` vs `/admin/*`).
- **Shared Type Contracts:** Shared interfaces and Zod validation schemas in `@bookleaf/shared` ensure request/response parity across frontend and backend, catching contract breakages at compile time.
- **Cookie-Based JWT Authentication:** Chose HTTP-only cookies (`SameSite=None`, `Secure=true`) over `localStorage` to safeguard tokens against XSS attacks while supporting cross-site requests between Vercel and Render.
- **Pluggable AI Provider Manager:** Implemented an adapter pattern allowing primary and fallback LLM providers to be switched via environment variables without altering application business logic.

---

## 4. Trade-Offs Within the 4-Day Timeline

- **In-Process Async vs. Distributed Job Queue:** Asynchronous ticket classification runs in-process via managed background promises rather than a dedicated queue (e.g., BullMQ + Redis). This kept infrastructure minimal and free-tier compatible.
- **Keyword & Category Retrieval vs. Vector Embeddings:** Knowledge Base retrieval uses structured section selection and keyword matching rather than a vector database. This eliminated vector store overhead while reliably enforcing key policies (e.g., the 80% net-profit formula).
- **HTTP Polling vs. WebSockets:** Frontend conversation updates rely on client polling rather than persistent WebSocket connections, ensuring reliable deployment on serverless and auto-sleeping cloud environments.
- **File Upload Placeholder:** The ticket creation UI includes an attachment field mock; actual cloud object storage (e.g., S3) was deprioritized in favor of core business functionality.

---

## 5. AI Integration Approach & Limitations

- **Grounding & Guardrails:** Draft generation dynamically injects relevant BookLeaf policy rules, enforces royalty calculation boundaries, forbids claiming unexecuted actions, and bounds context (15 recent messages / 12,000 characters).
- **Override Tracking:** Database flags (`category_manually_overridden`, `priority_manually_overridden`) guarantee that staff triage decisions are never overwritten by subsequent AI results.
- **Production vs. Fallback Status:** Google Gemini (`gemini-3.5-flash-lite`) is verified and active in production. OpenAI (`gpt-4o-mini`) is implemented and configured as a secondary fallback adapter, but has not been verified in production.
- **Limitations:** Lacks an automated accuracy benchmark against a labelled real-world ticket evaluation set.

---

## 6. Recommended Improvements for Production

1. **Durable Task Queue:** Introduce Redis and BullMQ for persistent background classification and retry handling across server restarts.
2. **Real-Time Transport:** Implement WebSockets or Server-Sent Events (SSE) for instant ticket conversation and queue updates.
3. **Cloud Asset Storage:** Integrate AWS S3 or Google Cloud Storage with presigned URLs for file attachments.
4. **Vector Knowledge Base:** Adopt pgvector or a managed vector database for semantic search across expanding company policy documentation.
5. **Observability & Guardrails:** Deploy OpenTelemetry tracing, LLM token-cost tracking dashboards, and automated prompt evaluation suites.

