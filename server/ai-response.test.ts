import { describe, expect, it } from 'vitest';
import { readCompletion, withoutThinking } from './ai-response.js';

describe('AI completion response', () => {
  it('disables model thinking while preserving completion parameters', () => {
    expect(withoutThinking({ model: 'deepseek-v4-flash', max_tokens: 8192 })).toEqual({
      model: 'deepseek-v4-flash',
      max_tokens: 8192,
      thinking: { type: 'disabled' },
    });
  });

  it('returns content and completion metadata', () => {
    expect(readCompletion({ choices: [{ finish_reason: 'stop', message: { content: 'ok' } }], usage: { total_tokens: 3 } })).toEqual({
      content: 'ok',
      finishReason: 'stop',
      usage: { total_tokens: 3 },
    });
  });

  it.each([
    {},
    { choices: [] },
    { choices: [{ message: {} }] },
    { choices: [{ message: { content: '   ' } }] },
  ])('turns a missing or empty choice into a diagnosable upstream error', (completion) => {
    try {
      readCompletion(completion);
      throw new Error('expected readCompletion to throw');
    } catch (error) {
      expect(error).toMatchObject({ message: 'AI服务未返回有效内容，请稍后重试', status: 502, code: 'AI_EMPTY_RESPONSE' });
    }
  });
});
