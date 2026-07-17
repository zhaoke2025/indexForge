import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from './store.js';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexforge-store-'));
process.env.DATA_DIR = dataDir;

describe('SQLite store', () => {
  afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  it('initializes defaults once and persists them', async () => {
    const first = await Store.open();
    expect(first.get<{ count: number }>('SELECT COUNT(*) AS count FROM dimensions')?.count).toBe(27);
    expect(first.get<{ count: number }>('SELECT COUNT(*) AS count FROM requirements')?.count).toBe(9);
    expect(first.get<{ count: number }>('SELECT COUNT(*) AS count FROM templates')?.count).toBe(0);
    const second = await Store.open();
    expect(second.get<{ count: number }>('SELECT COUNT(*) AS count FROM dimensions')?.count).toBe(27);
  });

  it('commits multiple ordered updates as one transaction', async () => {
    const store = await Store.open();
    store.transaction(() => {
      store.run('UPDATE requirements SET sort_order=? WHERE id=?', [1, 'R1']);
      store.run('UPDATE requirements SET sort_order=? WHERE id=?', [0, 'R2']);
    });
    const reopened = await Store.open();
    const rows = reopened.all<{ id: string }>('SELECT id FROM requirements ORDER BY sort_order LIMIT 2');
    expect(rows.map((row) => row.id)).toEqual(['R2', 'R1']);
  });
});
