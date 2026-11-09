# BookLeaf Assignment — Approach

## Priorities

I prioritised the core author-to-support workflow and the AI-assisted operations workflow. Authors can sign in, view their own book and royalty information, submit book-specific or account-level tickets, and follow public responses. Admins can triage tickets across authors, change status and assignment, add private notes, override AI classifications, and review/edit AI-drafted replies before sending them. The supplied author and book dataset is used to seed the application.

## Architecture and trade-offs

I chose a React + TypeScript + Vite frontend, an Express + TypeScript REST API, PostgreSQL, Sequelize, and shared TypeScript contracts. A single frontend serves both roles through protected routes, while backend authentication and role checks enforce access. A relational database fits the supplied author/book/ticket relationships and preserves financial amounts as decimal values. Sequelize and a modular controller/service structure provide a straightforward implementation without introducing microservices or unnecessary infrastructure.

Ticket creation commits before AI classification is triggered asynchronously. This keeps ticket submission available if an LLM provider is unavailable. Authors and admins share a public message thread, while internal notes use a separate model and are excluded from author responses and AI reply context.

## AI integration and cost management

The backend uses environment-configured Gemini and OpenAI adapters behind a provider manager. API keys remain server-side. Classification suggests one of the six assignment categories and four priority levels; administrators can override either field, and persisted override flags prevent later AI results from replacing those decisions. AI reply drafts use relevant sections of the BookLeaf Knowledge Base and are never sent automatically. Admins review and edit drafts before sending. If AI is unavailable, tickets can still be created and admins can respond manually.

To control prompt size, Knowledge Base retrieval selects relevant policy sections. Reply generation includes at most the 15 most recent public messages, with an aggregate conversation limit of 12,000 characters and a per-message limit of 3,000 characters. The original ticket description and linked-book facts are retained. The Knowledge Base uses only policies and timelines stated in the assignment PDF; it does not assume quarter-end calendar dates that the PDF does not provide.

## Evolution toward production

With more time, I would add measured AI evaluation against a labelled support-ticket set, operational monitoring for provider latency/failures and usage, stronger deployment automation, and a durable background-job queue for high-volume classification. I would also add integration and end-to-end tests against a disposable PostgreSQL database and validate the deployed author/admin workflows before sharing the live demo.
