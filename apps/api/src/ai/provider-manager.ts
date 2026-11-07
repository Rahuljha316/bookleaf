/**
 * AI Provider Manager
 *
 * Responsible for:
 *  - Building provider adapters from environment configuration.
 *  - Executing requests against the primary provider first.
 *  - Falling back to secondary providers on retryable failures.
 *  - Logging provider name and error kind without leaking keys or ticket content.
 *
 * Business services call this class; they never touch SDK-specific code.
 */

import { env } from '../config/env';
import { GeminiAdapter, sanitizeLogMessage } from './providers/gemini.adapter';
import { OpenAIAdapter } from './providers/openai.adapter';
import {
  AIProviderError,
  ClassificationResponse,
  ClassifyTicketInput,
  IAIProvider,
} from './types';

// ─── Logging Helper ───────────────────────────────────────────────────────────

function formatErrorLog(err: AIProviderError): string {
  const meta: string[] = [`kind=${err.kind}`];
  if (err.status !== undefined) {
    meta.push(`status=${err.status}`);
  }
  if (err.code !== undefined) {
    meta.push(`code=${err.code}`);
  }
  return `(${meta.join(', ')}): ${err.message}`;
}

// ─── Provider Registry ─────────────────────────────────────────────────────────

/**
 * Factory: build an ordered list of configured providers.
 * Order: primary first, then fallbacks in declaration order.
 * Providers whose API key is absent are silently skipped.
 */
function buildProviderList(): IAIProvider[] {
  const primary = env.AI_PRIMARY_PROVIDER;
  const fallbacks = env.AI_FALLBACK_PROVIDERS;

  // Deduplicate while preserving order: primary first
  const orderedNames = [primary, ...fallbacks].filter(
    (name, idx, arr) => name && arr.indexOf(name) === idx,
  );

  const providers: IAIProvider[] = [];

  for (const name of orderedNames) {
    if (!name) continue;

    if (name === 'gemini') {
      if (!env.GEMINI_API_KEY) {
        console.warn('[AI] Gemini is in provider list but GEMINI_API_KEY is not set — skipping.');
        continue;
      }
      providers.push(new GeminiAdapter(env.GEMINI_API_KEY, env.GEMINI_MODEL, env.GEMINI_TIMEOUT_MS));
      console.info(`[AI] Registered provider: gemini (model: ${env.GEMINI_MODEL}, timeout: ${env.GEMINI_TIMEOUT_MS}ms)`);
    }

    if (name === 'openai') {
      if (!env.OPENAI_API_KEY) {
        console.warn('[AI] OpenAI is in provider list but OPENAI_API_KEY is not set — skipping.');
        continue;
      }
      providers.push(new OpenAIAdapter(env.OPENAI_API_KEY, env.OPENAI_MODEL));
      console.info(`[AI] Registered provider: openai (model: ${env.OPENAI_MODEL})`);
    }
  }

  if (providers.length === 0) {
    console.warn('[AI] No AI providers are configured. Classification will be unavailable.');
  }

  return providers;
}

// ─── Manager ──────────────────────────────────────────────────────────────────

export class AIProviderManager {
  private readonly providers: IAIProvider[];

  constructor(providers?: IAIProvider[]) {
    // Allow explicit injection for tests; otherwise use env-driven factory
    this.providers = providers ?? buildProviderList();
  }

