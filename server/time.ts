const beijingOffsetMs = 8 * 60 * 60 * 1_000;

const pad = (value: number) => String(value).padStart(2, '0');

export function formatBeijingTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  const date = new Date(timestamp + beijingOffsetMs);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
