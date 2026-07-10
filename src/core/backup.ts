export const BACKUP_VERSION = 1;

export type AppBackup = {
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
};

const STORAGE_KEYS = [
  'indexforge.dimensions',
  'indexforge.loginConfig',
  'indexforge.presetId',
  'indexforge.menuConfig',
  'indexforge.history',
  'indexforge.template',
] as const;

export function createBackup(): AppBackup {
  const data: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = JSON.parse(raw);
  }
  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

export function restoreBackup(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('备份文件格式不正确');
  const backup = input as Partial<AppBackup>;
  if (backup.version !== BACKUP_VERSION || !backup.data || typeof backup.data !== 'object') {
    throw new Error('不支持的备份文件版本');
  }
  for (const key of STORAGE_KEYS) {
    if (key in backup.data) localStorage.setItem(key, JSON.stringify(backup.data[key]));
  }
}
