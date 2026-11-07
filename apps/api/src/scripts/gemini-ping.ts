/**
 * Gemini Connectivity Diagnostic
 *
 * Makes a single minimal request to the Gemini API with NO server-side
 * timeout or AbortController, so we can see the raw result (success or error)
 * without our own deadline competing with Google's.
 *
 * Run from the repo root:
 *   npx tsx apps/api/src/scripts/gemini-ping.ts
 *
 * Reads from your .env (repo root or apps/api/.env).
 * Never prints the API key or any other sensitive value.
 */

import path from 'path';
import dotenv from 'dotenv';

// Load .env files the same way env.ts does
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

import { GoogleGenAI } from '@google/genai';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env['GEMINI_API_KEY'];
const MODEL   = process.env['GEMINI_MODEL'] ?? 'gemini-3.8-flash';
const PROMPT  = 'Reply with OK.';

// ─── Guard ────────────────────────────────────────────────────────────────────

if (!API_KEY) {
  console.error('[gemini-ping] ERROR: GEMINI_API_KEY is not set in environment.');
  console.error('[gemini-ping] Make sure your .env file contains GEMINI_API_KEY=<your-key>');
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('[gemini-ping] Starting diagnostic...');
console.log(`[gemini-ping] Model : ${MODEL}`);
console.log(`[gemini-ping] Prompt: "${PROMPT}"`);
console.log('[gemini-ping] No server-side timeout — waiting for Google to respond...\n');

const client = new GoogleGenAI({ apiKey: API_KEY });

void (async () => {
  const startMs = Date.now();

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: PROMPT,
    });

    const elapsedMs = Date.now() - startMs;
    const text = response.text ?? '(empty)';

    console.log('[gemini-ping] ✅ SUCCESS');
    console.log(`[gemini-ping] Elapsed  : ${elapsedMs}ms`);
    console.log(`[gemini-ping] Response : ${text.trim()}`);
    process.exit(0);
  } catch (err: unknown) {
    const elapsedMs = Date.now() - startMs;

    console.error('[gemini-ping] ❌ FAILED');
    console.error(`[gemini-ping] Elapsed : ${elapsedMs}ms`);

    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;

      // HTTP status code
      if (typeof e['status'] === 'number') {
        console.error(`[gemini-ping] HTTP status : ${e['status']}`);
      }

      // gRPC / provider error code (e.g. DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED)
      if (e['code'] !== undefined) {
        console.error(`[gemini-ping] Error code  : ${String(e['code'])}`);
      }

      // Human-readable message — strip any embedded API key patterns
      const rawMsg =
        typeof e['message'] === 'string'
          ? e['message']
          : typeof (err as Error).message === 'string'
            ? (err as Error).message
            : String(err);

      const safeMsg = rawMsg
        .replace(/(key=)[^\s&"']+/gi, '$1[REDACTED]')
        .replace(/(api[_-]?key[:=]\s*["']?)[^\s&"',]+/gi, '$1[REDACTED]')
        .replace(/(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
        .replace(/\b(AQ\.[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,})\b/g, '[REDACTED_API_KEY]');

      console.error(`[gemini-ping] Message     : ${safeMsg}`);

      // If there is a nested error body (common in @google/genai ApiError)
      if (e['errorDetails'] !== undefined) {
        try {
          console.error(`[gemini-ping] Error details: ${JSON.stringify(e['errorDetails'], null, 2)}`);
        } catch {
          // ignore serialization errors
        }
      }
    } else {
      console.error(`[gemini-ping] Raw error: ${String(err)}`);
    }

    process.exit(1);
  }
})();
