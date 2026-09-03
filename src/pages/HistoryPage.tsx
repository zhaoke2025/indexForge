import { ChevronLeft, ChevronRight, Download, Eye, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../core/api';
import type { HistoryRecord, LoginHistoryRecord } from '../core/types';

type Props = {
  records: HistoryRecord[];
  loginRecords: LoginHistoryRecord[];
  onPreview: (record: HistoryRecord) => void;
  onPreviewLogin: (record: LoginHistoryRecord) => void;
  onReload: () => Promise<void>;
};

export function generationDescription(record: HistoryRecord | LoginHistoryRecord) {
  if (record.refinementInstruction) return record.refinementInstruction;
  return 'sourceGenerationId' in record ? (record.instruction || 'AI登录页生成') : (record.toneSummary || '-');
}

export default function HistoryPage({ records, loginRecords, onPreview, onPreviewLogin, onReload }: Props) {
  const [kind, setKind] = useState<'index' | 'login'>('index');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [current, setCurrent] = useState<Array<HistoryRecord | LoginHistoryRecord>>(records);
  const [totals, setTotals] = useState({ index: records.length, login: loginRecords.length });
  const [filteredTotal, setFilteredTotal] = useState(records.length);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadSequence = useRef(0);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));

  const loadCounts = useCallback(async () => {
    const [indexResult, loginResult] = await Promise.all([
      api.listGenerations({ page: 1, pageSize: 1 }),
      api.listLoginGenerations({ page: 1, pageSize: 1 }),
    ]);
    setTotals({ index: indexResult.total, login: loginResult.total });
  }, []);

  const loadPage = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setCurrent([]);
    try {
      const result = kind === 'index'
        ? await api.listGenerations({ page, pageSize, search })
        : await api.listLoginGenerations({ page, pageSize, search });
      if (sequence !== loadSequence.current) return;
      const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
      setFilteredTotal(result.total);
      if (page > lastPage) setPage(lastPage);
      else setCurrent(result.generations);
      setError('');
    } catch (reason) {
      if (sequence !== loadSequence.current) return;
      setError(reason instanceof Error ? reason.message : '生成记录加载失败');
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [kind, page, search]);

  useEffect(() => { void loadCounts().catch(() => undefined); }, [loadCounts]);
  useEffect(() => { void loadPage(); }, [loadPage]);

  const allSelected = current.length > 0 && current.every((record) => selectedIds.includes(record.id));
  const download = (record: HistoryRecord | LoginHistoryRecord) => { const url = URL.createObjectURL(new Blob([record.html], { type: 'text/html;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = kind === 'index' ? 'index.html' : 'login.html'; link.click(); URL.revokeObjectURL(url); };
  const refresh = async () => { await onReload(); await Promise.all([loadCounts(), loadPage()]); };
  const remove = async (id: string) => { if (!confirm('确定删除这条生成记录吗？')) return; await (kind === 'index' ? api.deleteGeneration(id) : api.deleteLoginGeneration(id)); setSelectedIds((ids) => ids.filter((item) => item !== id)); await refresh(); };
  const toggleAll = () => setSelectedIds(allSelected ? [] : current.map((record) => record.id));
  const toggleOne = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const bulkRemove = async () => { if (!selectedIds.length || !confirm(`确定删除选中的 ${selectedIds.length} 条生成记录吗？`)) return; await (kind === 'index' ? api.deleteGenerations(selectedIds) : api.deleteLoginGenerations(selectedIds)); setSelectedIds([]); await refresh(); };
  const resetList = () => { setCurrent([]); setSelectedIds([]); };
  const changeKind = (next: 'index' | 'login') => { setKind(next); setPage(1); resetList(); };
  const changePage = (next: number) => { setPage(next); resetList(); };
  return <div className="space-y-4 p-5">
    <div className="flex items-end justify-between"><div><h2 className="text-base font-semibold">生成记录</h2><p className="text-sm text-slate-500">首页和登录页记录统一保存在服务器SQLite数据库中。</p></div><div className="flex rounded border border-slate-300 bg-white p-1"><button className={`rounded px-4 py-1.5 text-sm ${kind === 'index' ? 'bg-blue-600 text-white' : 'text-slate-600'}`} onClick={() => changeKind('index')}>首页（{totals.index}）</button><button className={`rounded px-4 py-1.5 text-sm ${kind === 'login' ? 'bg-blue-600 text-white' : 'text-slate-600'}`} onClick={() => changeKind('login')}>登录页（{totals.login}）</button></div></div>
    <div className="flex items-center justify-between gap-4 rounded border border-slate-200 bg-white px-4 py-3"><form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); resetList(); }}><div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input className="w-80 rounded border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" onChange={(event) => setSearchInput(event.target.value)} placeholder="搜索系统名称、版本或生成说明" value={searchInput} /></div><button className="secondary-button" type="submit">搜索</button>{search && <button className="text-sm text-blue-600" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); resetList(); }} type="button">清空</button>}</form><div className="flex items-center gap-4"><span className="text-sm text-slate-600">已选择 {selectedIds.length} 条</span><button className="secondary-button text-red-600" disabled={!selectedIds.length} onClick={bulkRemove}><Trash2 size={15} />批量删除</button></div></div>
    {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-hidden rounded border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="w-12 px-4 py-3"><input aria-label="全选" checked={allSelected} onChange={toggleAll} type="checkbox" /></th><th>系统名称</th><th>页面类型</th><th>生成说明</th><th>生成时间</th><th>状态</th><th>操作</th></tr></thead><tbody>
      {current.map((record) => { const login = 'sourceGenerationId' in record; return <tr key={record.id} className="border-t border-slate-200"><td className="px-4 py-3"><input aria-label={`选择${login ? record.systemName : record.displayName}`} checked={selectedIds.includes(record.id)} onChange={() => toggleOne(record.id)} type="checkbox" /></td><td className="font-medium">{login ? `${record.systemName}${record.version ? ` ${record.version}` : ''}` : record.displayName}{record.parentId && <div className="text-xs text-blue-500">调整版本</div>}</td><td>{login ? '登录页' : '首页'}</td><td className="max-w-xs truncate">{generationDescription(record)}</td><td>{record.generatedAt}</td><td>{record.validation.valid ? '通过' : '失败'}</td><td><div className="flex gap-2"><button className="secondary-button" onClick={() => login ? onPreviewLogin(record) : onPreview(record)}><Eye size={15} />预览</button><button className="secondary-button" disabled={!record.validation.valid} onClick={() => download(record)}><Download size={15} />下载</button><button className="secondary-button text-red-600" onClick={() => remove(record.id)}><Trash2 size={15} /></button></div></td></tr>; })}
      {!loading && !current.length && <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>{search ? '没有符合搜索条件的记录' : `暂无${kind === 'index' ? '首页' : '登录页'}生成记录`}</td></tr>}
      {loading && <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>正在加载生成记录…</td></tr>}
    </tbody></table></div>
    <div className="flex items-center justify-between text-sm text-slate-600"><span>{search ? `找到 ${filteredTotal} 条记录` : `共 ${filteredTotal} 条记录`}，第 {page} / {totalPages} 页</span><div className="flex gap-2"><button className="secondary-button" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft size={15} />上一页</button><button className="secondary-button" disabled={loading || page >= totalPages} onClick={() => changePage(page + 1)}>下一页<ChevronRight size={15} /></button></div></div>
  </div>;
}
