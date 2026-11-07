/**
 * OpenAI Provider Adapter
 *
 * Wraps the official `openai` SDK and maps its responses / errors into the
 * common AIProviderError type.  Business code never imports this file directly.
 */

import OpenAI from 'openai';
import {
  AIProviderError,
  ClassificationResponse,
  ClassifyTicketInput,
  IAIProvider,
  classificationResponseSchema,
} from '../types';

// ─── Classification Prompt ────────────────────────────────────────────────────

function buildClassificationPrompt(input: ClassifyTicketInput): string {
  return `You are a support ticket classification system for a book publishing platform.

Classify the support ticket below and respond with ONLY a valid JSON object.
Do not include any explanation, markdown, or code fences — just the raw JSON.

Allowed categories (pick exactly one):
- "Royalty & Payments"
- "ISBN & Metadata Issues"
- "Printing & Quality"
- "Distribution & Availability"
- "Book Status & Production Updates"
- "General Inquiry"

Allowed priorities (pick exactly one):
- "Critical"  (service is completely broken or revenue is blocked)
- "High"      (significant issue affecting the author's work)
- "Medium"    (moderate issue with a workaround available)
- "Low"       (minor or informational)

Ticket subject: ${input.subject}
Ticket description: ${input.description}

Respond with exactly this JSON structure:
{"category": "<one of the allowed categories>", "priority": "<one of the allowed priorities>"}`;
}

// ─── Error Classification Helper ──────────────────────────────────────────────

/**
 * Maps raw OpenAI SDK errors to AIProviderError with the correct kind.
 * AuthenticationError (401) → fatal
 * PermissionDeniedError (403) → fatal
 * RateLimitError (429) → retryable
 * InternalServerError (5xx) → retryable
 * APIConnectionTimeoutError → retryable
 * Everything else → retryable as a safe default
 */
function classifyOpenAIError(raw: unknown): AIProviderError {
  // The openai SDK exports typed error classes
  const typeName = (raw as { constructor?: { name?: string } })?.constructor?.name ?? '';
  const msg = raw instanceof Error ? raw.message : String(raw);

  if (typeName === 'AuthenticationError' || typeName === 'PermissionDeniedError') {
    return new AIProviderError('openai', 'fatal', `OpenAI auth error: ${msg}`, raw);
  }

  if (typeName === 'RateLimitError') {
    return new AIProviderError('openai', 'retryable', `OpenAI rate limit: ${msg}`, raw);
  }

  if (typeName === 'APIConnectionTimeoutError' || typeName === 'APIConnectionError') {
    return new AIProviderError('openai', 'retryable', `OpenAI connection error: ${msg}`, raw);
  }

  if (typeName === 'InternalServerError') {
    return new AIProviderError('openai', 'retryable', `OpenAI server error: ${msg}`, raw);
  }

  // Fallback: check status codes embedded in message string
  const lower = msg.toLowerCase();
  if (lower.includes('401') || lower.includes('invalid_api_key') || lower.includes('unauthorized')) {
    return new AIProviderError('openai', 'fatal', `OpenAI auth error: ${msg}`, raw);
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return new AIProviderError('openai', 'retryable', `OpenAI rate limit: ${msg}`, raw);
  }

  return new AIProviderError('openai', 'retryable', `OpenAI error: ${msg}`, raw);
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class OpenAIAdapter implements IAIProvider {
  readonly name = 'openai' as const;

  private readonly client: OpenAI;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(apiKey: string, model: string, timeoutMs = 15_000) {
    this.client = new OpenAI({ apiKey, timeout: timeoutMs });
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async classifyTicket(input: ClassifyTicketInput): Promise<ClassificationResponse> {
    const prompt = buildClassificationPrompt(input);

    let rawText: string | null | undefined;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 100,
      });

      rawText = completion.choices[0]?.message?.content;
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw classifyOpenAIError(err);
    }

    return this.parseAndValidate(rawText);
  }

  async generateText(prompt: string, options?: import('../types').TextGenerationOptions): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (options?.systemInstruction) {
        messages.push({ role: 'system', content: options.systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const maxTokens = options?.maxTokens ?? 2048;
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: maxTokens,
      });

      const choice = completion.choices[0];
      if (choice?.finish_reason === 'length') {
        console.warn(
          `[AI] OpenAI output reached max_tokens length limit (${maxTokens}); response may have been truncated.`,
        );
      }

      const text = choice?.message?.content;
      if (!text || text.trim() === '') {
        throw new AIProviderError('openai', 'invalid', 'OpenAI returned empty text response.');
      }
      return text;
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw classifyOpenAIError(err);
    }
  }

  private parseAndValidate(rawText: string | null | undefined): ClassificationResponse {
    if (!rawText || rawText.trim() === '') {
      throw new AIProviderError('openai', 'invalid', 'OpenAI returned empty response content.');
    }

    let parsed: unknown;
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new AIProviderError(
        'openai',
        'invalid',
        `OpenAI returned non-JSON: ${rawText.slice(0, 120)}`,
      );
    }

    const result = classificationResponseSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.errors.map((e) => e.message).join('; ');
      throw new AIProviderError(
        'openai',
        'invalid',
        `OpenAI response failed schema validation: ${issues}`,
      );
    }

    return result.data;
  }
}

