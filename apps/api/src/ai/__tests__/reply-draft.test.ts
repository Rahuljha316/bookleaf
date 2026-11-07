/**
 * Phase 2: AI Reply Drafting — Focused Verification Tests
 *
 * No real AI API calls, no database connections.
 *
 * Coverage:
 *  KB-1  Communication tone section is always included
 *  KB-2  Royalty keywords match royalty section
 *  KB-3  Printing keywords match printing section
 *  KB-4  Distribution keywords match availability section
 *  KB-5  ISBN keywords match ISBN section
 *  KB-6  Production keywords match production section
 *  KB-7  Unrecognised ticket falls back to full KB (all sections)
 *  KB-8  Multiple matching sections are included together
 *  KB-9  Conversation text is also searched for keyword matches
 *
 *  DS-1  generateDraft returns {status:'unavailable'} when all providers fail (retryable)
 *  DS-2  generateDraft returns {status:'unavailable'} when no providers configured
 *  DS-3  generateDraft never throws — always resolves (fatal provider error)
 *  DS-4  generateDraft returns {status:'success', draft} when provider succeeds
 *  DS-5+6 prompt NEVER contains "internalnote"; user prompt has public-messages-only section
 *  DS-7  generateDraft does NOT call ticket.update or ticket.save
 *  DS-8  Messages are sorted ascending by created_at before prompt construction
 *  DS-9  generateText is called with systemInstruction containing KB content
 *  DS-10 Provider invalid error → status:unavailable, never throws
 *  DS-404 404-decorated error thrown when ticket does not exist
 *
 *  ROUTE  generateAIDraftHandler and barrel exports exist
 */

// ─── vi.mock must be at the top level so Vitest hoists them ──────────────────
// Mocking Sequelize models prevents any database connection attempt.
vi.mock('../../models/Ticket', () => ({ Ticket: { findByPk: vi.fn() } }));
vi.mock('../../models/TicketMessage', () => ({ TicketMessage: {} }));
vi.mock('../../models/User', () => ({ User: { findAll: vi.fn() } }));
vi.mock('../../models/Book', () => ({ Book: {} }));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRelevantKBSections, getFullKnowledgeBase } from '../knowledge-base';
import {
  AIProviderManager,
  _setAIProviderManagerForTesting,
  _resetAIProviderManager,
} from '../provider-manager';
import { AIProviderError, IAIProvider } from '../types';
import type { AIProviderName } from '../types';

// ─── Shared provider helpers ──────────────────────────────────────────────────

function makeProvider(
  name: AIProviderName,
  generateImpl: (prompt: string, opts?: unknown) => Promise<string>,
): IAIProvider {
  return {
    name,
    classifyTicket: async () => ({ category: 'General Inquiry', priority: 'Medium' }),
    generateText: generateImpl as IAIProvider['generateText'],
  };
}

function makeSucceedingTextProvider(name: AIProviderName, reply: string): IAIProvider {
  return makeProvider(name, async () => reply);
}

function makeFailingTextProvider(
  name: AIProviderName,
  kind: 'retryable' | 'fatal' | 'invalid',
): IAIProvider {
  return makeProvider(name, async () => {
    throw new AIProviderError(name, kind, `Simulated ${kind} error`);
  });
}

// ─── KB-1 … KB-9: Knowledge Base Section Selection ───────────────────────────

