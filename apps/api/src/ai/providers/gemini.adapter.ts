/**
 * Gemini Provider Adapter
 *
 * Wraps @google/genai and maps its responses / errors into the common
 * AIProviderError type.  Business code never imports this file directly.
 */

import { GoogleGenAI } from '@google/genai';
import {
  AIProviderError,
  ClassificationResponse,
  ClassifyTicketInput,
  IAIProvider,
  classificationResponseSchema,
} from '../types';

// ─── Classification Prompt ────────────────────────────────────────────────────

function buildClassificationPrompt(input: ClassifyTicketInput): string {
  return `You are an expert customer support ticket classification system for BookLeaf Publishing, a book self-publishing platform.

Classify the support ticket below into the most appropriate category and priority level.
Respond with ONLY a valid, raw JSON object. Do not include markdown code blocks, explanation, or any other text.

ALLOWED CATEGORIES (pick exactly one):
- "Royalty & Payments": Inquiries or issues regarding author earnings, payment schedules, overdue payouts, calculation formula (80% net profit), minimum ₹1,000 threshold, or bank details.
- "ISBN & Metadata Issues": Inquiries or problems regarding ISBN assignment, barcodes, publisher imprint, or book metadata (title, subtitle, author bio, description) on retail channels.
- "Printing & Quality": Physical book defects, paper quality, binding flaws, cover trim/alignment errors, blurry text or images, or defective author copies.
- "Distribution & Availability": Retail platform availability (Amazon, Flipkart, BookLeaf Store), out-of-stock or "Currently Unavailable" status, buy buttons, or platform stock syncing.
- "Book Status & Production Updates": Inquiries about manuscript stages (typesetting, editing, cover design proofs, proofreading), printing progress, or publication release timelines.
- "General Inquiry": General questions regarding publishing packages, platform navigation, broad publishing guidelines, or casual questions not covered by specific operational workflows.

ALLOWED PRIORITIES (pick exactly one):
- "Critical": Complete blockers causing severe financial or legal harm, total platform outages, or a launch failure that prevents authors/readers from accessing the published work.
- "High": Significant operational problems requiring urgent human attention. ISBN errors (duplicate, wrong book linked, or platform/physical-copy mismatch) are HIGH priority per BookLeaf policy. Other examples include royalty payouts genuinely overdue beyond the 45-day quarterly cycle, a batch of author copies with major defects, or a published book unavailable on a sales platform.
- "Medium": Standard operational support requests, routine status inquiries, routine royalty calculation questions where payment is not overdue, and workflow adjustments such as author-bio or description updates. Do not assume a general production turnaround window that is not stated in the BookLeaf Knowledge Base. NOTE: A self-service workaround is NOT required for Medium priority.
- "Low": General informational inquiries, publishing advice, feedback, or non-blocking questions (e.g., questions about future packages, royalty rules for future books, general platform how-tos).

Ticket subject: ${input.subject}
Ticket description: ${input.description}

Respond with exactly this JSON format:
{"category": "<one of the allowed categories>", "priority": "<one of the allowed priorities>"}`;
}

// ─── Sanitization & Error Extraction Helpers ─────────────────────────────────

/**
 * Sanitizes messages by removing API keys and ticket details to prevent leakage.
 */
