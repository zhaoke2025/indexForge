import { describe, expect, it } from 'vitest';
import { buildHtmlPrompt, buildRepairPrompt, extractCompleteHtml, htmlSystemPrompt } from './ai-html.js';

describe('AI HTML helpers', () => {
  it('extracts complete HTML from an optional markdown fence', () => {
    expect(extractCompleteHtml('```html\n<!DOCTYPE html><html><body>ok</body></html>\n```')).toBe('<!DOCTYPE html><html><body>ok</body></html>');
  });

  it('rejects truncated HTML', () => {
    expect(() => extractCompleteHtml('<!DOCTYPE html><html><body>')).toThrow('AI未返回完整HTML');
  });

  it('includes the base HTML and user instruction in the prompt', () => {
    const prompt = buildHtmlPrompt({
      systemName: '测试系统',
      version: 'V1.0',
      instruction: '二级菜单左侧内边距改为64px',
      dimensions: [],
      requirements: [],
      baseHtml: '<!DOCTYPE html><html></html>',
      refining: true,
    });
    expect(prompt).toContain('二级菜单左侧内边距改为64px');
    expect(prompt).toContain('上一版完整index.html');
    expect(prompt).toContain('<!DOCTYPE html><html></html>');
    expect(prompt.match(/二级菜单左侧内边距改为64px/g)?.length).toBeGreaterThanOrEqual(2);
    expect(prompt).toContain('禁止无修改原样返回');
  });

  it('requires exact user-provided values', () => {
    expect(htmlSystemPrompt).toContain('用户要求64px就必须输出64px');
    expect(htmlSystemPrompt).toContain('继续调整禁止原样返回上一版HTML');
  });

  it('builds a focused repair prompt', () => {
    const prompt = buildRepairPrompt('<!DOCTYPE html><html></html>', ['用户下拉菜单缺少点击展开交互']);
    expect(prompt).toContain('只修复以下错误');
    expect(prompt).toContain('用户下拉菜单缺少点击展开交互');
    expect(prompt).toContain('<!DOCTYPE html><html></html>');
  });
});