  /**
   * Run ticket classification through the provider chain.
   *
   * - Tries each provider in order.
   * - Skips to next provider on `retryable` or `invalid` errors.
   * - Stops immediately on `fatal` errors (auth, billing) — no point trying fallbacks.
   * - If all providers fail, returns null so the caller can handle gracefully.
   */
  async classifyTicket(input: ClassifyTicketInput): Promise<ClassificationResponse | null> {
    if (this.providers.length === 0) {
      console.warn('[AI] classifyTicket: no providers configured, returning null.');
      return null;
    }

    for (const provider of this.providers) {
      try {
        console.info(`[AI] Attempting classification with provider: ${provider.name}`);
        const result = await provider.classifyTicket(input);
        console.info(`[AI] Classification succeeded with provider: ${provider.name}`);
        return result;
      } catch (err) {
        if (err instanceof AIProviderError) {
          console.error(
            `[AI] Provider "${provider.name}" failed ${formatErrorLog(err)}`,
          );

          if (err.kind === 'fatal') {
            // Fatal: auth/billing. Attempting another provider will likely
            // succeed if that provider has a valid key, so we DO fall through —
            // but we log clearly that this provider is permanently failing.
            console.error(
              `[AI] Fatal error from "${provider.name}" — this provider will not be retried.`,
            );
            // Still fall through to the next provider (different key/provider)
            continue;
          }

          // retryable or invalid → try next provider
          console.warn(`[AI] Falling back from "${provider.name}" to next provider...`);
          continue;
        }

        // Unexpected non-AIProviderError — treat as retryable, log and continue
        const msg = err instanceof Error ? err.message : String(err);
        const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
        const status = errObj && typeof errObj['status'] === 'number' ? errObj['status'] : undefined;
        const code =
          errObj && (typeof errObj['code'] === 'string' || typeof errObj['code'] === 'number')
            ? errObj['code']
            : undefined;
        const extra: string[] = [];
        if (status !== undefined) extra.push(`status=${status}`);
        if (code !== undefined) extra.push(`code=${code}`);
        const extraStr = extra.length > 0 ? ` (${extra.join(', ')})` : '';
        console.error(
          `[AI] Unexpected error from "${provider.name}"${extraStr}: ${sanitizeLogMessage(msg)}`,
        );
        continue;
      }
    }

    console.error('[AI] All configured providers failed. Returning null.');
    return null;
  }

  /**
   * Run general text generation through the provider chain (for Stage 2 reply drafting).
   *
   * - Tries each provider in order.
   * - Skips to next provider on retryable or invalid errors.
   * - Stops immediately on fatal errors.
   * - Returns null if all providers fail.
   */
  async generateText(
    prompt: string,
    options?: import('./types').TextGenerationOptions,
  ): Promise<string | null> {
    if (this.providers.length === 0) {
      console.warn('[AI] generateText: no providers configured, returning null.');
      return null;
    }

    for (const provider of this.providers) {
      try {
        console.info(`[AI] Attempting text generation with provider: ${provider.name}`);
        const result = await provider.generateText(prompt, options);
        console.info(`[AI] Text generation succeeded with provider: ${provider.name}`);
        return result;
      } catch (err) {
        if (err instanceof AIProviderError) {
          console.error(
            `[AI] Provider "${provider.name}" failed text generation ${formatErrorLog(err)}`,
          );

          if (err.kind === 'fatal') {
            console.error(
              `[AI] Fatal error from "${provider.name}" — falling back to next provider.`,
            );
            continue;
          }

          console.warn(`[AI] Falling back from "${provider.name}" to next provider for text generation...`);
          continue;
        }

        const msg = err instanceof Error ? err.message : String(err);
        const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
        const status = errObj && typeof errObj['status'] === 'number' ? errObj['status'] : undefined;
        const code =
          errObj && (typeof errObj['code'] === 'string' || typeof errObj['code'] === 'number')
            ? errObj['code']
            : undefined;
        const extra: string[] = [];
        if (status !== undefined) extra.push(`status=${status}`);
        if (code !== undefined) extra.push(`code=${code}`);
        const extraStr = extra.length > 0 ? ` (${extra.join(', ')})` : '';
        console.error(
          `[AI] Unexpected error from "${provider.name}"${extraStr}: ${sanitizeLogMessage(msg)}`,
        );
        continue;
      }
    }

    console.error('[AI] All configured providers failed text generation. Returning null.');
    return null;
  }

  /** Exposed for diagnostics / health checks */
  get configuredProviders(): string[] {
    return this.providers.map((p) => p.name);
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Application-level singleton.
 * Lazy-initialised so tests can control construction.
 */
let _instance: AIProviderManager | null = null;

export function getAIProviderManager(): AIProviderManager {
  if (!_instance) {
    _instance = new AIProviderManager();
  }
  return _instance;
}

/**
 * Override the singleton — used exclusively in tests.
 * @internal
 */
export function _setAIProviderManagerForTesting(manager: AIProviderManager): void {
  _instance = manager;
}

/**
 * Reset the singleton — called in test teardown.
 * @internal
 */
export function _resetAIProviderManager(): void {
  _instance = null;
}