export function sanitizeLogMessage(message: string): string {
  return message
    .replace(/(key=)[^\s&"']+/gi, '$1[REDACTED]')
    .replace(/(api[_-]?key[:=]\s*["']?)[^\s&"',]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
    .replace(/\b(AQ\.[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,})\b/g, '[REDACTED_API_KEY]')
    .replace(/Ticket subject:[\s\S]*?(?=\n|"|\\n|$)/gi, 'Ticket subject: [REDACTED]')
    .replace(/Ticket description:[\s\S]*?(?=\n|"|\\n|$)/gi, 'Ticket description: [REDACTED]');
}

export interface GeminiErrorInfo {
  status?: number;
  code?: string | number;
  message: string;
}

/**
 * Extracts HTTP status, provider error code, and sanitized message from raw errors.
 * Supports @google/genai ApiError, embedded JSON error bodies, and standard Error objects.
 */
export function extractGeminiErrorInfo(raw: unknown): GeminiErrorInfo {
  let status: number | undefined;
  let code: string | number | undefined;
  let message = '';

  if (raw instanceof Error) {
    message = raw.message;
  } else if (
    raw &&
    typeof raw === 'object' &&
    typeof (raw as Record<string, unknown>)['message'] === 'string'
  ) {
    message = (raw as Record<string, unknown>)['message'] as string;
  } else {
    message = String(raw);
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj['status'] === 'number') {
      status = obj['status'];
    }
    if (typeof obj['code'] === 'string' || typeof obj['code'] === 'number') {
      code = obj['code'];
    }

    // Handle nested error objects: { error: { code, message, status } }
    if (obj['error'] && typeof obj['error'] === 'object') {
      const errObj = obj['error'] as Record<string, unknown>;
      if (status === undefined && typeof errObj['code'] === 'number') {
        status = errObj['code'];
      }
      if (
        code === undefined &&
        (typeof errObj['status'] === 'string' ||
          typeof errObj['code'] === 'string' ||
          typeof errObj['code'] === 'number')
      ) {
        code = (errObj['status'] as string) || (errObj['code'] as string | number);
      }
      if (typeof errObj['message'] === 'string') {
        message = errObj['message'];
      }
    }
  }

  // Parse embedded JSON error details if present (common in @google/genai ApiError: "got status: 400. {...}")
  const jsonMatch = message.match(/\{[\s\S]*"error"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error) {
        if (status === undefined && typeof parsed.error.code === 'number') {
          status = parsed.error.code;
        }
        if (code === undefined) {
          code = parsed.error.status ?? parsed.error.code;
        }
        if (typeof parsed.error.message === 'string' && parsed.error.message.trim()) {
          message = parsed.error.message;
        }
      }
    } catch {
      // Ignore JSON parse errors in message extraction
    }
  }

  // Fallback status extraction from message string (e.g. "HTTP 401" or "got status: 404")
  if (status === undefined) {
    const statusMatch = message.match(/\b(?:status:?\s*|HTTP\s+)?([45]\d\d)\b/i);
    if (statusMatch && statusMatch[1]) {
      status = parseInt(statusMatch[1], 10);
    }
  }

  return {
    status,
    code,
    message: sanitizeLogMessage(message),
  };
}

// ─── Error Classification Helper ──────────────────────────────────────────────

/**
 * Maps a raw Gemini SDK error to an AIProviderError with the correct kind,
 * extracting HTTP status and provider error code where available.
 *
 * HTTP 401/403/404 → fatal (bad key / billing / model not found)
 * HTTP 429         → retryable (rate limit / quota)
 * HTTP 5xx         → retryable (temporary outage)
 * Timeout / Abort  → retryable
 * Everything else  → retryable as a safe default
 */
export function classifyGeminiError(raw: unknown): AIProviderError {
  const { status, code, message } = extractGeminiErrorInfo(raw);
  const lower = message.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    code === 'UNAUTHENTICATED' ||
    code === 'PERMISSION_DENIED' ||
    code === 'NOT_FOUND' ||
    lower.includes('api key') ||
    lower.includes('invalid_api_key') ||
    lower.includes('permission') ||
    lower.includes('unauthorized') ||
    lower.includes('billing') ||
    lower.includes('not found') ||
    lower.includes('403') ||
    lower.includes('401')
  ) {
    return new AIProviderError(
      'gemini',
      'fatal',
      `Gemini auth/billing error: ${message}`,
      raw,
      status,
      code,
    );
  }

  if (
    status === 429 ||
    code === 'RESOURCE_EXHAUSTED' ||
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted')
  ) {
    return new AIProviderError(
      'gemini',
      'retryable',
      `Gemini rate limit: ${message}`,
      raw,
      status,
      code,
    );
  }

  if (
    status === 408 ||
    status === 504 ||
    code === 'DEADLINE_EXCEEDED' ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('deadline_exceeded') ||
    lower.includes('aborterror') ||
    lower.includes('aborted') ||
    lower.includes('econnreset') ||
    lower.includes('requestabortederror') ||
    lower.includes('requesttimeouterror')
  ) {
    return new AIProviderError(
      'gemini',
      'retryable',
      `Gemini timeout: ${message}`,
      raw,
      status,
      code,
    );
  }

  if (
    status === 502 ||
    status === 503 ||
    status === 500 ||
    code === 'UNAVAILABLE' ||
    code === 'INTERNAL' ||
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('overloaded') ||
    lower.includes('unavailable')
  ) {
    return new AIProviderError(
      'gemini',
      'retryable',
      `Gemini unavailable: ${message}`,
      raw,
      status,
      code,
    );
  }

  return new AIProviderError(
    'gemini',
    'retryable',
    `Gemini error: ${message}`,
    raw,
    status,
    code,
  );
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class GeminiAdapter implements IAIProvider {
  readonly name = 'gemini' as const;

  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string, _timeoutMs = 45_000, client?: GoogleGenAI) {
    this.client =
      client ??
      new GoogleGenAI({
        apiKey,
      });
    this.model = model;
  }

  async classifyTicket(input: ClassifyTicketInput): Promise<ClassificationResponse> {
    const prompt = buildClassificationPrompt(input);

    let rawText: string | undefined;
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0,
        },
      });

      rawText = response.text;
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw classifyGeminiError(err);
    }

    // Validate structured output
    return this.parseAndValidate(rawText);
  }

  async generateText(
    prompt: string,
    options?: import('../types').TextGenerationOptions,
  ): Promise<string> {
    try {
      const maxOutputTokens = options?.maxTokens ?? 2048;
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction: options?.systemInstruction,
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens,
        },
      });

      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        throw new AIProviderError(
          'gemini',
          'retryable',
          `Gemini generation truncated due to MAX_TOKENS limit (${maxOutputTokens}); incomplete draft rejected.`,
        );
      }

      const text = response.text;
      if (!text || text.trim() === '') {
        throw new AIProviderError('gemini', 'invalid', 'Gemini returned empty text response.');
      }
      return text;
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw classifyGeminiError(err);
    }
  }

  private parseAndValidate(rawText: string | undefined): ClassificationResponse {
    if (!rawText || rawText.trim() === '') {
      throw new AIProviderError('gemini', 'invalid', 'Gemini returned empty response text.');
    }

    let parsed: unknown;
    try {
      // Strip accidental markdown code fences if model ignores responseMimeType
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new AIProviderError(
        'gemini',
        'invalid',
        `Gemini returned non-JSON: ${sanitizeLogMessage(rawText.slice(0, 120))}`,
      );
    }

    const result = classificationResponseSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.errors.map((e) => e.message).join('; ');
      throw new AIProviderError(
        'gemini',
        'invalid',
        `Gemini response failed schema validation: ${issues}`,
      );
    }

    return result.data;
  }
}
