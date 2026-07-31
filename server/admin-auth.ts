import crypto from 'node:crypto';
import { equalSecret } from './integration-auth.js';

type AdminAuthOptions = {
  username: string;
  password: string;
  sessionTtlSeconds: number;
  now?: () => number;
};

export function createAdminAuth(options: AdminAuthOptions) {
  const now = options.now || Date.now;
  const sessionTtlSeconds = Math.min(86_400, Math.max(60, options.sessionTtlSeconds || 28_800));
  const sessions = new Map<string, number>();
  const configured = Boolean(options.username && options.password);

  function removeExpiredSessions() {
    const current = now();
    for (const [token, expiresAt] of sessions) {
      if (expiresAt <= current) sessions.delete(token);
    }
  }

  return {
    configured,
    login(username: string, password: string) {
      const usernameMatches = equalSecret(username, options.username);
      const passwordMatches = equalSecret(password, options.password);
      if (!configured || !usernameMatches || !passwordMatches) return null;
      removeExpiredSessions();
      const sessionToken = crypto.randomBytes(32).toString('base64url');
      sessions.set(sessionToken, now() + sessionTtlSeconds * 1_000);
      return { sessionToken, username: options.username, expiresIn: sessionTtlSeconds };
    },
    authorize(sessionToken: string) {
      removeExpiredSessions();
      return Boolean(sessionToken && sessions.has(sessionToken));
    },
    logout(sessionToken: string) {
      if (sessionToken) sessions.delete(sessionToken);
    },
  };
}
