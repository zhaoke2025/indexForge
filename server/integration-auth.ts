import crypto from 'node:crypto';

type IntegrationAuthOptions = {
  token: string;
};

export function equalSecret(actual: string, expected: string) {
  const actualHash = crypto.createHash('sha256').update(actual).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

export function createIntegrationAuth(options: IntegrationAuthOptions) {
  return {
    configured: Boolean(options.token),
    authorize(authorization: string) {
      const match = /^Bearer\s+(\S+)$/i.exec(authorization);
      return Boolean(options.token && match && equalSecret(match[1], options.token));
    },
  };
}
