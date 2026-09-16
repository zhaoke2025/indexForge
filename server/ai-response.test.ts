import { describe, expect, it } from 'vitest';
import { readCompletion, withoutThinking } from './ai-response.js';

describe('AI completion response', () => {
  it('disables thinking with the parameter required by the configured provider', () => {
    const params = { model: 'deepseek-v4-flash', max_tokens: 8192 };
    expect(withoutThinking(params, 'https://dashscope.aliyuncs.com/compatible-mode/v1')).toEqual({
      ...params,
      enable_thinking: false,
    });
    expect(withoutThinking(params, 'https://api.deepseek.com')).toEqual({
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
