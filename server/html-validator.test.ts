import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateHtml, validateRequirementChecks } from './html-validator.js';

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

  it('runs every enabled builtin requirement separately', () => {
    const requirements = [
      { id: 'R1', validationType: 'builtin', builtinValidator: 'h1-text' },
      { id: 'R2', validationType: 'builtin', builtinValidator: 'tailwind-config' },
      { id: 'R4', validationType: 'ai' },
    ];
    const broken = template.replace('tailwind.config', 'removed.config');
    expect(validateRequirementChecks(broken, requirements, { systemName: '企业运营管理平台' })).toEqual([
      { requirementId: 'R1', passed: true, detail: '内置校验通过' },
      { requirementId: 'R2', passed: false, detail: '缺少 tailwind.config 配置块' },
      { requirementId: 'R4', passed: true, detail: '已作为AI生成约束，未执行本地校验' },
    ]);
    expect(validateHtml(broken, { requirements, systemName: '企业运营管理平台' }).errors).toEqual(['缺少 tailwind.config 配置块']);
  });

  it('requires the exact system name as a plain h1 title', () => {
    const wrongName = template.replace('<h1>企业运营管理平台</h1>', '<h1>企业平台 V2</h1>');
    expect(validateHtml(wrongName, { systemName: '企业运营管理平台' }).errors).toContain('顶栏 h1 必须完整显示系统名称：企业运营管理平台');

    const nestedTag = template.replace('<h1>企业运营管理平台</h1>', '<h1><span>企业运营管理平台</span></h1>');
    expect(validateHtml(nestedTag, { systemName: '企业运营管理平台' }).errors).toContain('h1 标题只能包含纯文字');
  });

  it('rejects branding graphics and a sidebar toggle to the left of h1', () => {
    const logo = template.replace('<h1>企业运营管理平台</h1>', '<img class="brand-logo" src="logo.png"><h1>企业运营管理平台</h1>');
    expect(validateHtml(logo).errors).toContain('标题旁边不能放置 logo、图标或图片');

    const leftToggle = template.replace(
      '<h1>企业运营管理平台</h1>',
      '<button id="sidebarToggleBtn"><i class="fa fa-bars"></i></button><h1>企业运营管理平台</h1>',
    );
    expect(validateHtml(leftToggle).errors).toContain('禁止在标题左侧放置侧边栏收起按钮');
  });

  it('requires an executable Tailwind configuration object', () => {
    const commented = template.replace(/tailwind\.config\s*=\s*\{[\s\S]*?\n\s*\};/, '/* tailwind.config = {}; */');
    expect(validateHtml(commented).errors).toContain('缺少有效的 tailwind.config 配置块');

    const malformed = template.replace('tailwind.config = {', 'tailwind.config = null; // {');
    expect(validateHtml(malformed).errors).toContain('缺少有效的 tailwind.config 配置块');
  });

  it('requires an inline, indented submenu without left-border highlighting', () => {
    const popup = template
      .replace("activeElement.insertAdjacentElement('afterend', wrapper);", 'document.body.appendChild(wrapper);')
      .replace('.dynamic-submenu-wrapper {', '.dynamic-submenu-wrapper {\n            position: absolute;');
    expect(validateHtml(popup).errors).toContain('子菜单必须在 renderSubMenuInPlace 中以内联方式插入当前一级菜单项之后');
    expect(validateHtml(popup).errors).toContain('子菜单不能使用弹出、悬浮、抽屉或侧滑定位');

    const insufficientIndent = template.replace('padding: 9px 14px 9px 50px;', 'padding: 9px 14px;');
    expect(validateHtml(insufficientIndent).errors).toContain('子菜单左侧缩进必须至少与一级菜单文字对齐');

    const leftBorder = template.replace(
      '.nav-primary-active {\n            color:',
      '.nav-primary-active {\n            border-left: 3px solid #2563EB;\n            color:',
    );
    expect(validateHtml(leftBorder).errors).toContain('菜单激活态禁止使用左侧边框高亮');
  });

  it('does not accept a decoy inline insertion outside renderSubMenuInPlace', () => {
    const decoy = template
      .replace("activeElement.insertAdjacentElement('afterend', wrapper);", 'document.body.appendChild(wrapper);')
      .replace('</script>', "function unusedDecoy() { activeMenuItem.insertAdjacentElement('afterend', wrapper); }\n</script>");
    expect(validateHtml(decoy).errors).toContain('子菜单必须在 renderSubMenuInPlace 中以内联方式插入当前一级菜单项之后');
  });

  it('does not silently pass a builtin requirement without a validator', () => {
    expect(validateRequirementChecks(template, [{ id: 'custom', validationType: 'builtin' }])[0]).toEqual({ requirementId: 'custom', passed: false, detail: '未配置可执行的内置校验器' });
  });

  it('does not treat a business menu named 供应商开发中心 as a placeholder', () => {
    expect(validateHtml(template.replace('企业运营管理平台', '供应商开发中心')).valid).toBe(true);
  });

  it('still rejects an exact 开发中 placeholder', () => {
    const result = validateHtml(template.replace('</body>', '<div>开发中</div></body>'));
    expect(result.errors).toContain('检测到占位文字：开发中');
  });

  it('does not perform backend validation for dimensions', () => {
    expect(validateHtml(template, { requirements: [] }).valid).toBe(true);
  });
});
