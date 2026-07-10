export function normalizeVersion(version?: string): string {
  const v = (version || '').trim();
  if (!v) return 'V1.0';
  if (/^v?\d+(\.\d+){0,2}$/i.test(v)) {
    return v.toUpperCase().startsWith('V') ? v.toUpperCase() : `V${v}`;
  }
  return v;
}

export function buildDisplayName(systemName: string, version?: string): string {
  const name = systemName.trim();
  const v = normalizeVersion(version);
  if (!name) return v;
  if (/V\d+(\.\d+){0,2}/i.test(name)) return name;
  return `${name} ${v}`;
}
