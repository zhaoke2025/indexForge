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
    expect(first.get<{ count: number }>('SELECT COUNT(*) AS count FROM requirements')?.count).toBe(11);
    expect(first.get<{ name: string; validation_type: string }>('SELECT name,validation_type FROM requirements WHERE id=?', ['R3'])).toEqual({
      name: '子菜单（二级菜单）',
      validation_type: 'builtin',
    });
    expect(first.get<{ description: string }>('SELECT description FROM login_dimensions WHERE id=?', ['layout'])?.description).toContain('登录卡片外');
    expect(first.get<{ count: number }>('SELECT COUNT(*) AS count FROM templates')?.count).toBe(0);
    expect(first.get<{ default_value: string }>('SELECT default_value FROM dimensions LIMIT 1')?.default_value).toBe('null');
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

  it('restores and synchronizes the three online built-in requirements during migration', async () => {
    const store = await Store.open();
    store.run('DELETE FROM requirements WHERE id=?', ['R3']);
    store.run('DELETE FROM schema_migrations WHERE version=?', [4]);
    const reopened = await Store.open();
    expect(reopened.get<{ name: string; enabled: number; validation_type: string }>('SELECT name,enabled,validation_type FROM requirements WHERE id=?', ['R3'])).toEqual({
      name: '子菜单（二级菜单）',
      enabled: 1,
      validation_type: 'builtin',
    });
  });

  it('restores and synchronizes the remaining online requirements during migration', async () => {
    const store = await Store.open();
    store.run('DELETE FROM requirements WHERE id=?', ['R11']);
    store.run('UPDATE requirements SET name=? WHERE id=?', ['侧边栏位置', 'R4']);
    store.run('DELETE FROM schema_migrations WHERE version=?', [5]);
    const reopened = await Store.open();
    expect(reopened.get<{ name: string; validation_type: string }>('SELECT name,validation_type FROM requirements WHERE id=?', ['R4'])).toEqual({
      name: '导航栏位置',
      validation_type: 'ai',
    });
    expect(reopened.get<{ name: string; validation_type: string }>('SELECT name,validation_type FROM requirements WHERE id=?', ['R11'])).toEqual({
      name: '退出系统',
      validation_type: 'ai',
    });
  });

  it('restores the right-layout title placement contract during migration', async () => {
    const store = await Store.open();
    store.run('UPDATE login_dimensions SET description=? WHERE id=?', ['偏右布局', 'layout']);
    store.run('DELETE FROM login_requirements WHERE id=?', ['LR1']);
    store.run('DELETE FROM schema_migrations WHERE version=?', [6]);
    const reopened = await Store.open();
    expect(reopened.get<{ description: string }>('SELECT description FROM login_dimensions WHERE id=?', ['layout'])?.description).toContain('登录卡片外');
    expect(reopened.get<{ description: string }>('SELECT description FROM login_requirements WHERE id=?', ['LR1'])?.description).toContain('页面左侧独立品牌区');
  });
});
