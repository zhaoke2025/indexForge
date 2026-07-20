import { describe, expect, it, vi } from 'vitest';
import { repairUntilValid } from './repair-loop.js';

describe('AI repair loop', () => {
  it('repairs against the latest errors until validation passes', async () => {
    const repair = vi.fn(async (_html: string, errors: string[], attempt: number) => attempt === 1 ? 'second' : 'valid');
    const result = await repairUntilValid({
      initialHtml: 'first',
      inspect: (html) => ({ validation: { valid: html === 'valid', errors: html === 'first' ? ['缺少标题'] : html === 'second' ? ['缺少表单'] : [] } }),
      repair,
      maxAttempts: 3,
    });
    expect(result.html).toBe('valid');
    expect(result.attempts).toBe(2);
    expect(repair.mock.calls[1][1]).toEqual(['缺少表单']);
  });

  it('stops after the configured maximum attempts', async () => {
    const repair = vi.fn(async () => 'still-invalid');
    const result = await repairUntilValid({
      initialHtml: 'invalid',
      inspect: () => ({ validation: { valid: false, errors: ['仍未通过'] } }),
      repair,
      maxAttempts: 3,
    });
    expect(result.inspection.validation.valid).toBe(false);
    expect(result.attempts).toBe(3);
    expect(repair).toHaveBeenCalledTimes(3);
  });
});
