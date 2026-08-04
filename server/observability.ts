import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContext = { requestId: string };
type LogFields = Record<string, unknown>;

const requestContext = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(requestId: string, callback: () => T) {
  return requestContext.run({ requestId }, callback);
}

export function currentRequestId() {
  return requestContext.getStore()?.requestId;
}

export function logEvent(level: 'info' | 'warn' | 'error', event: string, fields: LogFields = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: currentRequestId(),
    ...fields,
  };
  const line = JSON.stringify(payload, (_key, value) => value === undefined ? null : value);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function errorLogFields(error: unknown) {
  if (!(error instanceof Error)) return { errorMessage: String(error) };
  const source = error as Error & { code?: string; status?: number };
  return {
    errorName: error.name,
    errorMessage: error.message,
    errorCode: source.code,
    errorStatus: source.status,
    stack: error.stack,
  };
}
