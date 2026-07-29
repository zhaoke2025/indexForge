import crypto from 'node:crypto';

type IntegrationAuthOptions = {
  username: string;
  password: string;
  tokenTtlSeconds: number;
  now?: () => number;
};

function equalSecret(actual: string, expected: string) {
  const actualHash = crypto.createHash('sha256').update(actual).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

export function createIntegrationAuth(options: IntegrationAuthOptions) {
  const now = options.now || Date.now;
  const tokenTtlSeconds = Math.min(86_400, Math.max(60, options.tokenTtlSeconds || 7_200));
  const tokens = new Map<string, number>();
  const configured = Boolean(options.username && options.password);

  function removeExpiredTokens() {
    const current = now();
    for (const [token, expiresAt] of tokens) {
      if (expiresAt <= current) tokens.delete(token);
    }
  }

  return {
    configured,
    login(username: string, password: string) {
      const usernameMatches = equalSecret(username, options.username);
      const passwordMatches = equalSecret(password, options.password);
      if (!configured || !usernameMatches || !passwordMatches) return null;
      removeExpiredTokens();
      const accessToken = crypto.randomBytes(32).toString('base64url');
      tokens.set(accessToken, now() + tokenTtlSeconds * 1_000);
      return { accessToken, tokenType: 'Bearer' as const, expiresIn: tokenTtlSeconds };
    },
    authorize(authorization: string) {
      removeExpiredTokens();
      const match = /^Bearer\s+(\S+)$/i.exec(authorization);
      return Boolean(match && tokens.has(match[1]));
    },
  };
}
