/**
 * Ticket Management API Verification Script
 *
 * Performs comprehensive integration-style checks against a running API server.
 * Run with: tsx src/scripts/verify-tickets.ts
 */

import http from 'http';
import { env } from '../config/env';

const BASE = `http://localhost:${env.PORT}/api`;

interface FetchResult {
  status: number;
  body: any;
  cookies: string[];
}

function request(
  method: string,
  path: string,
  body?: unknown,
  cookieHeader?: string,
): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const url = new URL(BASE + path);

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: parseInt(url.port || '80', 10),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload).toString() } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        const setCookieHeaders = res.headers['set-cookie'] ?? [];
        resolve({ status: res.statusCode ?? 0, body: parsed, cookies: setCookieHeaders });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function extractCookie(cookieHeaders: string[], name: string): string | null {
  for (const header of cookieHeaders) {
    const parts = header.split(';')[0]?.trim();
    if (parts && parts.startsWith(`${name}=`)) {
      return parts;
    }
  }
  return null;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n============================================================');
  console.log('  BookLeaf — Ticket Management API Integration Verification');
  console.log('============================================================\n');

  // Check server health
  try {
    const health = await request('GET', '/health');
    if (health.status !== 200) {
      console.error('API server is not responding properly. Start it with npm run dev:api');
      process.exit(1);
    }
  } catch (err) {
    console.error('Cannot connect to API server at', BASE);
    console.error('Please ensure the backend is running: npm run dev:api');
    process.exit(1);
  }

  // 1. Unauthenticated ticket access
  console.log('1. Authentication & Authorization Enforcement');
  const unauthRes = await request('GET', '/tickets');
  assert(unauthRes.status === 401, 'Author endpoints reject unauthenticated requests with 401');

  const adminUnauth = await request('GET', '/admin/tickets');
  assert(adminUnauth.status === 401, 'Admin endpoints reject unauthenticated requests with 401');

  // 2. Login author and admin
  console.log('\n2. User Authentication');
  const authorLogin = await request('POST', '/auth/login', {
    email: 'author1@bookleaf.pub',
    password: 'password123',
  });
  assert(authorLogin.status === 200, 'Author 1 login successful');
  const authorCookie = extractCookie(authorLogin.cookies, 'bookleaf_token');
  assert(Boolean(authorCookie), 'Author receives JWT cookie');

  const author2Login = await request('POST', '/auth/login', {
    email: 'author2@bookleaf.pub',
    password: 'password123',
  });
  const author2Cookie = extractCookie(author2Login.cookies, 'bookleaf_token');

  const adminLogin = await request('POST', '/auth/login', {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  assert(adminLogin.status === 200, 'Admin login successful');
  const adminCookie = extractCookie(adminLogin.cookies, 'bookleaf_token');
  assert(Boolean(adminCookie), 'Admin receives JWT cookie');

  // 3. Author trying to access admin endpoint
  console.log('\n3. Role-Based Route Protection');
  const forbiddenAdminAccess = await request('GET', '/admin/tickets', undefined, authorCookie!);
  assert(forbiddenAdminAccess.status === 403, 'Author cannot access admin endpoints (403 Forbidden)');

  const forbiddenAuthorAccess = await request('GET', '/tickets', undefined, adminCookie!);
  assert(forbiddenAuthorAccess.status === 403, 'Admin cannot access author ticket endpoints (403 Forbidden)');

  // 4. Ticket Creation
  console.log('\n4. Author Ticket Creation');
  const createRes = await request(
    'POST',
    '/tickets',
    {
      subject: 'Royalty discrepancy for October',
      description: 'The payout statement does not match my copies sold count.',
    },
    authorCookie!,
  );
  assert(createRes.status === 201, 'Author creates general ticket (201 Created)');
  assert(createRes.body.data?.ticket?.ticket_number?.startsWith('TICK-'), 'Generated sequential ticket_number');
  assert(createRes.body.data?.ticket?.status === 'Open', 'Initial status set to Open');
  assert(createRes.body.data?.ticket?.ai_classification_status === 'pending', 'Initial AI classification is pending');
  const ticketId = createRes.body.data?.ticket?.id;

  // 5. Author list tickets with pagination
  console.log('\n5. Author Ticket Listing & Pagination');
  const listRes = await request('GET', '/tickets?page=1&limit=5', undefined, authorCookie!);
  assert(listRes.status === 200, 'Author retrieves own tickets (200 OK)');
  assert(Array.isArray(listRes.body.data?.tickets), 'Tickets returned in array');
  assert(listRes.body.data?.pagination?.page === 1, 'Pagination page matches metadata');
  assert(listRes.body.data?.pagination?.total >= 1, 'Pagination total reflects created ticket');

  // 6. Cross-author isolation
  console.log('\n6. Cross-Author Ticket Isolation');
  if (author2Cookie) {
    const crossAuthorGet = await request('GET', `/tickets/${ticketId}`, undefined, author2Cookie);
    assert(crossAuthorGet.status === 404, 'Author 2 cannot access Author 1 ticket (404 Not Found)');
  }

  // 7. Author ticket detail & public messages
  console.log('\n7. Author Ticket Details & Messages');
  const getTicketRes = await request('GET', `/tickets/${ticketId}`, undefined, authorCookie!);
  assert(getTicketRes.status === 200, 'Author retrieves own ticket details');
  assert(getTicketRes.body.data?.ticket?.internalNotes === undefined, 'Internal notes strictly hidden from author response');

  const addAuthorMsg = await request(
    'POST',
    `/tickets/${ticketId}/messages`,
    { message: 'Here is an update on my question.' },
    authorCookie!,
  );
  assert(addAuthorMsg.status === 201, 'Author adds public message to ticket');

  // 8. Admin ticket management
  console.log('\n8. Admin Ticket View, Messages & Internal Notes');
  const adminList = await request('GET', '/admin/tickets?page=1&limit=10', undefined, adminCookie!);
  assert(adminList.status === 200, 'Admin retrieves all tickets with pagination');

  const adminGetTicket = await request('GET', `/admin/tickets/${ticketId}`, undefined, adminCookie!);
  assert(adminGetTicket.status === 200, 'Admin retrieves ticket details');
  assert(Array.isArray(adminGetTicket.body.data?.ticket?.internalNotes), 'Internal notes field visible to admin');

  // Admin adds internal note
  const addNote = await request(
    'POST',
    `/admin/tickets/${ticketId}/notes`,
    { note: 'Investigating ledger against bank transactions.' },
    adminCookie!,
  );
  assert(addNote.status === 201, 'Admin adds private internal note');

  // Admin adds public message
  const addAdminMsg = await request(
    'POST',
    `/admin/tickets/${ticketId}/messages`,
    { message: 'We have received your inquiry and are cross-checking with accounting.' },
    adminCookie!,
  );
  assert(addAdminMsg.status === 201, 'Admin adds public reply message');

  // Author verifies notes are NOT leaked
  const authorCheckNotes = await request('GET', `/tickets/${ticketId}`, undefined, authorCookie!);
  assert(authorCheckNotes.body.data?.ticket?.internalNotes === undefined, 'Author STILL cannot see internal notes after note creation');
  const authorMsgs = authorCheckNotes.body.data?.ticket?.messages ?? [];
  assert(authorMsgs.some((m: any) => m.message.includes('cross-checking')), 'Author can see admin public message');

  // 9. Admin updates ticket
  console.log('\n9. Admin Ticket Status & Assignment Updates');
  const adminUser = adminLogin.body.data?.user;
  const updateRes = await request(
    'PATCH',
    `/admin/tickets/${ticketId}`,
    {
      status: 'In Progress',
      priority: 'High',
      category: 'Royalty & Payments',
      assigned_to: adminUser?.id,
    },
    adminCookie!,
  );
  assert(updateRes.status === 200, 'Admin updates ticket fields & assigns to admin');
  assert(updateRes.body.data?.ticket?.status === 'In Progress', 'Ticket status updated to In Progress');
  assert(updateRes.body.data?.ticket?.priority === 'High', 'Ticket priority updated to High');

  // Test assigning to author user (should fail)
  const authorUser = authorLogin.body.data?.user;
  const invalidAssign = await request(
    'PATCH',
    `/admin/tickets/${ticketId}`,
    { assigned_to: authorUser?.id },
    adminCookie!,
  );
  assert(invalidAssign.status === 400, 'Assigning ticket to non-admin rejected with 400');

  console.log('\n------------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error running tests:', err);
  process.exit(1);
});

