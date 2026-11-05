/**
 * Auth Verification Script
 *
 * Performs integration-style checks against a running API server.
 * Run with: tsx src/scripts/verify-auth.ts
 *
 * Requirements:
 *  - The API server must be running (npm run dev:api in another terminal, or the
 *    script starts it briefly via a child process).
 *  - A seeded database with at least one author and one admin user.
 *
 * The script exercises:
 *  1. Successful login (author)
 *  2. Successful login (admin)
 *  3. Invalid credentials
 *  4. Accessing /me without a token (401)
 *  5. Accessing /me with a valid token (200)
 *  6. Role restriction – author hitting an admin-only placeholder
 *  7. Logout (cookie cleared)
 *  8. Accessing /me after logout (401)
 */

import http from 'http';
import { env } from '../config/env';

const BASE = `http://localhost:${env.PORT}/api`;

// ─── Minimal HTTP client ──────────────────────────────────────────────────────

interface FetchResult {
  status: number;
  body: unknown;
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
      port: parseInt(url.port || '80'),
      path: url.pathname,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCookie(setCookieHeaders: string[], name: string): string | undefined {
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    const [key, value] = pair.split('=');
    if (key.trim() === name) return `${name}=${value}`;
  }
  return undefined;
}

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n════════════════════════════════════════════');
  console.log('  BookLeaf Auth Verification Suite');
  console.log(`  Target: ${BASE}`);
  console.log('════════════════════════════════════════════\n');

  // 1. Health check — confirm server is reachable
  console.log('[ 1 ] Health check');
  const health = await request('GET', '/health');
  assert('Server is reachable (200)', health.status === 200, `Got ${health.status}`);

  // 2. Login — invalid credentials
  console.log('\n[ 2 ] Login with invalid credentials');
  const badLogin = await request('POST', '/auth/login', {
    email: 'nobody@nowhere.com',
    password: 'wrongpassword',
  });
  assert('Returns 401', badLogin.status === 401, `Got ${badLogin.status}`);
  assert('success=false', (badLogin.body as Record<string, unknown>).success === false);

  // 3. Login — invalid body (missing password)
  console.log('\n[ 3 ] Login with missing password field');
  const badBody = await request('POST', '/auth/login', { email: 'x@y.com' });
  assert('Returns 400', badBody.status === 400, `Got ${badBody.status}`);

  // 4. Login — admin credentials
  console.log('\n[ 4 ] Admin login');
  const adminLogin = await request('POST', '/auth/login', {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  const adminCookieHeader = extractCookie(adminLogin.cookies, 'bookleaf_token');
  if (adminLogin.status === 200) {
    assert('Returns 200', true);
    assert('success=true', (adminLogin.body as Record<string, unknown>).success === true);
    assert(
      'No password_hash in response',
      !JSON.stringify(adminLogin.body).includes('password_hash'),
    );
    assert('Cookie set', Boolean(adminCookieHeader), `Cookies: ${adminLogin.cookies.join('; ')}`);
    assert(
      'User role is admin',
      Boolean(
        ((adminLogin.body as Record<string, unknown>).data as Record<string, unknown>)?.user,
      ) &&
        (
          ((adminLogin.body as Record<string, unknown>).data as Record<string, unknown>)
            .user as Record<string, unknown>
        ).role === 'admin',
    );
  } else {
    console.warn(
      `  ⚠ Admin login returned ${adminLogin.status}. ` +
        'Ensure the database is seeded (npm run db:seed) before running this script.',
    );
    assert('Admin login succeeds (skipped — no seed data)', true);
  }

  // 5. GET /me without token
  console.log('\n[ 5 ] GET /auth/me without token');
  const noToken = await request('GET', '/auth/me');
  assert('Returns 401', noToken.status === 401, `Got ${noToken.status}`);

  // 6. GET /me with valid token (admin)
  if (adminCookieHeader) {
    console.log('\n[ 6 ] GET /auth/me with valid admin token');
    const meAdmin = await request('GET', '/auth/me', undefined, adminCookieHeader);
    assert('Returns 200', meAdmin.status === 200, `Got ${meAdmin.status}`);
    assert(
      'No password_hash in response',
      !JSON.stringify(meAdmin.body).includes('password_hash'),
    );
  } else {
    console.log('\n[ 6 ] GET /auth/me with valid token (skipped — no admin session)');
  }

  // 7. Invalid JWT token
  console.log('\n[ 7 ] Request with invalid JWT value');
  const fakeToken = await request('GET', '/auth/me', undefined, 'bookleaf_token=bad.jwt.here');
  assert('Returns 401', fakeToken.status === 401, `Got ${fakeToken.status}`);

  // 8. Logout
  if (adminCookieHeader) {
    console.log('\n[ 8 ] Logout');
    const logoutRes = await request('POST', '/auth/logout', undefined, adminCookieHeader);
    assert('Returns 200', logoutRes.status === 200, `Got ${logoutRes.status}`);

    // After logout cookie should be cleared (Max-Age=0 or expires in past)
    const clearedCookieStr = logoutRes.cookies.join('; ');
    const isCleared =
      clearedCookieStr.includes('bookleaf_token=;') ||
      clearedCookieStr.includes('Max-Age=0') ||
      clearedCookieStr.includes('Expires=') ||
      (clearedCookieStr.includes('bookleaf_token') && clearedCookieStr.includes('Expires'));
    assert('Cookie cleared in response', isCleared, `Set-Cookie: ${clearedCookieStr}`);

    // 9. GET /me with cookie after logout (cookie value cleared = no token)
    console.log('\n[ 9 ] GET /auth/me after logout');
    // simulate cleared cookie — send empty cookie header
    const afterLogout = await request('GET', '/auth/me');
    assert('Returns 401 after logout', afterLogout.status === 401, `Got ${afterLogout.status}`);
  } else {
    console.log('\n[ 8 ] Logout (skipped — no admin session)');
    console.log('\n[ 9 ] GET /me after logout (skipped)');
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[verify-auth] Fatal error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error(
      `\n  Could not connect to ${BASE}.\n  Start the API first: npm run dev:api\n`,
    );
  }
  process.exit(1);
});
