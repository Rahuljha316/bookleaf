# BookLeaf Author Support Portal — API Reference

Comprehensive documentation for the BookLeaf REST API endpoints, request/response contracts, and role-based access rules.

- **Base URL (Production):** `https://bookleaf-api-hzzp.onrender.com/api`
- **Base URL (Local):** `http://localhost:5000/api`
- **Content-Type:** `application/json`

---

## Authentication & Security Overview

- Authentication is managed via JSON Web Tokens (JWT) stored in an **HTTP-only cookie** (`bookleaf_token`).
- In production, cookies are transmitted with `SameSite=None` and `Secure=true` across cross-origin requests between Vercel and Render.
- Frontend HTTP clients must include `credentials: 'include'` (Fetch API) or `withCredentials: true` (Axios).
- Author identity is derived strictly from `req.user.id` on the server; client payloads cannot spoof author IDs.
- Private internal staff notes are strictly isolated and never returned to author callers.

### Standard Response Structure

**Success:**
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description message"
}
```

---

## 1. System Endpoints

### GET `/api/health`
Checks API server availability and runtime environment status.

- **Auth Required:** No
- **Roles:** Public

**Response `200`:**
```json
{
  "status": "ok",
  "message": "BookLeaf Author Support Portal API is running",
  "timestamp": "2026-11-10T12:00:00.000Z",
  "environment": "production"
}
```

---

## 2. Authentication Endpoints

### POST `/api/auth/login`
Authenticates an author or administrator and sets the HTTP-only JWT cookie.

- **Auth Required:** No
- **Roles:** Public

**Request Body:**
```json
{
  "email": "priya.sharma@email.com",
  "password": "author123"
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
      "name": "Priya Sharma",
      "email": "priya.sharma@email.com",
      "phone": "+91 98765 43210",
      "city": "Mumbai",
      "joined_date": "2022-03-15",
      "created_at": "2026-11-06T00:00:00.000Z",
      "updated_at": "2026-11-06T00:00:00.000Z"
    }
  }
}
```

**Errors:**
- `400 Bad Request`: Validation failure (invalid email format or empty password).
- `401 Unauthorized`: Invalid email or password.

---

### POST `/api/auth/logout`
Clears the `bookleaf_token` HTTP-only session cookie.

- **Auth Required:** No (best-effort)
- **Roles:** Public

**Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET `/api/auth/me`
Returns the currently authenticated user's session profile (excluding password hash).

- **Auth Required:** Yes
- **Roles:** `author`, `admin`

**Response `200`:**
```json
{
  "success": true,
  "message": "Authenticated user retrieved",
  "data": {
    "user": {
      "id": 1,
      "author_id": "AUTH001",
      "role": "author",
      "name": "Priya Sharma",
      "email": "priya.sharma@email.com",
      "phone": "+91 98765 43210",
      "city": "Mumbai",
      "joined_date": "2022-03-15",
      "created_at": "2026-11-06T00:00:00.000Z",
      "updated_at": "2026-11-06T00:00:00.000Z"
    }
  }
}
```

**Errors:**
- `401 Unauthorized`: Missing, expired, or invalid JWT cookie.

---

## 3. Author Endpoints

### GET `/api/books`
Lists all books belonging to the authenticated author, including publication status and royalty financial metrics.

- **Auth Required:** Yes
- **Roles:** `author`

**Response `200`:**
```json
{
  "success": true,
  "message": "Books retrieved successfully",
  "data": {
    "books": [
      {
        "id": 1,
        "book_id": "BK001",
        "author_user_id": 1,
        "title": "The Silent Echo",
        "isbn": "978-93-90123-45-6",
        "genre": "Literary Fiction",
        "publication_date": "2022-08-15",
        "status": "Published",
        "mrp": 399.00,
        "author_royalty_per_copy": 59.85,
        "total_copies_sold": 1420,
        "total_royalty_earned": 84987.00,
        "royalty_paid": 65000.00,
        "royalty_pending": 19987.00,
        "last_royalty_payout_date": "2024-03-31",
        "print_partner": "Repro India",
        "available_on": ["Amazon", "Flipkart", "BookLeaf Store"],
        "created_at": "2026-11-06T00:00:00.000Z",
        "updated_at": "2026-11-06T00:00:00.000Z"
      }
    ]
  }
}
```

---

### POST `/api/tickets`
Creates a support ticket for the authenticated author. Triggers asynchronous background AI classification.

- **Auth Required:** Yes
- **Roles:** `author`

**Request Body:**
```json
{
  "subject": "Discrepancy in October royalty statement",
  "description": "My dashboard indicates 1,420 copies sold, but the latest payout statement lists 1,200 copies.",
  "book_id": 1
}
```
*Note: `book_id` is optional. If provided, server verifies that the book belongs to the calling author.*

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
      "book_id": 1,
      "assigned_to": null,
      "subject": "Discrepancy in October royalty statement",
      "description": "My dashboard indicates 1,420 copies sold, but the latest payout statement lists 1,200 copies.",
      "category": "General Inquiry",
      "priority": "Medium",
      "status": "Open",
      "ai_classification_status": "pending",
      "created_at": "2026-11-10T12:00:00.000Z",
      "updated_at": "2026-11-10T12:00:00.000Z"
    }
  }
}
```

