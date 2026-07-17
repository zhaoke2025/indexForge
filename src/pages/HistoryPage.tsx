import { Download, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../core/api';
import type { HistoryRecord, LoginHistoryRecord } from '../core/types';

type Props = {
  records: HistoryRecord[];
  loginRecords: LoginHistoryRecord[];
  onPreview: (record: HistoryRecord) => void;
  onPreviewLogin: (record: LoginHistoryRecord) => void;
  onReload: () => Promise<void>;
};

export default function HistoryPage({ records, loginRecords, onPreview, onPreviewLogin, onReload }: Props) {
  const [kind, setKind] = useState<'index' | 'login'>('index');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const current = kind === 'index' ? records : loginRecords;
  const allSelected = current.length > 0 && current.every((record) => selectedIds.includes(record.id));
  const download = (record: HistoryRecord | LoginHistoryRecord) => { const url = URL.createObjectURL(new Blob([record.html], { type: 'text/html;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = kind === 'index' ? 'index.html' : 'login.html'; link.click(); URL.revokeObjectURL(url); };
  const remove = async (id: string) => { if (!confirm('确定删除这条生成记录吗？')) return; await (kind === 'index' ? api.deleteGeneration(id) : api.deleteLoginGeneration(id)); setSelectedIds((ids) => ids.filter((item) => item !== id)); await onReload(); };
  const toggleAll = () => setSelectedIds(allSelected ? [] : current.map((record) => record.id));
  const toggleOne = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const bulkRemove = async () => { if (!selectedIds.length || !confirm(`确定删除选中的 ${selectedIds.length} 条生成记录吗？`)) return; await (kind === 'index' ? api.deleteGenerations(selectedIds) : api.deleteLoginGenerations(selectedIds)); setSelectedIds([]); await onReload(); };
  return <div className="space-y-4 p-5">
    <div className="flex items-end justify-between"><div><h2 className="text-base font-semibold">生成记录</h2><p className="text-sm text-slate-500">首页和登录页记录统一保存在服务器SQLite数据库中。</p></div><div className="flex rounded border border-slate-300 bg-white p-1"><button className={`rounded px-4 py-1.5 text-sm ${kind === 'index' ? 'bg-blue-600 text-white' : 'text-slate-600'}`} onClick={() => { setKind('index'); setSelectedIds([]); }}>首页（{records.length}）</button><button className={`rounded px-4 py-1.5 text-sm ${kind === 'login' ? 'bg-blue-600 text-white' : 'text-slate-600'}`} onClick={() => { setKind('login'); setSelectedIds([]); }}>登录页（{loginRecords.length}）</button></div></div>
    <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-4 py-3"><span className="text-sm text-slate-600">已选择 {selectedIds.length} 条</span><button className="secondary-button text-red-600" disabled={!selectedIds.length} onClick={bulkRemove}><Trash2 size={15} />批量删除</button></div>
    <div className="overflow-hidden rounded border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="w-12 px-4 py-3"><input aria-label="全选" checked={allSelected} onChange={toggleAll} type="checkbox" /></th><th>系统名称</th><th>页面类型</th><th>生成说明</th><th>生成时间</th><th>状态</th><th>操作</th></tr></thead><tbody>
      {current.map((record) => { const login = 'sourceGenerationId' in record; return <tr key={record.id} className="border-t border-slate-200"><td className="px-4 py-3"><input aria-label={`选择${login ? record.systemName : record.displayName}`} checked={selectedIds.includes(record.id)} onChange={() => toggleOne(record.id)} type="checkbox" /></td><td className="font-medium">{login ? `${record.systemName}${record.version ? ` ${record.version}` : ''}` : record.displayName}{record.parentId && <div className="text-xs text-blue-500">调整版本</div>}</td><td>{login ? '登录页' : '首页'}</td><td className="max-w-xs truncate">{login ? (record.refinementInstruction || record.instruction || 'AI登录页生成') : (record.toneSummary || '-')}</td><td>{new Date(record.generatedAt).toLocaleString()}</td><td>{record.validation.valid ? '通过' : '失败'}</td><td><div className="flex gap-2"><button className="secondary-button" onClick={() => login ? onPreviewLogin(record) : onPreview(record)}><Eye size={15} />预览</button><button className="secondary-button" disabled={!record.validation.valid} onClick={() => download(record)}><Download size={15} />下载</button><button className="secondary-button text-red-600" onClick={() => remove(record.id)}><Trash2 size={15} /></button></div></td></tr>; })}
      {!current.length && <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>暂无{kind === 'index' ? '首页' : '登录页'}生成记录</td></tr>}
    </tbody></table></div>
  </div>;
}
