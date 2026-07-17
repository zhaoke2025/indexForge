import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { seedDimensions, seedLoginDimensions, seedLoginRequirements, seedRequirements } from './defaults.js';

export type Row = Record<string, SqlValue>;

export class Store {
  private inTransaction = false;
  private constructor(private readonly db: Database, private readonly filePath: string) {}

  static async open() {
    const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
    fs.mkdirSync(dataDir, { recursive: true });
    const filePath = path.join(dataDir, 'indexforge.db');
    const SQL = await initSqlJs();
    const db = fs.existsSync(filePath) ? new SQL.Database(fs.readFileSync(filePath)) : new SQL.Database();
    const store = new Store(db, filePath);
    store.migrate();
    store.seed();
    return store;
  }

  all<T extends Row>(sql: string, params: SqlValue[] = []): T[] {
    const statement = this.db.prepare(sql);
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) rows.push(statement.getAsObject() as T);
    statement.free();
    return rows;
  }

  get<T extends Row>(sql: string, params: SqlValue[] = []): T | undefined {
    return this.all<T>(sql, params)[0];
  }

  run(sql: string, params: SqlValue[] = []) {
    this.db.run(sql, params);
    if (!this.inTransaction) this.persist();
  }

  transaction(action: () => void) {
    this.db.run('BEGIN');
    this.inTransaction = true;
    try {
      action();
      this.db.run('COMMIT');
      this.inTransaction = false;
      this.persist();
    } catch (error) {
      try { this.db.run('ROLLBACK'); } catch { /* transaction may already be closed by SQLite */ }
      this.inTransaction = false;
      throw error;
    }
  }

  resetDimensions() {
    const created = new Date().toISOString();
    this.transaction(() => {
      this.db.run('DELETE FROM dimensions');
      seedDimensions.forEach((item, index) => this.db.run(
        'INSERT INTO dimensions VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
        [item.id, item.name, item.groupName, item.description, item.valueType, JSON.stringify(item.defaultValue), JSON.stringify(item.options), index, created, created],
      ));
    });
  }

  resetRequirements() {
    const created = new Date().toISOString();
    this.transaction(() => {
      this.db.run('DELETE FROM requirements');
      seedRequirements.forEach((item, index) => this.db.run(
        'INSERT INTO requirements VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
        [item[0], item[1], item[2], item[3], item[4], item[5], index, created, created],
      ));
    });
  }

  private persist() {
    const temporary = `${this.filePath}.tmp`;
    fs.writeFileSync(temporary, this.db.export());
    try {
      fs.renameSync(temporary, this.filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (process.platform !== 'win32' || !['EPERM', 'EEXIST'].includes(String(code))) throw error;
      fs.rmSync(this.filePath, { force: true });
      fs.renameSync(temporary, this.filePath);
    }
  }

  private migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS dimensions (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, group_name TEXT NOT NULL, description TEXT NOT NULL,
        value_type TEXT NOT NULL, default_value TEXT NOT NULL, options_json TEXT NOT NULL DEFAULT '[]',
        enabled INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS requirements (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, level TEXT NOT NULL,
        validation_type TEXT NOT NULL DEFAULT 'ai', builtin_validator TEXT,
        enabled INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, html TEXT NOT NULL, validation_json TEXT NOT NULL,
        is_current INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS generation_records (
        id TEXT PRIMARY KEY, parent_id TEXT, system_name TEXT NOT NULL, version_input TEXT,
        display_name TEXT NOT NULL, instruction TEXT, refinement_instruction TEXT,
        system_type TEXT, tone_summary TEXT, template_id TEXT NOT NULL, template_snapshot TEXT NOT NULL,
        dimensions_snapshot_json TEXT NOT NULL, decisions_json TEXT NOT NULL, menu_json TEXT NOT NULL,
        requirements_snapshot_json TEXT NOT NULL, requirement_checks_json TEXT NOT NULL,
        validation_json TEXT NOT NULL, html TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS login_generation_records (
        id TEXT PRIMARY KEY, parent_id TEXT, source_generation_id TEXT NOT NULL,
        system_name TEXT NOT NULL, version_input TEXT, slogan TEXT, instruction TEXT,
        refinement_instruction TEXT, config_json TEXT NOT NULL, reference_html TEXT NOT NULL,
        validation_json TEXT NOT NULL, html TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS login_dimensions AS SELECT * FROM dimensions WHERE 0;
      CREATE TABLE IF NOT EXISTS login_requirements AS SELECT * FROM requirements WHERE 0;
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    `);
    this.persist();
  }

  private seed() {
    const now = new Date().toISOString();
    if (!this.get('SELECT id FROM dimensions LIMIT 1')) {
      this.resetDimensions();
    } else {
      const existingIds = new Set(this.all<{ id: string }>('SELECT id FROM dimensions').map((item) => item.id));
      const maxSortOrder = Number(this.get<{ sortOrder: number }>('SELECT MAX(sort_order) AS sortOrder FROM dimensions')?.sortOrder ?? -1);
      const missing = seedDimensions.filter((item) => !existingIds.has(item.id));
      if (missing.length) {
        this.transaction(() => {
          missing.forEach((item, index) => this.db.run(
            'INSERT INTO dimensions VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)',
            [item.id, item.name, item.groupName, item.description, item.valueType, JSON.stringify(item.defaultValue), JSON.stringify(item.options), maxSortOrder + index + 1, now, now],
          ));
        });
      }
    }
    if (!this.get('SELECT id FROM requirements LIMIT 1')) this.resetRequirements();
    if (!this.get('SELECT version FROM schema_migrations WHERE version=?', [2])) {
      this.transaction(() => {
        this.db.run('DELETE FROM login_dimensions');
        seedLoginDimensions.forEach((item, index) => this.db.run('INSERT INTO login_dimensions VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)', [item.id, item.name, item.groupName, item.description, item.valueType, JSON.stringify(item.defaultValue), JSON.stringify(item.options), index, now, now]));
        this.db.run('DELETE FROM login_requirements');
        seedLoginRequirements.forEach((item, index) => this.db.run('INSERT INTO login_requirements VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)', [item[0], item[1], item[2], 'required', 'ai', null, index, now, now]));
        this.db.run('INSERT INTO schema_migrations VALUES (?, ?)', [2, now]);
      });
    }
    if (!this.get('SELECT id FROM login_dimensions LIMIT 1')) seedLoginDimensions.forEach((item, index) => this.run('INSERT INTO login_dimensions VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)', [item.id, item.name, item.groupName, item.description, item.valueType, JSON.stringify(item.defaultValue), JSON.stringify(item.options), index, now, now]));
    if (!this.get('SELECT id FROM login_requirements LIMIT 1')) seedLoginRequirements.forEach((item, index) => this.run('INSERT INTO login_requirements VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)', [item[0], item[1], item[2], 'required', 'ai', null, index, now, now]));
    if (this.get('SELECT id FROM templates WHERE id=?', ['default'])) this.run('DELETE FROM templates WHERE id=?', ['default']);
  }
}
