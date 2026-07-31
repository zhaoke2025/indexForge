import { describe, expect, it } from 'vitest';
import { createIntegrationAuth } from './integration-auth.js';

describe('integration API authentication', () => {
  it('accepts only the configured bearer token', () => {
    const auth = createIntegrationAuth({ token: 'fixed-api-token' });
    expect(auth.authorize('Bearer fixed-api-token')).toBe(true);
    expect(auth.authorize('Bearer wrong')).toBe(false);
  });

  it('rejects missing and malformed authorization headers', () => {
    const auth = createIntegrationAuth({ token: 'fixed-api-token' });
    expect(auth.authorize('')).toBe(false);
    expect(auth.authorize('fixed-api-token')).toBe(false);
    expect(auth.authorize('Basic fixed-api-token')).toBe(false);
  });

  it('stays disabled when the API token is not configured', () => {
    const auth = createIntegrationAuth({ token: '' });
    expect(auth.configured).toBe(false);
    expect(auth.authorize('Bearer anything')).toBe(false);
  });
});
