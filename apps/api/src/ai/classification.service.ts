/**
 * AI Classification Service
 *
 * The single entry point for ticket classification within business services.
 * It owns the interaction with AIProviderManager and all DB persistence logic.
 *
 * Key guarantee: this function NEVER throws — it always resolves, returning
 * either 'success' or 'failed', so ticket creation is never blocked.
 */

import { Ticket } from '../models/Ticket';
import { getAIProviderManager } from './provider-manager';
import type { ClassifyTicketInput } from './types';

export interface ClassificationResult {
  status: 'success' | 'failed';
  category?: string;
  priority?: string;
}

/**
 * Classify a ticket and persist the AI suggestions.
 *
 * Rules:
 *  - Never overwrites `ticket.category` or `ticket.priority` (admin-controlled).
 *  - On any failure (AI error, DB error), sets `ai_classification_status` to `'failed'`.
 *  - Runs asynchronously after ticket creation; never delays the HTTP response.
 */
export async function classifyAndPersist(
  ticket: Ticket,
  input: ClassifyTicketInput,
): Promise<ClassificationResult> {
  const manager = getAIProviderManager();

  try {
    const result = await manager.classifyTicket(input);

    if (!result) {
      // All providers failed or none configured
      await ticket.update({
        ai_classification_status: 'failed',
        ai_suggested_category: null,
        ai_suggested_priority: null,
      });
      return { status: 'failed' };
    }

    // Persist AI suggestions — never touch category / priority
    await ticket.update({
      ai_suggested_category: result.category,
      ai_suggested_priority: result.priority,
      ai_classification_status: 'success',
    });

    return { status: 'success', category: result.category, priority: result.priority };
  } catch (err) {
    // Defensive catch: even if the update itself fails, do not throw
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AI] classifyAndPersist: unexpected error for ticket ${ticket.id}: ${msg}`);

    try {
      await ticket.update({ ai_classification_status: 'failed' });
    } catch (updateErr) {
      const updateMsg = updateErr instanceof Error ? updateErr.message : String(updateErr);
      console.error(
        `[AI] classifyAndPersist: could not set failed status for ticket ${ticket.id}: ${updateMsg}`,
      );
    }

    return { status: 'failed' };
  }
}