describe('getRelevantKBSections (Knowledge Base)', () => {
  it('KB-1: always includes the Communication Tone section regardless of input', () => {
    const output = getRelevantKBSections('hello', 'world');
    expect(output).toContain('Communication Tone Guidelines');
    expect(output).toContain('empathetic');
  });

  it('KB-2: royalty keywords trigger the Royalty Policy section', () => {
    const output = getRelevantKBSections('Missing royalty', 'I have not received my royalty payment');
    expect(output).toContain('Royalty Policy');
    expect(output).toContain('80%');
    expect(output).toContain('45 days');
    expect(output).toContain('₹1,000');
  });

  it('KB-3: printing/quality keywords trigger the Printing & Quality section', () => {
    const output = getRelevantKBSections('Print quality issue', 'The images are blurry and binding is defective');
    expect(output).toContain('Printing & Quality Policy');
    // KB content uses uppercase "FREE reprint" — match the actual text
    expect(output).toContain('FREE reprint');
    expect(output).toContain('5–7 business days');
  });

  it('KB-4: distribution/availability keywords trigger the Distribution section', () => {
    const output = getRelevantKBSections('Book unavailable on Amazon', 'Shows as currently unavailable');
    expect(output).toContain('Distribution & Availability Policy');
    expect(output).toContain('24–48 hours');
    expect(output).toContain('stock sync');
  });

  it('KB-5: ISBN/metadata keywords trigger the ISBN section', () => {
    const output = getRelevantKBSections('Wrong ISBN', 'The ISBN on Amazon is different from the physical copy');
    expect(output).toContain('ISBN & Metadata Policy');
    expect(output).toContain('HIGH-PRIORITY');
    expect(output).toContain('48-hour');
  });

  it('KB-6: production stage keywords trigger the Production Stages section', () => {
    const output = getRelevantKBSections('Book still in typesetting', 'It has been 3 weeks, when will it be done?');
    expect(output).toContain('Book Production Stages');
    expect(output).toContain('Typesetting');
    expect(output).toContain('Cover Design');
  });

  it('KB-7: unrecognised ticket falls back to returning all KB sections', () => {
    const output = getRelevantKBSections('xyz', 'zzz completely unrelated query');
    const full = getFullKnowledgeBase();
    for (const title of [
      'Company Overview',
      'Royalty Policy',
      'ISBN & Metadata Policy',
      'Printing & Quality Policy',
      'Distribution & Availability Policy',
      'Book Production Stages',
      'Communication Tone Guidelines',
    ]) {
      expect(output).toContain(title);
      expect(full).toContain(title);
    }
  });

  it('KB-8: multiple keywords from different sections include all matching sections', () => {
    const output = getRelevantKBSections(
      'Royalty and ISBN issue',
      'My royalty is low and the isbn on Amazon is wrong',
    );
    expect(output).toContain('Royalty Policy');
    expect(output).toContain('ISBN & Metadata Policy');
    expect(output).toContain('Communication Tone Guidelines');
  });

  it('KB-9: conversation text is also searched for keyword matches', () => {
    const output = getRelevantKBSections(
      'General question',
      'I have a concern',
      'I never received my royalty payment for last quarter',
    );
    expect(output).toContain('Royalty Policy');
  });

  it('KB-10: royalty ticket does not unnecessarily include production stages or company overview', () => {
    const output = getRelevantKBSections(
      'Awaiting royalty payout',
      'My royalty payout of ₹8,500 has not arrived in my bank account yet.',
      undefined,
      'Royalty & Payments',
    );
    expect(output).toContain('Royalty Policy');
    expect(output).not.toContain('Book Production Stages');
    expect(output).not.toContain('Company Overview');
  });
});

// ─── DS-1 … DS-404: generateDraft Service ────────────────────────────────────
//
// Ticket.findByPk is mocked (via vi.mock at top of file) so no DB needed.

