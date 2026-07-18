import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyFunctionalDimensions } from './html-features.js';
import { validateHtml } from './html-validator.js';

function hasClassElement(html: string, className: string) {
  return new RegExp(`<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'i').test(html);
}

describe('functional HTML dimensions', () => {
  const template = fs.readFileSync('docs/测试母版-index.html', 'utf8');
  const dropdownDimension = [{ id: 'userInfo', value: '头像+姓名+角色+下拉' }];
  const userInfoCases = [
    ['头像+姓名+角色+下拉', true, true, true],
    ['头像+姓名+角色', true, true, false],
    ['头像+姓名+下拉', true, false, true],
    ['头像+姓名', true, false, false],
    ['仅姓名+下拉', false, false, true],
    ['仅姓名', false, false, false],
  ] as const;

  it('adds a complete user dropdown when requested by the dimension', () => {
    const html = applyFunctionalDimensions(template, dropdownDimension);
    expect(html).toContain('id="indexForgeUserMenuTrigger"');
    expect(html).toContain('id="indexForgeUserDropdown"');
    expect(html).toContain('修改密码');
    expect(html).toContain('退出登录');
    expect(validateHtml(html, { dimensions: dropdownDimension }).valid).toBe(true);
  });

  it('does not duplicate the dropdown when applied twice', () => {
    const twice = applyFunctionalDimensions(applyFunctionalDimensions(template, dropdownDimension), dropdownDimension);
    expect(twice.match(/id="indexForgeUserDropdown"/g)).toHaveLength(1);
  });

  it('fully replaces an AI dropdown containing nested divider elements', () => {
    const aiDropdown = `<button class="user-menu-arrow" id="userDropdownTrigger"><i class="fa fa-angle-down"></i></button>
      <div class="user-dropdown" id="userDropdown">
        <button class="user-dropdown-item">修改密码</button>
        <div class="user-dropdown-divider"></div>
        <button class="user-dropdown-item">退出登录</button>
      </div>`;
    const source = template.replace('<i class="fa fa-angle-down text-slate-400"></i>', aiDropdown);
    const html = applyFunctionalDimensions(source, dropdownDimension, template);
    expect(html.match(/id="indexForgeUserDropdown"/g)).toHaveLength(1);
    expect(html.match(/>修改密码</g)).toHaveLength(1);
    expect(html.match(/>退出登录</g)).toHaveLength(1);
    expect(hasClassElement(html, 'user-dropdown-divider')).toBe(false);
    expect(html).toContain('id="userDropdownTrigger" type="button" hidden');
    expect(html).toContain('id="userDropdown" type="button" hidden');
    expect(validateHtml(html, { dimensions: dropdownDimension }).valid).toBe(true);
  });

  it('places the dropdown trigger after the avatar and user information', () => {
    const html = applyFunctionalDimensions(template, dropdownDimension);
    expect(html.indexOf('id="indexForgeUserMenuTrigger"')).toBeGreaterThan(html.indexOf('class="avatar-circle"'));
    expect(html.indexOf('id="indexForgeUserMenuTrigger"')).toBeGreaterThan(html.indexOf('class="user-meta"'));
  });

  it('restores the required user structure when AI removes it', () => {
    const source = template.replace(/\s*<div class="user-menu">[\s\S]*?<\/div>\s*<\/div>\s*<i class="fa fa-angle-down text-slate-400"><\/i>\s*<\/div>/, '');
    const html = applyFunctionalDimensions(source, dropdownDimension, template);
    expect(hasClassElement(html, 'user-menu')).toBe(true);
    expect(hasClassElement(html, 'avatar-circle')).toBe(true);
    expect(hasClassElement(html, 'user-name')).toBe(true);
    expect(hasClassElement(html, 'user-role')).toBe(true);
    expect(validateHtml(html, { dimensions: dropdownDimension }).valid).toBe(true);
  });

  it('restores required user elements when AI removes only their classes', () => {
    const source = template
      .replace('class="avatar-circle"', 'class="avatar"')
      .replace('class="user-name"', 'class="account-name"')
      .replace('class="user-role"', 'class="account-role"');
    const html = applyFunctionalDimensions(source, dropdownDimension, template);
    expect(validateHtml(html, { dimensions: dropdownDimension }).valid).toBe(true);
  });

  it('removes the complete user area when requested by the dimension', () => {
    const dimensions = [{ id: 'userInfo', value: '移除用户' }];
    const html = applyFunctionalDimensions(template, dimensions);
    expect(hasClassElement(html, 'user-menu')).toBe(false);
    expect(validateHtml(html, { dimensions }).valid).toBe(true);
  });

  it.each(userInfoCases)('applies user info shape %s', (value, hasAvatar, hasRole, hasDropdown) => {
    const dimensions = [{ id: 'userInfo', value }];
    const html = applyFunctionalDimensions(template, dimensions);
    expect(hasClassElement(html, 'avatar-circle')).toBe(hasAvatar);
    expect(hasClassElement(html, 'user-role')).toBe(hasRole);
    expect(hasClassElement(html, 'user-dropdown')).toBe(hasDropdown);
    expect(hasClassElement(html, 'user-name')).toBe(true);
    expect(validateHtml(html, { dimensions }).valid).toBe(true);
  });
});
