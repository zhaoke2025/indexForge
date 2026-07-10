import { describe, expect, it } from 'vitest';
import { buildDisplayName, normalizeVersion } from './version';

describe('version helpers', () => {
  it('normalizes empty and numeric versions', () => {
    expect(normalizeVersion()).toBe('V1.0');
    expect(normalizeVersion('1.2')).toBe('V1.2');
    expect(normalizeVersion('v2')).toBe('V2');
  });

  it('does not append a duplicate version', () => {
    expect(buildDisplayName('运营平台 V2.0', 'V1.0')).toBe('运营平台 V2.0');
    expect(buildDisplayName('运营平台', '2.0')).toBe('运营平台 V2.0');
  });
});