describe('generateDraft service', () => {
  // Lazily resolved after mocks are hoisted
  let generateDraft: (id: number) => Promise<{ status: string; draft?: string }>;
  let TicketFindByPk: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    _resetAIProviderManager();
    vi.clearAllMocks();
    const svc = await import('../reply-draft.service');
    generateDraft = svc.generateDraft as typeof generateDraft;
    const { Ticket } = await import('../../models/Ticket');
    TicketFindByPk = Ticket.findByPk as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    _resetAIProviderManager();
  });

  // ── Minimal ticket stub returned by Ticket.findByPk ──────────────────────

  function makeTicketStub(messages: Array<{
    id: number;
    message: string;
    sender: { name: string; role: string };
    created_at: Date;
  }> = []) {
    return {
      id: 42,
      ticket_number: 'TICK-1042',
      subject: 'Missing royalty payment',
      description: 'I have not received my royalty for Q3.',
      status: 'Open',
      category: 'Royalty & Payments',
      priority: 'High',
      book: null,
      messages,
      update: vi.fn(),
      save: vi.fn(),
      author: {
        id: 1,
        name: 'Priya Sharma',
        email: 'priya@example.com',
        author_id: 'AUTH-001',
        city: 'Delhi',
        joined_date: '2023-01-01',
      },
    };
  }

  it('DS-1: returns {status:"unavailable"} when provider fails (retryable)', async () => {
    TicketFindByPk.mockResolvedValue(makeTicketStub());
    _setAIProviderManagerForTesting(
      new AIProviderManager([makeFailingTextProvider('openai', 'retryable')]),
    );
    const result = await generateDraft(42);
    expect(result.status).toBe('unavailable');
    expect(result.draft).toBeUndefined();
  });

  it('DS-2: returns {status:"unavailable"} when no providers configured', async () => {
    TicketFindByPk.mockResolvedValue(makeTicketStub());
    _setAIProviderManagerForTesting(new AIProviderManager([]));
    const result = await generateDraft(42);
    expect(result.status).toBe('unavailable');
  });

  it('DS-3: never throws even on a fatal provider error', async () => {
    TicketFindByPk.mockResolvedValue(makeTicketStub());
    _setAIProviderManagerForTesting(
      new AIProviderManager([makeFailingTextProvider('openai', 'fatal')]),
    );
    await expect(generateDraft(42)).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('DS-4: returns {status:"success", draft} when provider succeeds', async () => {
    TicketFindByPk.mockResolvedValue(makeTicketStub());
    _setAIProviderManagerForTesting(
      new AIProviderManager([makeSucceedingTextProvider('openai', 'Here is your royalty explanation.')]),
    );
    const result = await generateDraft(42);
    expect(result.status).toBe('success');
    expect(result.draft).toBe('Here is your royalty explanation.');
  });

  it('DS-7: generateDraft does NOT call ticket.update or ticket.save', async () => {
    const stub = makeTicketStub();
    TicketFindByPk.mockResolvedValue(stub);
    _setAIProviderManagerForTesting(
      new AIProviderManager([makeSucceedingTextProvider('openai', 'Draft.')]),
    );
    await generateDraft(42);
    expect(stub.update).not.toHaveBeenCalled();
    expect(stub.save).not.toHaveBeenCalled();
  });

  it('DS-8: messages sorted ascending by created_at before added to prompt', async () => {
    const messages = [
      { id: 3, message: 'Third message', sender: { name: 'Admin', role: 'admin' }, created_at: new Date('2026-11-07T12:00:00Z') },
      { id: 1, message: 'First message', sender: { name: 'Priya', role: 'author' }, created_at: new Date('2026-11-07T10:00:00Z') },
      { id: 2, message: 'Second message', sender: { name: 'Priya', role: 'author' }, created_at: new Date('2026-11-07T11:00:00Z') },
    ];
    TicketFindByPk.mockResolvedValue(makeTicketStub(messages));

    let capturedPrompt = '';
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeProvider('openai', async (prompt) => { capturedPrompt = prompt; return 'Draft'; }),
      ]),
    );

    await generateDraft(42);

    const firstIdx = capturedPrompt.indexOf('First message');
    const secondIdx = capturedPrompt.indexOf('Second message');
    const thirdIdx = capturedPrompt.indexOf('Third message');
    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(thirdIdx).toBeGreaterThan(secondIdx);
  });

  it('DS-9: generateText called with systemInstruction containing KB content', async () => {
    TicketFindByPk.mockResolvedValue(makeTicketStub());

    let capturedOptions: Record<string, unknown> | undefined;
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeProvider('openai', async (_p, opts) => {
          capturedOptions = opts as Record<string, unknown>;
          return 'Draft';
        }),
      ]),
    );

    await generateDraft(42);

    expect(capturedOptions).toBeDefined();
    const sysInstr = capturedOptions!['systemInstruction'] as string;
    expect(typeof sysInstr).toBe('string');
    // KB must be in system instruction
    expect(sysInstr).toContain('BookLeaf Publishing');
    expect(sysInstr).toContain('Communication Tone');
    // "royalty" in ticket subject → Royalty Policy included
    expect(sysInstr).toContain('Royalty Policy');
    // Temperature and maxTokens should be configured
    expect(capturedOptions!['temperature']).toBeDefined();
    expect(capturedOptions!['maxTokens']).toBeDefined();
  });

  it('DS-5+6: prompt never contains internal note data; has public-messages-only header', async () => {
    TicketFindByPk.mockResolvedValue(makeTicketStub());

    let capturedPrompt = '';
    let capturedSysInstr = '';
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeProvider('openai', async (prompt, opts) => {
          capturedPrompt = prompt;
          capturedSysInstr = (opts as { systemInstruction?: string })?.systemInstruction ?? '';
          return 'Draft';
        }),
      ]),
    );

    await generateDraft(42);

    const combined = capturedPrompt + capturedSysInstr;
    // Internal note data must never appear in any form
    expect(combined.toLowerCase()).not.toContain('internalnote');
    // Model class name must not appear in prompt
    expect(combined).not.toContain('TicketInternalNote');
    // User prompt must clearly label that only public messages are included
    expect(capturedPrompt).toContain('Conversation History (public messages only)');
  });

  it('DS-10: provider invalid error → status:unavailable, does not throw', async () => {
    TicketFindByPk.mockResolvedValue(makeTicketStub());
    _setAIProviderManagerForTesting(
      new AIProviderManager([makeFailingTextProvider('openai', 'invalid')]),
    );
    await expect(generateDraft(42)).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('DS-404: 404-decorated error thrown when ticket does not exist', async () => {
    TicketFindByPk.mockResolvedValue(null);
    _setAIProviderManagerForTesting(new AIProviderManager([]));
    await expect(generateDraft(99999)).rejects.toMatchObject({
      message: 'Ticket not found.',
      statusCode: 404,
    });
  });

  it('DS-11: cleans markdown fences and conversational preambles from raw draft', async () => {
    const svc = await import('../reply-draft.service');
    const raw =
      '```markdown\nHere is a draft response for Priya:\n\nDear Priya,\n\nYour royalty payment is being processed.\n\nWarm regards,\nBookLeaf Support Team\n```';
    const cleaned = svc.cleanDraftOutput(raw);
    expect(cleaned).toBe(
      'Dear Priya,\n\nYour royalty payment is being processed.\n\nWarm regards,\nBookLeaf Support Team',
    );
  });

  it('DS-12: system instruction contains anti-fragmentation, anti-parroting, and anti-invention rules', async () => {
    TicketFindByPk.mockResolvedValue(makeTicketStub());
    let capturedSysInstr = '';
    let capturedUserPrompt = '';
    _setAIProviderManagerForTesting(
      new AIProviderManager([
        makeProvider('openai', async (prompt, opts) => {
          capturedUserPrompt = prompt;
          capturedSysInstr = (opts as { systemInstruction?: string })?.systemInstruction ?? '';
          return 'Draft';
        }),
      ]),
    );

    await generateDraft(42);

    expect(capturedSysInstr).toContain('COMPLETE, COHERENT RESPONSE');
    expect(capturedSysInstr).toContain('DO NOT REPEAT THE TICKET DESCRIPTION');
    expect(capturedSysInstr).toContain('NEVER INVENT ACTIONS OR COMMITMENTS');
    expect(capturedSysInstr).toContain('PROPER GREETING AND CLOSING');
    expect(capturedUserPrompt).toContain('Dear Priya,');
  });
});

// ─── Route / export surface verification ─────────────────────────────────────

describe('Phase 2 export surface', () => {
  it('admin.controller exports generateAIDraftHandler', async () => {
    const mod = await import('../../modules/admin/admin.controller');
    expect(typeof mod.generateAIDraftHandler).toBe('function');
  });

  it('knowledge-base exports getRelevantKBSections and getFullKnowledgeBase', async () => {
    const mod = await import('../knowledge-base');
    expect(typeof mod.getRelevantKBSections).toBe('function');
    expect(typeof mod.getFullKnowledgeBase).toBe('function');
  });

  it('ai/index barrel re-exports generateDraft and fetchDraftContext', async () => {
    const mod = await import('../index');
    expect(typeof mod.generateDraft).toBe('function');
    expect(typeof mod.fetchDraftContext).toBe('function');
  });
});
