import { describe, expect, it } from 'vitest';
import { createIntegrationAuth } from './integration-auth.js';

describe('integration API authentication', () => {
  it('issues a bearer token only for the configured account', () => {
    const auth = createIntegrationAuth({ username: 'ruanzhu-system', password: 'secret', tokenTtlSeconds: 7_200 });
    expect(auth.login('ruanzhu-system', 'wrong')).toBeNull();
    const result = auth.login('ruanzhu-system', 'secret');
    expect(result).toMatchObject({ tokenType: 'Bearer', expiresIn: 7_200 });
    expect(auth.authorize(`Bearer ${result?.accessToken}`)).toBe(true);
  });

  it('rejects missing, malformed, unknown and expired tokens', () => {
    let current = 1_000;
    const auth = createIntegrationAuth({ username: 'client', password: 'secret', tokenTtlSeconds: 60, now: () => current });
    const result = auth.login('client', 'secret')!;
    expect(auth.authorize('')).toBe(false);
    expect(auth.authorize(result.accessToken)).toBe(false);
    expect(auth.authorize('Bearer unknown')).toBe(false);
    current += 60_001;
    expect(auth.authorize(`Bearer ${result.accessToken}`)).toBe(false);
  });

  it('stays disabled when the integration account is not fully configured', () => {
    const auth = createIntegrationAuth({ username: '', password: '', tokenTtlSeconds: 7_200 });
    expect(auth.configured).toBe(false);
    expect(auth.login('', '')).toBeNull();
  });
});
