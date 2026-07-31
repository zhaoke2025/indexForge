import { describe, expect, it } from 'vitest';
import { integrationResponse, integrationSourceGenerationId } from './integration-response.js';

describe('integration API response envelope', () => {
  it('wraps successful data without changing its content', () => {
    expect(integrationResponse(201, { generation: { id: 'record-id' } })).toEqual({
      code: 0,
      message: 'success',
      data: { generation: { id: 'record-id' } },
    });
  });

  it('uses code 1 for errors', () => {
    expect(integrationResponse(401, { error: 'Token无效' })).toEqual({
      code: 1,
      message: 'Token无效',
      data: null,
    });
  });

  it('uses code 1 for every HTTP error status', () => {
    expect(integrationResponse(418, { error: '请求失败' })).toEqual({
      code: 1,
      message: '请求失败',
      data: null,
    });
  });
});

describe('integration login generation input', () => {
  it.each([undefined, {}, { sourceGenerationId: '' }, { sourceGenerationId: '   ' }, { sourceGenerationId: 123 }])(
    'rejects a missing or empty sourceGenerationId',
    (payload) => expect(integrationSourceGenerationId(payload)).toBe(''),
  );

  it('accepts and trims a sourceGenerationId', () => {
    expect(integrationSourceGenerationId({ sourceGenerationId: ' index-record-id ' })).toBe('index-record-id');
  });
});
