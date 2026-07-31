import { describe, expect, it } from 'vitest';
import { createAdminAuth } from './admin-auth.js';

describe('admin authentication', () => {
  it('creates a session only for the configured account', () => {
    const auth = createAdminAuth({ username: 'admin', password: 'secret', sessionTtlSeconds: 7_200 });
    expect(auth.login('admin', 'wrong')).toBeNull();
    const result = auth.login('admin', 'secret');
    expect(result).toMatchObject({ username: 'admin', expiresIn: 7_200 });
    expect(auth.authorize(result?.sessionToken || '')).toBe(true);
  });

  it('expires and revokes sessions', () => {
    let current = 1_000;
    const auth = createAdminAuth({ username: 'admin', password: 'secret', sessionTtlSeconds: 60, now: () => current });
    const first = auth.login('admin', 'secret')!;
    auth.logout(first.sessionToken);
    expect(auth.authorize(first.sessionToken)).toBe(false);
    const second = auth.login('admin', 'secret')!;
    current += 60_001;
    expect(auth.authorize(second.sessionToken)).toBe(false);
  });

  it('stays disabled when the admin account is not fully configured', () => {
    const auth = createAdminAuth({ username: '', password: '', sessionTtlSeconds: 7_200 });
    expect(auth.configured).toBe(false);
    expect(auth.login('', '')).toBeNull();
  });
});
