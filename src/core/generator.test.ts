import { describe, expect, it } from 'vitest';
import templateHtml from '../../docs/母版-index.html?raw';
import { defaultDimensions } from '../data/defaultDimensions';
import { defaultMenuConfig } from '../data/defaultMenuConfig';
import { stylePresets } from '../data/stylePresets';
import { generateIndexHtml } from './generator';

describe('generateIndexHtml', () => {
  it('generates a valid escaped page', () => {
    const result = generateIndexHtml(templateHtml, {
      systemName: '<测试平台>', version: '1.2', preset: stylePresets[0],
      user: { userName: '管理员', role: '管理员', avatarIcon: 'fa-user', showRole: true },
      dimensions: defaultDimensions, menuConfig: defaultMenuConfig,
    });
    expect(result.validation.valid).toBe(true);
    expect(result.displayName).toBe('<测试平台> V1.2');
    expect(result.html).toContain('&lt;测试平台&gt; V1.2');
  });
});
