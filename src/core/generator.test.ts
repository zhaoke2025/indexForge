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

  it.each([
    ['标题右侧', '菜单', '<h1', 'sidebarToggleBtn', 'fa-bars'],
    ['侧边栏底部', '双箭头', 'sidebar-menu-container', 'sidebar-toggle-bottom', 'fa-angle-double-left'],
    ['用户信息左侧', '单箭头', 'id="sidebarToggleBtn"', '<div class="user-menu">', 'fa-angle-left'],
  ])('places the sidebar toggle at %s with the selected icon', (position, icon, before, after, iconClass) => {
    const dimensions = defaultDimensions.map((dimension) => {
      if (dimension.id === 'sidebarTogglePosition') return { ...dimension, value: position };
      if (dimension.id === 'sidebarToggleIcon') return { ...dimension, value: icon };
      return dimension;
    });
    const result = generateIndexHtml(templateHtml, {
      systemName: '测试系统', version: '1.0', preset: stylePresets[0],
      user: { userName: '管理员', role: '管理员', avatarIcon: 'fa-user', showRole: true },
      dimensions, menuConfig: defaultMenuConfig,
    });
    expect(result.html.indexOf(before)).toBeLessThan(result.html.indexOf(after));
    expect(result.html).toContain(`class="fa ${iconClass}" id="toggleIcon"`);
    expect(result.validation.valid).toBe(true);
  });
});