**Errors:**
- `400 Bad Request`: Missing subject/description or invalid parameters.
- `403 Forbidden`: Book specified in `book_id` belongs to another author.
- `404 Not Found`: Book specified in `book_id` does not exist.

---

### GET `/api/tickets`
Retrieves paginated tickets belonging exclusively to the authenticated author.

- **Auth Required:** Yes
- **Roles:** `author`

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 10, max: 100)
- `status` (optional: `Open` | `In Progress` | `Resolved` | `Closed`)

**Response `200`:**
```json
{
  "success": true,
  "message": "Tickets retrieved.",
  "data": {
    "tickets": [
      {
        "id": 12,
        "ticket_number": "TICK-1012",
        "subject": "Discrepancy in October royalty statement",
        "status": "Open",
        "priority": "Medium",
        "category": "Royalty & Payments",
        "book": {
          "id": 1,
          "title": "The Silent Echo",
          "book_id": "BK001"
        },
        "assignedAdmin": null,
        "created_at": "2026-11-10T12:00:00.000Z"
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

---

### GET `/api/tickets/:id`
Retrieves ticket details and public message history. Returns `404` if the ticket belongs to another author (preventing ID enumeration). Internal staff notes are omitted.

- **Auth Required:** Yes
- **Roles:** `author`

**Response `200`:**
```json
{
  "success": true,
  "message": "Ticket retrieved.",
  "data": {
    "ticket": {
      "id": 12,
      "ticket_number": "TICK-1012",
      "subject": "Discrepancy in October royalty statement",
      "description": "My dashboard indicates 1,420 copies sold...",
      "status": "Open",
      "priority": "Medium",
      "category": "Royalty & Payments",
      "book": {
        "id": 1,
        "title": "The Silent Echo",
        "book_id": "BK001",
        "isbn": "978-93-90123-45-6"
      },
      "messages": [
        {
          "id": 1,
          "ticket_id": 12,
          "message": "We have received your inquiry and are reviewing the ledger.",
          "is_ai_assisted": true,
          "created_at": "2026-11-10T12:15:00.000Z",
          "sender": {
            "id": 2,
            "name": "BookLeaf Admin",
            "role": "admin"
          }
        }
      ]
    }
  }
}
```

---

### POST `/api/tickets/:id/messages`
Adds an author reply to the public ticket conversation thread.

- **Auth Required:** Yes
- **Roles:** `author`

**Request Body:**
```json
{
  "message": "Thank you for looking into this. Here is the transaction slip reference."
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Message posted successfully.",
  "data": {
    "message": {
      "id": 2,
      "ticket_id": 12,
      "user_id": 1,
      "message": "Thank you for looking into this. Here is the transaction slip reference.",
      "is_ai_assisted": false,
      "created_at": "2026-11-10T12:30:00.000Z"
    }
  }
}
```

---

## 4. Administrator Endpoints

### GET `/api/admin/admins`
Lists administrative staff users for ticket assignment dropdowns and filtering.

- **Auth Required:** Yes
- **Roles:** `admin`

**Response `200`:**
```json
{
  "success": true,
  "message": "Admin users retrieved successfully",
  "data": {
    "admins": [
      {
        "id": 2,
        "name": "BookLeaf Admin",
        "email": "admin@bookleaf.pub"
      }
    ]
  }
}
```

---

### GET `/api/admin/tickets`
Lists all tickets across authors with filtering, sorting, and pagination.

- **Auth Required:** Yes
- **Roles:** `admin`

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 10, max: 100)
- `status` (`Open` | `In Progress` | `Resolved` | `Closed`)
- `priority` (`Critical` | `High` | `Medium` | `Low`)
- `category` (`Royalty & Payments` | `ISBN & Metadata Issues` | `Printing & Quality` | `Distribution & Availability` | `Book Status & Production Updates` | `General Inquiry`)
- `assigned_to` (integer admin user ID)
- `created_from` (inclusive start date: `YYYY-MM-DD`)
- `created_to` (inclusive end date: `YYYY-MM-DD`)

**Default Ordering:** Unresolved tickets appear first, ranked by priority (Critical → High → Medium → Low), then by age (oldest first).

---

### GET `/api/admin/tickets/:id`
Retrieves complete ticket details including author info, linked book data, public messages, and private staff internal notes.

- **Auth Required:** Yes
- **Roles:** `admin`

**Response `200`:**
```json
{
  "success": true,
  "message": "Ticket retrieved.",
  "data": {
    "ticket": {
      "id": 12,
      "ticket_number": "TICK-1012",
      "subject": "Discrepancy in October royalty statement",
      "description": "...",
      "category": "Royalty & Payments",
      "priority": "High",
      "status": "In Progress",
      "ai_classification_status": "completed",
      "ai_suggested_category": "Royalty & Payments",
      "ai_suggested_priority": "High",
      "category_manually_overridden": false,
      "priority_manually_overridden": false,
      "author": {
        "id": 1,
        "name": "Priya Sharma",
        "email": "priya.sharma@email.com",
        "phone": "+91 98765 43210"
      },
      "assignedAdmin": {
        "id": 2,
        "name": "BookLeaf Admin"
      },
      "messages": [ ... ],
      "internalNotes": [
        {
          "id": 1,
          "ticket_id": 12,
          "note": "Checked with Accounts: Remainder was disbursed in batch 4B.",
          "created_at": "2026-11-10T12:20:00.000Z",
          "admin": {
            "id": 2,
            "name": "BookLeaf Admin"
          }
        }
      ]
    }
  }
}
```

---

### PATCH `/api/admin/tickets/:id`
Updates ticket status, category, priority, or assignee. Sets manual override flags if category or priority are changed manually by staff.

- **Auth Required:** Yes
- **Roles:** `admin`

**Request Body:**
```json
{
  "status": "In Progress",
  "category": "Royalty & Payments",
  "priority": "High",
  "assigned_to": 2
}
```

**Errors:**
- `400 Bad Request`: `assigned_to` does not correspond to an admin user account.
- `404 Not Found`: Ticket not found.

---

### POST `/api/admin/tickets/:id/messages`
Sends a public response message from support staff to the author.

- **Auth Required:** Yes
- **Roles:** `admin`

**Request Body:**
```json
{
  "message": "Hello Priya, we reviewed your statement and the adjustment has been credited."
}
```

---

### POST `/api/admin/tickets/:id/notes`
Creates a private internal note visible strictly to administrators. These notes are excluded from AI contexts and author views.

- **Auth Required:** Yes
- **Roles:** `admin`

**Request Body:**
```json
{
  "note": "Cross-referenced bank UTR with finance ledger. Confirmed resolved."
}
```

---

### POST `/api/admin/tickets/:id/ai-draft`
Generates a Knowledge-Base-grounded draft reply for administrative review. Does **not** send or save the message automatically.

- **Auth Required:** Yes
- **Roles:** `admin`

**Response `200`:**
```json
{
  "success": true,
  "message": "AI draft response generated.",
  "data": {
    "draft": "Dear Priya,\n\nThank you for reaching out regarding your royalty statement for 'The Silent Echo'...\n\nWarm regards,\nBookLeaf Publishing Support",
    "provider": "gemini",
    "suggested_category": "Royalty & Payments",
    "suggested_priority": "High"
  }
}
```

**Errors:**
- `503 Service Unavailable`: All configured AI providers failed or are unavailable.

