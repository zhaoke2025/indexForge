import { describe, expect, it } from 'vitest';
import templateHtml from '../../docs/母版-index.html?raw';
import { validateGeneratedHtml } from './validator';

describe('validateGeneratedHtml', () => {
  it('accepts the built-in template', () => {
    expect(validateGeneratedHtml(templateHtml).valid).toBe(true);
  });

  it('rejects non-text h1 and forbidden placeholders', () => {
    const html = templateHtml
      .replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '<h1><span>标题</span></h1>')
      .replace('</body>', '页面建设中</body>');
    const result = validateGeneratedHtml(html);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('非纯文字'))).toBe(true);
    expect(result.errors.some((error) => error.includes('页面建设中'))).toBe(true);
  });
});
