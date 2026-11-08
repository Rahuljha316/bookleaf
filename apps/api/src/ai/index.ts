/**
 * AI module barrel export
 *
 * Public surface that business services should import from.
 * Provider-specific internals are intentionally not re-exported here.
 */

export { classifyAndPersist } from './classification.service';
export type { ClassificationResult } from './classification.service';
export type { ClassifyTicketInput, ClassificationResponse, TextGenerationOptions } from './types';

// Reply draft generation (Phase 2)
export { generateDraft, fetchDraftContext, cleanDraftOutput, isDraftComplete } from './reply-draft.service';
export type { DraftResult, DraftContext } from './reply-draft.service';

// Manager singleton access (used by health checks or diagnostics)
export { getAIProviderManager } from './provider-manager';

// Test helpers — only imported in test files
export { _setAIProviderManagerForTesting, _resetAIProviderManager } from './provider-manager';

