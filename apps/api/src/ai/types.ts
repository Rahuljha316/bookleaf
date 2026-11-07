/**
 * AI Abstraction Layer – Shared Types
 *
 * All AI-related types that flow between the business layer and the
 * provider adapters live here.  Business services import from this file;
 * they never import from provider-specific modules.
 */

import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@bookleaf/shared';

// ─── Provider Names ───────────────────────────────────────────────────────────

export const AI_PROVIDER_NAMES = ['gemini', 'openai'] as const;
export type AIProviderName = (typeof AI_PROVIDER_NAMES)[number];

// ─── Error Classification ─────────────────────────────────────────────────────

/**
 * Whether an error from a provider is worth trying the next provider for.
 *   retryable  – rate-limit, temporary outage, timeout → try fallback
 *   fatal      – bad API key, billing, unsupported model → do NOT retry
 *   invalid    – the model responded but with malformed output → try fallback
 */
export type AIErrorKind = 'retryable' | 'fatal' | 'invalid';

export class AIProviderError extends Error {
  constructor(
    public readonly provider: AIProviderName,
    public readonly kind: AIErrorKind,
    message: string,
    public readonly cause?: unknown,
    public readonly status?: number,
    public readonly code?: string | number,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

// ─── Classification I/O ───────────────────────────────────────────────────────

export interface ClassifyTicketInput {
  subject: string;
  description: string;
}

/** Zod schema used to validate every provider's structured response */
export const classificationResponseSchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
});

export type ClassificationResponse = z.infer<typeof classificationResponseSchema>;

// ─── Text Generation I/O (Extensibility for Reply Generation) ─────────────────

export interface TextGenerationOptions {
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}

// ─── Provider Interface ───────────────────────────────────────────────────────

/**
 * Every provider adapter must implement this interface.
 * Supports structured ticket classification (Stage 1) and
 * general text generation / reply drafting (Stage 2).
 * Business services depend only on this contract.
 */
export interface IAIProvider {
  /** Human-readable name, used only in logs. */
  readonly name: AIProviderName;

  /**
   * Classify a ticket with structured JSON output.
   * Must throw AIProviderError on failure (never raw SDK errors).
   */
  classifyTicket(input: ClassifyTicketInput): Promise<ClassificationResponse>;

  /**
   * Generate freeform text (used for reply draft generation in Stage 2).
   * Must throw AIProviderError on failure (never raw SDK errors).
   */
  generateText(prompt: string, options?: TextGenerationOptions): Promise<string>;
}

