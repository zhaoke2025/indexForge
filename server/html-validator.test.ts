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
    expect(validateRequirementChecks(broken, requirements)).toEqual([
      { requirementId: 'R1', passed: true, detail: '内置校验通过' },
      { requirementId: 'R2', passed: false, detail: '缺少 tailwind.config 配置块' },
      { requirementId: 'R4', passed: true, detail: '已作为AI生成约束，未执行本地校验' },
    ]);
    expect(validateHtml(broken, { requirements }).errors).toEqual(['缺少 tailwind.config 配置块']);
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
