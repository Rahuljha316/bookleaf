/**
 * BookLeaf Shared Package
 *
 * Contains shared types and validation schemas consumable by both
 * web (frontend) and api (backend).
 */

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
  environment: string;
}

export const APP_CONFIG = {
  name: 'BookLeaf Author Support Portal',
  version: '0.1.0',
} as const;

