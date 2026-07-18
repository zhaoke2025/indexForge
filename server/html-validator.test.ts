import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateHtml } from './html-validator.js';

describe('server HTML validator', () => {
  const template = fs.readFileSync('docs/测试母版-index.html', 'utf8');

  it('accepts the built-in template', () => {
    expect(validateHtml(template).valid).toBe(true);
  });

  it('rejects a broken core function', () => {
    const result = validateHtml(template.replace('function loadPage', 'function removedLoadPage'));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('缺少 loadPage 函数');
  });

  it('does not treat a business menu named 供应商开发中心 as a placeholder', () => {
    expect(validateHtml(template.replace('企业运营管理平台', '供应商开发中心')).valid).toBe(true);
  });

  it('still rejects an exact 开发中 placeholder', () => {
    const result = validateHtml(template.replace('</body>', '<div>开发中</div></body>'));
    expect(result.errors).toContain('检测到占位文字：开发中');
  });

  it('rejects a decorative user arrow when the dropdown dimension is enabled', () => {
    const result = validateHtml(template, { dimensions: [{ id: 'userInfo', value: '头像+姓名+角色+下拉' }] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('用户信息要求下拉菜单，但缺少 user-dropdown 菜单结构');
  });

  it('accepts a complete user dropdown interaction', () => {
    const dropdown = `<button class="user-menu-trigger" type="button">下拉</button>
      <div class="user-dropdown"><button>修改密码</button><button>退出登录</button></div>`;
    const script = `<script>
      const userDropdown = document.querySelector('.user-dropdown');
      document.querySelector('.user-menu-trigger').addEventListener('click', () => userDropdown.classList.toggle('open'));
      document.addEventListener('click', () => userDropdown.classList.remove('open'));
    </script>`;
    const html = template.replace('<div class="user-menu">', `<div class="user-menu">${dropdown}`).replace('</body>', `${script}</body>`);
    expect(validateHtml(html, { dimensions: [{ id: 'userInfo', value: '头像+姓名+角色+下拉' }] }).valid).toBe(true);
  });

  it('rejects a remaining user area when the user dimension requests removal', () => {
    const result = validateHtml(template, { dimensions: [{ id: 'userInfo', value: '移除用户' }] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('用户信息维度要求移除用户，但顶栏仍存在用户区域');
  });
});
