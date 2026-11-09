/**
 * AI Provider Manager — Unit Tests
 *
 * All tests use mock IAIProvider implementations.
 * No real API calls are made; no database connections are needed.
 *
 * Coverage:
 *  1.  Gemini primary succeeds → returns classification
 *  2.  OpenAI primary succeeds → returns classification
 *  3.  All six allowed categories accepted
 *  4.  All four allowed priorities accepted
 *  5.  Primary rate-limit → fallback to secondary succeeds
 *  6.  Primary timeout → fallback to secondary succeeds
 *  7.  Fatal auth/billing error → falls to next provider
 *  8.  Both providers fail → returns null
 *  9.  No providers configured → returns null
 * 10.  Invalid structured output → falls back
 * 11.  Both providers return invalid output → returns null
 * 12.  Ticket creation succeeds even when all providers fail (classifyAndPersist)
 * 13.  Admin-controlled category/priority NOT overwritten by AI suggestions
 * 14.  Zod schema accepts all valid categories
 * 15.  Zod schema rejects unknown category/priority values
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AIProviderManager,
  _setAIProviderManagerForTesting,
  _resetAIProviderManager,
} from '../provider-manager';
import { classifyAndPersist } from '../classification.service';
import {
  AIProviderError,
  ClassificationResponse,
  ClassifyTicketInput,
  IAIProvider,
  classificationResponseSchema,
} from '../types';
import type { AIProviderName } from '../types';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@bookleaf/shared';

// ─── Mock Ticket ──────────────────────────────────────────────────────────────

/**
 * Minimal Ticket stub — only the properties classifyAndPersist uses.
 * We avoid importing Sequelize models so no DB connection is needed.
 */
function makeMockTicket(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    id: 1,
    subject: 'Test subject',
    description: 'Test description',
    category: 'General Inquiry',
    priority: 'Medium',
    category_manually_overridden: false,
    priority_manually_overridden: false,
    ai_suggested_category: null,
    ai_suggested_priority: null,
    ai_classification_status: 'pending',
    ...overrides,
  };

  // update() merges changes into data and resolves
  const update = vi.fn(async (changes: Record<string, unknown>) => {
    Object.assign(data, changes);
  });

  return { ...data, update, _data: data };
}

// ─── Mock Provider Factory ────────────────────────────────────────────────────

function makeProvider(
  name: AIProviderName,
  classifyImpl: (input: ClassifyTicketInput) => Promise<ClassificationResponse>,
  generateTextImpl?: (prompt: string) => Promise<string>,
): IAIProvider {
  return {
    name,
    classifyTicket: classifyImpl,
    generateText: generateTextImpl ?? (async () => 'Default generated response'),
  };
}

function makeSucceedingProvider(
  name: AIProviderName,
  result: ClassificationResponse = { category: 'General Inquiry', priority: 'Medium' },
  textResult = 'Default generated response',
): IAIProvider {
  return makeProvider(name, async () => result, async () => textResult);
}

function makeFailingProvider(
  name: AIProviderName,
  kind: 'retryable' | 'fatal' | 'invalid',
  message = 'Simulated error',
): IAIProvider {
  return makeProvider(
    name,
    async () => {
      throw new AIProviderError(name, kind, message);
    },
    async () => {
      throw new AIProviderError(name, kind, message);
    },
  );
}

// ─── Shared Test Input ────────────────────────────────────────────────────────

const sampleInput: ClassifyTicketInput = {
  subject: 'Missing royalty payment for Q3',
  description: 'I have not received my royalty payment for the third quarter.',
};

// ─── 1-11: AIProviderManager Tests ───────────────────────────────────────────

