import { describe, expect, it } from 'vitest';
import { formatBeijingTime } from './time.js';

describe('API time formatting', () => {
  it('returns UTC timestamps as Beijing time', () => {
    expect(formatBeijingTime('2026-07-31T07:22:33.028Z')).toBe('2026-07-31 15:22:33');
  });

  it('keeps invalid legacy values unchanged', () => {
    expect(formatBeijingTime('unknown')).toBe('unknown');
  });
});
