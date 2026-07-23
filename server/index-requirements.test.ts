import { describe, expect, it } from 'vitest';
import { enforcedIndexRequirements } from './index-requirements.js';

describe('protected index requirements', () => {
  it('always restores R1-R3 as enabled built-in requirements', () => {
    const requirements = [
      { id: 'R3', name: '已篡改', description: '', level: 'flexible', validationType: 'ai', enabled: false, sortOrder: 9 },
      { id: 'R4', name: '导航栏位置', description: '', level: 'required', validationType: 'ai', enabled: true, sortOrder: 3 },
    ];
    const result = enforcedIndexRequirements(requirements);
    expect(result.slice(0, 3).map((item) => [item.id, item.validationType, item.builtinValidator, item.enabled])).toEqual([
      ['R1', 'builtin', 'h1-text', true],
      ['R2', 'builtin', 'tailwind-config', true],
      ['R3', 'builtin', 'inline-submenu', true],
    ]);
    expect(result.map((item) => item.id)).toContain('R4');
  });
});
