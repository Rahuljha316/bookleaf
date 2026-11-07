import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GeminiAdapter,
  classifyGeminiError,
  extractGeminiErrorInfo,
  sanitizeLogMessage,
} from '../providers/gemini.adapter';
import { AIProviderError, ClassifyTicketInput } from '../types';
import type { GoogleGenAI } from '@google/genai';

const sampleInput: ClassifyTicketInput = {
  subject: 'Royalty check delayed',
  description: 'My October royalty check has not arrived yet.',
};

describe('GeminiAdapter', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful classification', () => {
    it('successfully classifies a ticket with valid JSON response', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          category: 'Royalty & Payments',
          priority: 'High',
        }),
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI;

      const adapter = new GeminiAdapter('fake-key', 'gemini-3.8-flash', 45_000, mockClient);
      const result = await adapter.classifyTicket(sampleInput);

      expect(result).toEqual({
        category: 'Royalty & Payments',
        priority: 'High',
      });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe('gemini-3.8-flash');
      expect(callArgs.config.responseMimeType).toBe('application/json');
      expect(callArgs.config.temperature).toBe(0);
      expect(callArgs.config.abortSignal).toBeUndefined();
      expect(callArgs.config.httpOptions).toBeUndefined();
    });

    it('strips markdown code fences if returned by the model', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: '```json\n{"category": "General Inquiry", "priority": "Low"}\n```',
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI;

      const adapter = new GeminiAdapter('fake-key', 'gemini-3.8-flash', 45_000, mockClient);
      const result = await adapter.classifyTicket(sampleInput);

      expect(result).toEqual({
        category: 'General Inquiry',
        priority: 'Low',
      });
    });
  });

  describe('Error handling', () => {
    it('catches SDK timeout / deadline exceeded error and classifies as retryable', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue({
        status: 504,
        code: 'DEADLINE_EXCEEDED',
        message: 'Deadline expired before operation could complete.',
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI;

      const adapter = new GeminiAdapter('fake-key', 'gemini-3.8-flash', 45_000, mockClient);

      await expect(adapter.classifyTicket(sampleInput)).rejects.toThrow(
        /Gemini timeout: Deadline expired before operation could complete./,
      );
    });

    it('classifies immediate network failure as retryable', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue(new Error('Immediate network failure'));

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI;

      const adapter = new GeminiAdapter('fake-key', 'gemini-3.8-flash', 45_000, mockClient);

      await expect(adapter.classifyTicket(sampleInput)).rejects.toThrow(AIProviderError);
    });
  });

  describe('Error extraction and classification', () => {
    it('classifies 401 unauthenticated errors as fatal and captures status/code', () => {
      const raw = {
        status: 401,
        code: 'UNAUTHENTICATED',
        message: 'API key not valid',
      };
      const err = classifyGeminiError(raw);
      expect(err.kind).toBe('fatal');
      expect(err.status).toBe(401);
      expect(err.code).toBe('UNAUTHENTICATED');
      expect(err.message).toContain('Gemini auth/billing error: API key not valid');
    });

    it('extracts status and code from embedded JSON error strings without leaking keys', () => {
      const raw = new Error(
        'got status: 400. {"error":{"code":400,"message":"API key not valid: key=TEST_SECRET_VALUE","status":"INVALID_ARGUMENT"}}',
      );

      const err = classifyGeminiError(raw);

      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_ARGUMENT');
      expect(err.message).not.toContain('TEST_SECRET_VALUE');
      expect(err.message).toContain('[REDACTED]');
    });

    it('classifies 429 quota exhaustion as retryable with status and code', () => {
      const raw = {
        status: 429,
        code: 'RESOURCE_EXHAUSTED',
        message: 'Quota exceeded for quota metric',
      };
      const err = classifyGeminiError(raw);
      expect(err.kind).toBe('retryable');
      expect(err.status).toBe(429);
      expect(err.code).toBe('RESOURCE_EXHAUSTED');
      expect(err.message).toContain('Gemini rate limit: Quota exceeded');
    });

    it('classifies 404 model not found as fatal', () => {
      const raw = {
        status: 404,
        code: 'NOT_FOUND',
        message: 'models/gemini-3.8-flash is not found for API version v1beta',
      };
      const err = classifyGeminiError(raw);
      expect(err.kind).toBe('fatal');
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });

    it('classifies 503 unavailable as retryable', () => {
      const raw = {
        status: 503,
        code: 'UNAVAILABLE',
        message: 'The model is overloaded. Please try again later.',
      };
      const err = classifyGeminiError(raw);
      expect(err.kind).toBe('retryable');
      expect(err.status).toBe(503);
      expect(err.code).toBe('UNAVAILABLE');
    });

    it('redacts sensitive ticket content from messages', () => {
      const raw = 'Error processing: Ticket subject: Secret Book Plot Ticket description: Highly confidential details';
      const sanitized = sanitizeLogMessage(raw);
      expect(sanitized).not.toContain('Secret Book Plot');
      expect(sanitized).not.toContain('Highly confidential details');
      expect(sanitized).toContain('Ticket subject: [REDACTED]');
    });
  });

  describe('generateText', () => {
    it('successfully generates text', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: 'This is a drafted response.',
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI;

      const adapter = new GeminiAdapter('fake-key', 'gemini-3.8-flash', 45_000, mockClient);
      const text = await adapter.generateText('Draft a reply');

      expect(text).toBe('This is a drafted response.');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe('gemini-3.8-flash');
      expect(callArgs.contents).toBe('Draft a reply');
      expect(callArgs.config.abortSignal).toBeUndefined();
      expect(callArgs.config.httpOptions).toBeUndefined();
    });

    it('handles SDK errors in generateText and maps them to AIProviderError', async () => {
      const mockGenerateContent = vi.fn().mockRejectedValue({
        status: 504,
        code: 'DEADLINE_EXCEEDED',
        message: 'Deadline expired before operation could complete.',
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI;

      const adapter = new GeminiAdapter('fake-key', 'gemini-3.8-flash', 45_000, mockClient);

      await expect(adapter.generateText('Draft a reply')).rejects.toThrow(
        /Gemini timeout: Deadline expired before operation could complete./,
      );
    });

    it('throws invalid AIProviderError when empty text is returned', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: '   ',
      });

      const mockClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI;

      const adapter = new GeminiAdapter('fake-key', 'gemini-3.8-flash', 45_000, mockClient);

      await expect(adapter.generateText('Draft a reply')).rejects.toThrow(
        /Gemini returned empty text response/,
      );
    });
  });
});

