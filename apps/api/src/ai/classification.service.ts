/**
 * AI Classification Service
 *
 * The single entry point for ticket classification within business services.
 * It owns the interaction with AIProviderManager and all DB persistence logic.
 *
 * Key guarantees:
 *  - Ticket creation never waits for classification (runs asynchronously).
 *  - On successful classification, sets initial active category and priority.
 *  - Preserves original AI suggestions in ai_suggested_* for auditability.
 *  - Respects admin manual overrides (category_manually_overridden / priority_manually_overridden).
 *    If an admin changed a field before AI finishes, the admin's choice is preserved.
 *    If an admin changed only category, AI still populates priority, and vice-versa.
 *  - NEVER throws — always resolves with 'success' or 'failed'.
 */

import { Ticket } from '../models/Ticket';
import { getAIProviderManager } from './provider-manager';
import type { ClassifyTicketInput } from './types';
import type { TicketCategory, TicketPriority } from '@bookleaf/shared';

export interface ClassificationResult {
  status: 'success' | 'failed';
  category?: string;
  priority?: string;
}

/**
 * Classify a ticket and persist the AI suggestions and active fields.
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

    // Refresh state if reload is available (Sequelize model instance) to prevent race conditions
    if (typeof (ticket as unknown as { reload?: () => Promise<unknown> }).reload === 'function') {
      try {
        await (ticket as unknown as { reload: () => Promise<unknown> }).reload();
      } catch {
        // Defensive: in mock environments or test stubs, reload may fail
      }
    }

    const updatePayload: Record<string, unknown> = {
      ai_suggested_category: result.category,
      ai_suggested_priority: result.priority,
      ai_classification_status: 'success',
    };

    // Only update active category if it has NOT been manually overridden by an admin
    if (!ticket.category_manually_overridden) {
      updatePayload['category'] = result.category as TicketCategory;
    }

    // Only update active priority if it has NOT been manually overridden by an admin
    if (!ticket.priority_manually_overridden) {
      updatePayload['priority'] = result.priority as TicketPriority;
    }

    await ticket.update(updatePayload);

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

