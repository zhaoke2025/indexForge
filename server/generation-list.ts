export type GenerationListQuery = {
  page: number;
  pageSize: number;
  search: string;
  offset: number;
};

export function parseGenerationListQuery(query: Record<string, unknown>): GenerationListQuery {
  const page = Math.max(1, Math.trunc(Number(query.page) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(Number(query.pageSize) || 100)));
  const search = String(query.search || '').trim().slice(0, 100);
  return { page, pageSize, search, offset: (page - 1) * pageSize };
}

export function generationSearch(search: string, columns: string[]) {
  if (!search) return { where: '', params: [] as string[] };
  const value = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  return {
    where: ` WHERE (${columns.map((column) => `${column} LIKE ? ESCAPE '\\'`).join(' OR ')})`,
    params: columns.map(() => value),
  };
}
