import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyFunctionalDimensions, ensureReferencedElementAliases, ensureSidebarToggleAccessible, ensureUserMenuClass } from './html-features.js';
import { countVisibleLogoutControls } from './html-validator.js';

function hasClassElement(html: string, className: string) {
  return [...html.matchAll(/<[^>]+\s+class\s*=\s*(["'])([^"']*)\1[^>]*>/gi)]
    .some((match) => match[2].split(/\s+/).includes(className));
}

describe('functional HTML dimensions', () => {
  const template = fs.readFileSync('docs/测试母版-index.html', 'utf8');
  const dropdownDimension = [{ id: 'userInfo', value: '头像+姓名+角色+下拉' }];
  const userInfoCases = [
    ['头像+姓名+角色+下拉', true, true, true, true],
    ['头像+姓名+角色', true, true, true, false],
    ['头像+姓名+下拉', true, true, false, true],
    ['头像+姓名', true, true, false, false],
    ['仅姓名+下拉', false, true, false, true],
    ['仅姓名', false, true, false, false],
  ] as const;

  it('adds a complete user dropdown when requested by the dimension', () => {
    const html = applyFunctionalDimensions(template, dropdownDimension);
    expect(html).toContain('id="indexForgeUserMenuTrigger"');
    expect(html).toContain('id="indexForgeUserDropdown"');
    expect(html).toContain('修改密码');
    expect(html).toContain('退出登录');
  });

  it('does not duplicate the dropdown when applied twice', () => {
    const twice = applyFunctionalDimensions(applyFunctionalDimensions(template, dropdownDimension), dropdownDimension);
    expect(twice.match(/id="indexForgeUserDropdown"/g)).toHaveLength(1);
  });

  it('fully replaces an AI dropdown containing nested divider elements', () => {
    const aiDropdown = `<button class="user-menu-arrow" id="userDropdownTrigger"><i class="fa fa-angle-down"></i></button>
      <div class="user-dropdown" id="userDropdown">
        <button class="user-dropdown-item" id="modifyPwdItem">修改密码</button>
        <div class="user-dropdown-divider"></div>
        <button class="user-dropdown-item" id="logoutItem">退出登录</button>
      </div>`;
    const source = template.replace('<i class="fa fa-angle-down text-slate-400"></i>', aiDropdown);
    const html = applyFunctionalDimensions(source, dropdownDimension, template);
    expect(html.match(/id="indexForgeUserDropdown"/g)).toHaveLength(1);
    expect(html.match(/>修改密码</g)).toHaveLength(1);
    expect(html.match(/>退出登录</g)).toHaveLength(1);
    expect(hasClassElement(html, 'user-dropdown-divider')).toBe(false);
    expect(html).toContain('id="userDropdownTrigger" type="button" hidden');
    expect(html).toContain('id="userDropdown" type="button" hidden');
    expect(html).toContain('id="modifyPwdItem" type="button" hidden');
    expect(html).toContain('id="logoutItem" type="button" hidden');
    expect(html.indexOf('id="logoutItem" type="button" hidden')).toBeLessThan(html.indexOf('document.getElementById'));
  });

  it('repairs legacy records whose aliases were appended after the main script', () => {
    const html = `<body><div id="userMenuTrigger"></div><script>
      document.getElementById('userMenuTrigger').addEventListener('click', () => {});
      document.getElementById('modifyPwdItem').addEventListener('click', () => {});
      document.getElementById('logoutItem').addEventListener('click', () => {});
      document.getElementById('userDropdown').classList.remove('show');
    </script><button id="userDropdown" type="button" hidden></button></body>`;
    const repaired = ensureReferencedElementAliases(html);
    expect(repaired.indexOf('id="userDropdown" type="button" hidden')).toBeLessThan(repaired.indexOf('<script>'));
    expect(repaired.indexOf('id="modifyPwdItem" type="button" hidden')).toBeLessThan(repaired.indexOf('<script>'));
    expect(repaired.indexOf('id="logoutItem" type="button" hidden')).toBeLessThan(repaired.indexOf('<script>'));
    expect(repaired.match(/id="userDropdown"/g)).toHaveLength(1);
  });

  it('keeps a bottom sidebar toggle accessible after the sidebar collapses', () => {
    const source = `<html><head><style>.sidebar-collapsed .sidebar-footer { display: none; }</style></head><body>
      <aside class="app-sidebar"><div class="sidebar-footer"><button class="sidebar-toggle-btn" id="sidebarToggleBtn">收起</button></div></aside>
    </body></html>`;
    const repaired = ensureSidebarToggleAccessible(source);
    const twice = ensureSidebarToggleAccessible(repaired);
    expect(repaired).toContain('class="sidebar-footer indexforge-sidebar-toggle-container"');
    expect(repaired).toContain('.app-sidebar.sidebar-collapsed .indexforge-sidebar-toggle-container { display: flex !important; }');
    expect(twice.match(/IndexForge sidebar toggle accessibility/g)).toHaveLength(1);
  });

  it('places the dropdown trigger after the avatar and user information', () => {
    const html = applyFunctionalDimensions(template, dropdownDimension);
    expect(html.indexOf('id="indexForgeUserMenuTrigger"')).toBeGreaterThan(html.indexOf('class="avatar-circle"'));
    expect(html.indexOf('id="indexForgeUserMenuTrigger"')).toBeGreaterThan(html.indexOf('class="user-meta"'));
  });

  it('keeps the dropdown trigger in one row when AI uses a two-column user menu grid', () => {
    const source = template.replace('</head>', '<style>.user-menu { display: grid; grid-template-columns: auto 1fr; }</style></head>');
    const html = applyFunctionalDimensions(source, dropdownDimension);
    const userMenuRules = [...html.matchAll(/\.user-menu\s*\{([^}]*)\}/g)];
    const finalRule = userMenuRules.at(-1)?.[1] || '';

    expect(finalRule).toContain('display: flex');
    expect(finalRule).toContain('flex-direction: row');
    expect(finalRule).toContain('flex-wrap: nowrap');
    expect(html.indexOf(finalRule)).toBeGreaterThan(html.indexOf('grid-template-columns: auto 1fr'));
  });

  it('normalizes an AI user-menu-wrapper without treating a partial class name as the menu', () => {
    const source = template.replace('class="user-menu"', 'class="user-menu-wrapper" id="userMenuWrapper"');
    const html = applyFunctionalDimensions(source, dropdownDimension, template);
    const userMenus = [...html.matchAll(/<[^>]+\s+class\s*=\s*(["'])([^"']*)\1[^>]*>/gi)]
      .filter((match) => match[2].split(/\s+/).includes('user-menu'));

    expect(html).toContain('class="user-menu-wrapper user-menu" id="userMenuWrapper"');
    expect(userMenus).toHaveLength(1);
    expect(html).toContain('id="indexForgeUserMenuTrigger"');
    expect(html).toContain('id="indexForgeUserDropdown"');
  });

  it('repairs a stored generation containing the legacy user-menu-wrapper class', () => {
    const source = '<header><div class="user-menu-wrapper" id="userMenuWrapper"><div class="avatar-circle"></div><div class="user-meta"><span class="user-name">系统管理员</span></div></div></header>';
    const repaired = ensureUserMenuClass(source);

    expect(repaired).toContain('class="user-menu-wrapper user-menu"');
    expect(ensureUserMenuClass(repaired)).toBe(repaired);
  });

  it('restores the required user structure when AI removes it', () => {
    const source = template.replace(/\s*<div class="user-menu">[\s\S]*?<\/div>\s*<\/div>\s*<i class="fa fa-angle-down text-slate-400"><\/i>\s*<\/div>/, '');
    const html = applyFunctionalDimensions(source, dropdownDimension, template);
    expect(hasClassElement(html, 'user-menu')).toBe(true);
    expect(hasClassElement(html, 'avatar-circle')).toBe(true);
    expect(hasClassElement(html, 'user-name')).toBe(true);
    expect(hasClassElement(html, 'user-role')).toBe(true);
  });

  it('restores required user elements when AI removes only their classes', () => {
    const source = template
      .replace('class="avatar-circle"', 'class="avatar"')
      .replace('class="user-name"', 'class="account-name"')
      .replace('class="user-role"', 'class="account-role"');
    const html = applyFunctionalDimensions(source, dropdownDimension, template);
    expect(hasClassElement(html, 'avatar-circle')).toBe(true);
    expect(hasClassElement(html, 'user-name')).toBe(true);
    expect(hasClassElement(html, 'user-role')).toBe(true);
  });

  it('removes the complete user area when requested by the dimension', () => {
    const dimensions = [{ id: 'userInfo', value: '移除用户' }];
    const html = applyFunctionalDimensions(template, dimensions);
    expect(hasClassElement(html, 'user-menu')).toBe(false);
    expect(html).toContain('id="logoutBtn"');
  });

  it('keeps only the avatar and a functional logout button when requested', () => {
    const dimensions = [{ id: 'userInfo', value: '头像+退出登录按钮' }];
    const html = applyFunctionalDimensions(template, dimensions, template);
    expect(hasClassElement(html, 'avatar-circle')).toBe(true);
    expect(hasClassElement(html, 'user-name')).toBe(false);
    expect(hasClassElement(html, 'user-role')).toBe(false);
    expect(hasClassElement(html, 'user-dropdown')).toBe(false);
    expect(html).toContain('id="logoutBtn"');
    expect(html).toContain('退出登录');
    expect(html).toContain('function bindIndexForgeLogoutButton');
  });

  it('treats 无下拉 as an explicit request to remove the dropdown', () => {
    const dimensions = [{ id: 'userInfo', value: '头像+无下拉+退出登录' }];
    const html = applyFunctionalDimensions(template, dimensions, template);
    expect(hasClassElement(html, 'user-dropdown')).toBe(false);
    expect(html).not.toContain('修改密码');
    expect(countVisibleLogoutControls(html)).toBe(1);
  });

  it('uses the logout dimension to place logout outside the dropdown', () => {
    const dimensions = [
      { id: 'userInfo', value: '头像+姓名+下拉' },
      { id: 'logout', value: '头像右侧紧挨着顶栏最右侧' },
    ];
    const html = applyFunctionalDimensions(template, dimensions, template);
    expect(hasClassElement(html, 'user-dropdown')).toBe(true);
    expect(html).toContain('id="logoutBtn"');
    expect(html).not.toContain('data-user-action="logout"');
  });

  it('removes the dropdown while keeping one direct logout control', () => {
    const dimensions = [
      { id: 'userInfo', value: '头像+姓名' },
      { id: 'logout', value: '头像右侧紧挨着顶栏最右侧' },
    ];
    const html = applyFunctionalDimensions(template, dimensions, template);

    expect(hasClassElement(html, 'user-menu-trigger')).toBe(false);
    expect(hasClassElement(html, 'user-menu-arrow')).toBe(false);
    expect(hasClassElement(html, 'user-dropdown')).toBe(false);
    expect(html).not.toContain('修改密码');
    expect(html).toContain('id="logoutBtn"');
  });

  it('keeps one AI-generated direct logout control instead of adding a duplicate', () => {
    const source = template.replace(
      '<i class="fa fa-angle-down text-slate-400"></i>',
      '<button class="logout-btn-inline" id="inlineLogoutBtn" type="button"><i class="fa fa-sign-out"></i><span>退出登录</span></button>',
    );
    const dimensions = [
      { id: 'userInfo', value: '头像+无下拉+退出登录按钮' },
      { id: 'logout', value: '头像右侧紧挨着顶栏最右侧' },
    ];
    const html = applyFunctionalDimensions(source, dimensions, template);
    const visibleLogoutControls = [...html.matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi)]
      .filter((match) => !/\bhidden\b/i.test(match[2]) && /退出登录/.test(match[3]));

    expect(visibleLogoutControls).toHaveLength(1);
    expect(html).toContain('id="inlineLogoutBtn"');
    expect(html).not.toContain('indexforge-logout-button');
  });

  it('uses a gray fallback when a direct logout control must be added', () => {
    const dimensions = [{ id: 'userInfo', value: '头像+退出登录按钮' }];
    const html = applyFunctionalDimensions(template, dimensions, template);

    expect(html).toContain('color: #64748B');
    expect(html).not.toContain('color: #DC2626');
  });

  it.each(userInfoCases)('applies user info shape %s', (value, hasAvatar, hasName, hasRole, hasDropdown) => {
    const dimensions = [{ id: 'userInfo', value }];
    const html = applyFunctionalDimensions(template, dimensions);
    expect(hasClassElement(html, 'avatar-circle')).toBe(hasAvatar);
    expect(hasClassElement(html, 'user-name')).toBe(hasName);
    expect(hasClassElement(html, 'user-role')).toBe(hasRole);
    expect(hasClassElement(html, 'user-dropdown')).toBe(hasDropdown);
  });
});
