import { describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { generationSearch, parseGenerationListQuery } from './generation-list.js';

describe('generation list query', () => {
  it('normalizes page parameters and limits the page size', () => {
    expect(parseGenerationListQuery({ page: '3', pageSize: '20', search: '  农业平台  ' })).toEqual({
      page: 3,
      pageSize: 20,
      search: '农业平台',
      offset: 40,
    });
    expect(parseGenerationListQuery({ page: '-2', pageSize: '999' })).toMatchObject({ page: 1, pageSize: 100, offset: 0 });
  });

  it('builds a literal fuzzy-search condition for every configured field', () => {
    expect(generationSearch('版本_100%', ['system_name', 'version_input'])).toEqual({
      where: " WHERE (system_name LIKE ? ESCAPE '\\' OR version_input LIKE ? ESCAPE '\\')",
      params: ['%版本\\_100\\%%', '%版本\\_100\\%%'],
    });
  });

  it('treats SQLite wildcard characters as normal search text', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run('CREATE TABLE records (system_name TEXT)');
    db.run('INSERT INTO records VALUES (?), (?)', ['版本_100%', '版本A100B']);
    const query = generationSearch('版本_100%', ['system_name']);
    const rows = db.exec(`SELECT system_name FROM records${query.where}`, query.params);

    expect(rows[0].values).toEqual([['版本_100%']]);
  });
});
