import { describe, expect, it, vi } from 'vitest';
import { currentRequestId, errorLogFields, logEvent, withRequestContext } from './observability.js';

describe('server observability', () => {
  it('keeps the request id across asynchronous work', async () => {
    await withRequestContext('req-123', async () => {
      await Promise.resolve();
      expect(currentRequestId()).toBe('req-123');
    });
    expect(currentRequestId()).toBeUndefined();
  });

  it('writes structured logs with the current request id', () => {
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    withRequestContext('req-456', () => logEvent('info', 'ai.call.success', { durationMs: 42 }));
    const payload = JSON.parse(String(output.mock.calls[0][0]));
    expect(payload).toMatchObject({ level: 'info', event: 'ai.call.success', requestId: 'req-456', durationMs: 42 });
    output.mockRestore();
  });

  it('extracts safe error fields for diagnostics', () => {
    const error = Object.assign(new Error('upstream failed'), { code: 'AI_EMPTY_RESPONSE', status: 502 });
    expect(errorLogFields(error)).toMatchObject({ errorName: 'Error', errorMessage: 'upstream failed', errorCode: 'AI_EMPTY_RESPONSE', errorStatus: 502 });
  });
});
