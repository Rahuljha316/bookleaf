import { describe, expect, it } from 'vitest';
import { adminListTicketsQuerySchema } from './ticket.schema';

describe('adminListTicketsQuerySchema date filters', () => {
  it('accepts a valid inclusive date range', () => {
    const result = adminListTicketsQuerySchema.safeParse({
      created_from: '2026-11-01',
      created_to: '2026-11-09',
    });
    expect(result.success).toBe(true);
  });

  it('accepts either date bound independently', () => {
    expect(adminListTicketsQuerySchema.safeParse({ created_from: '2026-11-01' }).success).toBe(true);
    expect(adminListTicketsQuerySchema.safeParse({ created_to: '2026-11-09' }).success).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(adminListTicketsQuerySchema.safeParse({ created_from: '2026-02-30' }).success).toBe(false);
  });

  it('rejects a start date after the end date', () => {
    const result = adminListTicketsQuerySchema.safeParse({
      created_from: '2026-11-10',
      created_to: '2026-11-09',
    });
    expect(result.success).toBe(false);
  });
});
