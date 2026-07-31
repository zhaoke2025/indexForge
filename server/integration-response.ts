export function integrationResponse(status: number, payload: unknown) {
  if (status < 400) return { code: 0, message: 'success', data: payload };
  const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
    ? payload.error
    : '请求失败';
  return { code: 1, message, data: null };
}

export function integrationSourceGenerationId(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('sourceGenerationId' in payload)) return '';
  const value = payload.sourceGenerationId;
  return typeof value === 'string' ? value.trim() : '';
}
