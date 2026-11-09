import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIAdapter } from '../providers/openai.adapter';
import { ClassifyTicketInput } from '../types';
import type OpenAI from 'openai';

const sampleInput: ClassifyTicketInput = {
  subject: 'Royalty check delayed',
  description: 'My October royalty check has not arrived yet.',
};

describe('OpenAIAdapter', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful classification', () => {
    it('successfully classifies a ticket with valid JSON response', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'Royalty & Payments',
                priority: 'High',
              }),
            },
          },
        ],
      });

      const mockClient = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as unknown as OpenAI;

      const adapter = new OpenAIAdapter('fake-key', 'gpt-4o-mini', 15_000, mockClient);
      const result = await adapter.classifyTicket(sampleInput);

      expect(result).toEqual({
        category: 'Royalty & Payments',
        priority: 'High',
      });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-4o-mini');
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
      expect(callArgs.temperature).toBe(0);
    });

    it('strips markdown code fences if returned by the model', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n{"category": "General Inquiry", "priority": "Low"}\n```',
            },
          },
        ],
      });

      const mockClient = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as unknown as OpenAI;

      const adapter = new OpenAIAdapter('fake-key', 'gpt-4o-mini', 15_000, mockClient);
      const result = await adapter.classifyTicket(sampleInput);

      expect(result).toEqual({
        category: 'General Inquiry',
        priority: 'Low',
      });
    });
  });

  describe('Text generation', () => {
    it('generates text draft with systemInstruction and prompt', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: 'Dear Author,\n\nHere is the update regarding your book.\n\nWarm regards,\nBookLeaf Support Team',
            },
          },
        ],
      });

      const mockClient = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as unknown as OpenAI;

      const adapter = new OpenAIAdapter('fake-key', 'gpt-4o-mini', 15_000, mockClient);
      const text = await adapter.generateText('Please write a reply', {
        systemInstruction: 'You are BookLeaf Support.',
        temperature: 0.4,
        maxTokens: 1024,
      });

      expect(text).toContain('Dear Author');
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages).toEqual([
        { role: 'system', content: 'You are BookLeaf Support.' },
        { role: 'user', content: 'Please write a reply' },
      ]);
      expect(callArgs.temperature).toBe(0.4);
      expect(callArgs.max_tokens).toBe(1024);
    });
  });

  describe('Error handling', () => {
    it('catches rate limit error and classifies as retryable', async () => {
      const rateLimitError = new Error('Rate limit reached');
      Object.assign(rateLimitError, { constructor: { name: 'RateLimitError' } });

      const mockCreate = vi.fn().mockRejectedValue(rateLimitError);

      const mockClient = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as unknown as OpenAI;

      const adapter = new OpenAIAdapter('fake-key', 'gpt-4o-mini', 15_000, mockClient);
      await expect(adapter.classifyTicket(sampleInput)).rejects.toThrow(/OpenAI rate limit/);
    });

    it('rejects truncated text generation when finish_reason is length', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            finish_reason: 'length',
            message: {
              content: 'Incomplete response...',
            },
          },
        ],
      });

      const mockClient = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as unknown as OpenAI;

      const adapter = new OpenAIAdapter('fake-key', 'gpt-4o-mini', 15_000, mockClient);
      await expect(adapter.generateText('Prompt')).rejects.toThrow(/truncated due to max_tokens length limit/);
    });
  });
});