describe('AIProviderManager', () => {
  beforeEach(() => {
    _resetAIProviderManager();
  });

  // 1. Gemini primary succeeds
  it('returns classification when gemini primary succeeds', async () => {
    const manager = new AIProviderManager([
      makeSucceedingProvider('gemini', { category: 'Royalty & Payments', priority: 'High' }),
    ]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toEqual({ category: 'Royalty & Payments', priority: 'High' });
  });

  // 2. OpenAI primary succeeds
  it('returns classification when openai primary succeeds', async () => {
    const manager = new AIProviderManager([
      makeSucceedingProvider('openai', { category: 'ISBN & Metadata Issues', priority: 'Low' }),
    ]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toEqual({ category: 'ISBN & Metadata Issues', priority: 'Low' });
  });

  // 3. All six allowed categories
  it.each(TICKET_CATEGORIES.map((c) => [c] as [string]))(
    'accepts category: %s',
    async (category) => {
      const manager = new AIProviderManager([
        makeSucceedingProvider('gemini', {
          category: category as (typeof TICKET_CATEGORIES)[number],
          priority: 'Medium',
        }),
      ]);
      const result = await manager.classifyTicket(sampleInput);
      expect(result?.category).toBe(category);
    },
  );

  // 4. All four allowed priorities
  it.each(TICKET_PRIORITIES.map((p) => [p] as [string]))(
    'accepts priority: %s',
    async (priority) => {
      const manager = new AIProviderManager([
        makeSucceedingProvider('gemini', {
          category: 'General Inquiry',
          priority: priority as (typeof TICKET_PRIORITIES)[number],
        }),
      ]);
      const result = await manager.classifyTicket(sampleInput);
      expect(result?.priority).toBe(priority);
    },
  );

  // 5. Primary rate-limit triggers fallback
  it('falls back to openai when gemini returns a retryable rate-limit error', async () => {
    const manager = new AIProviderManager([
      makeFailingProvider('gemini', 'retryable', 'Gemini rate limit: 429'),
      makeSucceedingProvider('openai', { category: 'Printing & Quality', priority: 'Critical' }),
    ]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toEqual({ category: 'Printing & Quality', priority: 'Critical' });
  });

  // 6. Primary timeout triggers fallback
  it('falls back to openai when gemini times out', async () => {
    const manager = new AIProviderManager([
      makeFailingProvider('gemini', 'retryable', 'Gemini timeout after 15000ms'),
      makeSucceedingProvider('openai', {
        category: 'Distribution & Availability',
        priority: 'High',
      }),
    ]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toEqual({ category: 'Distribution & Availability', priority: 'High' });
  });

  // 7. Fatal auth error — falls to next provider (different provider = different key)
  it('falls to next provider on fatal auth error and succeeds with openai', async () => {
    const manager = new AIProviderManager([
      makeFailingProvider('gemini', 'fatal', 'API key invalid — 401'),
      makeSucceedingProvider('openai', {
        category: 'Book Status & Production Updates',
        priority: 'Low',
      }),
    ]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toEqual({ category: 'Book Status & Production Updates', priority: 'Low' });
  });

  // 8. Both providers fail → null
  it('returns null when all providers fail', async () => {
    const manager = new AIProviderManager([
      makeFailingProvider('gemini', 'retryable', 'Gemini unavailable'),
      makeFailingProvider('openai', 'retryable', 'OpenAI unavailable'),
    ]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toBeNull();
  });

  // 9. No providers → null
  it('returns null when no providers are configured', async () => {
    const manager = new AIProviderManager([]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toBeNull();
  });

  // 10. Invalid output (bad JSON/enum from primary) → falls back
  it('falls back when primary returns invalid structured output', async () => {
    const manager = new AIProviderManager([
      makeFailingProvider('gemini', 'invalid', 'Gemini returned non-JSON: hello world'),
      makeSucceedingProvider('openai', { category: 'Royalty & Payments', priority: 'Critical' }),
    ]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toEqual({ category: 'Royalty & Payments', priority: 'Critical' });
  });

  // 11. Both providers return invalid output → null
  it('returns null when both providers return invalid responses', async () => {
    const manager = new AIProviderManager([
      makeFailingProvider('gemini', 'invalid', 'Failed schema validation: invalid category'),
      makeFailingProvider('openai', 'invalid', 'Failed schema validation: invalid priority'),
    ]);
    const result = await manager.classifyTicket(sampleInput);
    expect(result).toBeNull();
  });

  it('reports configured provider names', () => {
    const manager = new AIProviderManager([
      makeSucceedingProvider('gemini'),
      makeSucceedingProvider('openai'),
    ]);
    expect(manager.configuredProviders).toEqual(['gemini', 'openai']);
  });

  // 12. Text generation (Stage 2 extensibility)
  it('generates text using primary provider', async () => {
    const manager = new AIProviderManager([
      makeSucceedingProvider('gemini', undefined, 'Draft reply from Gemini'),
    ]);
    const text = await manager.generateText('Write a reply');
    expect(text).toBe('Draft reply from Gemini');
  });

  it('falls back to secondary provider for text generation on retryable error', async () => {
    const manager = new AIProviderManager([
      makeFailingProvider('gemini', 'retryable', 'Gemini overloaded'),
      makeSucceedingProvider('openai', undefined, 'Draft reply from OpenAI'),
    ]);
    const text = await manager.generateText('Write a reply');
    expect(text).toBe('Draft reply from OpenAI');
  });

  it('returns null for text generation when all providers fail', async () => {
    const manager = new AIProviderManager([
      makeFailingProvider('gemini', 'retryable', 'Gemini error'),
      makeFailingProvider('openai', 'retryable', 'OpenAI error'),
    ]);
    const text = await manager.generateText('Write a reply');
    expect(text).toBeNull();
  });

  it('returns null for text generation when no providers configured', async () => {
    const manager = new AIProviderManager([]);
    const text = await manager.generateText('Write a reply');
    expect(text).toBeNull();
  });
});

// ─── 12-13: classifyAndPersist Tests ─────────────────────────────────────────

describe('classifyAndPersist', () => {
  beforeEach(() => {
    _resetAIProviderManager();
  });

  // 12. Ticket creation succeeds even when all providers fail
  it('resolves with status=failed when all providers fail — does not throw', async () => {
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeFailingProvider('gemini', 'retryable', 'Gemini down'),
        makeFailingProvider('openai', 'retryable', 'OpenAI down'),
      ]),
    );

    const ticket = makeMockTicket();
    // This must resolve, never throw
    const result = await classifyAndPersist(ticket as never, sampleInput);

    expect(result.status).toBe('failed');
    // Ticket update was called to persist the failed status
    expect(ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({ ai_classification_status: 'failed' }),
    );
  });

  it('resolves with status=failed when no providers are configured', async () => {
    _setAIProviderManagerForTesting(new AIProviderManager([]));
    const ticket = makeMockTicket();
    const result = await classifyAndPersist(ticket as never, sampleInput);
    expect(result.status).toBe('failed');
  });

  it('populates active category and priority and persists AI suggestions when not overridden', async () => {
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeSucceedingProvider('gemini', { category: 'Royalty & Payments', priority: 'High' }),
      ]),
    );

    const ticket = makeMockTicket();
    const result = await classifyAndPersist(ticket as never, sampleInput);

    expect(result.status).toBe('success');
    expect(result.category).toBe('Royalty & Payments');
    expect(result.priority).toBe('High');
    expect(ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'Royalty & Payments',
        priority: 'High',
        ai_suggested_category: 'Royalty & Payments',
        ai_suggested_priority: 'High',
        ai_classification_status: 'success',
      }),
    );
    expect(ticket._data['category']).toBe('Royalty & Payments');
    expect(ticket._data['priority']).toBe('High');
  });

  // Admin manually overridden category: AI does not touch category, but DOES update priority
  it('does NOT overwrite category if manually overridden, but still populates priority', async () => {
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeSucceedingProvider('gemini', {
          category: 'Royalty & Payments',
          priority: 'Critical',
        }),
      ]),
    );

    const ticket = makeMockTicket({
      category: 'Printing & Quality',
      category_manually_overridden: true,
      priority: 'Medium',
      priority_manually_overridden: false,
    });

    await classifyAndPersist(ticket as never, sampleInput);

    expect(ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'Critical',
        ai_suggested_category: 'Royalty & Payments',
        ai_suggested_priority: 'Critical',
        ai_classification_status: 'success',
      }),
    );
    // category was NOT included in the update payload
    const updateCall = ticket.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall).not.toHaveProperty('category');
    expect(ticket._data['category']).toBe('Printing & Quality');
    expect(ticket._data['priority']).toBe('Critical');
  });

  // Admin manually overridden priority: AI does not touch priority, but DOES update category
  it('does NOT overwrite priority if manually overridden, but still populates category', async () => {
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeSucceedingProvider('gemini', {
          category: 'Distribution & Availability',
          priority: 'Critical',
        }),
      ]),
    );

    const ticket = makeMockTicket({
      category: 'General Inquiry',
      category_manually_overridden: false,
      priority: 'Low',
      priority_manually_overridden: true,
    });

    await classifyAndPersist(ticket as never, sampleInput);

    expect(ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'Distribution & Availability',
        ai_suggested_category: 'Distribution & Availability',
        ai_suggested_priority: 'Critical',
        ai_classification_status: 'success',
      }),
    );
    const updateCall = ticket.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall).not.toHaveProperty('priority');
    expect(ticket._data['category']).toBe('Distribution & Availability');
    expect(ticket._data['priority']).toBe('Low');
  });

  // Both category and priority manually overridden: AI updates neither, but preserves suggestions
  it('does NOT overwrite either field when both are manually overridden, but preserves AI suggestions', async () => {
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeSucceedingProvider('gemini', {
          category: 'Royalty & Payments',
          priority: 'Critical',
        }),
      ]),
    );

    const ticket = makeMockTicket({
      category: 'Printing & Quality',
      category_manually_overridden: true,
      priority: 'Low',
      priority_manually_overridden: true,
    });

    await classifyAndPersist(ticket as never, sampleInput);

    const updateCall = ticket.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall).not.toHaveProperty('category');
    expect(updateCall).not.toHaveProperty('priority');
    expect(updateCall).toMatchObject({
      ai_suggested_category: 'Royalty & Payments',
      ai_suggested_priority: 'Critical',
      ai_classification_status: 'success',
    });
    expect(ticket._data['category']).toBe('Printing & Quality');
    expect(ticket._data['priority']).toBe('Low');
  });
});

// ─── 14-15: Zod Schema Validation ────────────────────────────────────────────

describe('classificationResponseSchema', () => {
  it('accepts a valid category and priority', () => {
    const result = classificationResponseSchema.safeParse({
      category: 'Royalty & Payments',
      priority: 'High',
    });
    expect(result.success).toBe(true);
  });

  it.each(TICKET_CATEGORIES.map((c) => [c]))(
    'accepts the category "%s" as valid',
    (category) => {
      const result = classificationResponseSchema.safeParse({ category, priority: 'Medium' });
      expect(result.success).toBe(true);
    },
  );

  it.each(TICKET_PRIORITIES.map((p) => [p]))(
    'accepts the priority "%s" as valid',
    (priority) => {
      const result = classificationResponseSchema.safeParse({
        category: 'General Inquiry',
        priority,
      });
      expect(result.success).toBe(true);
    },
  );

  it('rejects an unknown category', () => {
    const result = classificationResponseSchema.safeParse({
      category: 'Unknown Category',
      priority: 'High',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown priority', () => {
    const result = classificationResponseSchema.safeParse({
      category: 'General Inquiry',
      priority: 'Urgent',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty object', () => {
    const result = classificationResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
