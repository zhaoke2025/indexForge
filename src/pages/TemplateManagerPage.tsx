import { Check, Code2, Eye, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import PreviewFrame from '../components/PreviewFrame';
import SourceCodePanel from '../components/SourceCodePanel';
import { api } from '../core/api';
import type { TemplateState } from '../core/types';

type Props = { templates: TemplateState[]; onReload: () => Promise<void> };
export default function TemplateManagerPage({ templates, onReload }: Props) {
  const current = templates.find((item) => item.isCurrent) || templates[0]; const [selectedId, setSelectedId] = useState(current?.id); const [notice, setNotice] = useState(''); const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview'); const [refreshKey, setRefreshKey] = useState(0);
  const selected = templates.find((item) => item.id === selectedId) || current;
  useEffect(() => {
    if (!templates.some((item) => item.id === selectedId)) setSelectedId(current?.id);
  }, [current?.id, selectedId, templates]);
  useEffect(() => { setRefreshKey((key) => key + 1); }, [selected?.id]);
  const upload = async (file?: File) => { if (!file) return; try { await api.uploadTemplate(file.name, await file.text()); await onReload(); setNotice('母版已上传，通过检测后可设为当前母版。'); } catch (error) { setNotice(error instanceof Error ? error.message : '上传失败'); } };
  const setCurrent = async (id: string) => { await api.setCurrentTemplate(id); await onReload(); };
  const remove = async (id: string) => { if (!confirm('确定删除这个母版吗？')) return; await api.deleteTemplate(id); await onReload(); };
  return <div className="grid grid-cols-[360px_minmax(0,1fr)] gap-5 p-5"><section className="space-y-4"><div className="rounded border border-slate-200 bg-white p-4"><h2 className="font-semibold">母版管理</h2><label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-slate-300 px-4 py-8 text-sm"><Upload size={17} />上传HTML<input className="hidden" type="file" accept=".html,text/html" onChange={(e) => upload(e.target.files?.[0])} /></label>{notice && <p className="mt-3 text-sm text-blue-600">{notice}</p>}</div>
    <div className="space-y-2">{templates.map((item) => <div className={`cursor-pointer rounded border bg-white p-3 ${item.id === selected?.id ? 'ring-2 ring-blue-200' : ''} ${item.isCurrent ? 'border-emerald-400' : 'border-slate-200'}`} key={item.id} onClick={() => setSelectedId(item.id)}><div className="flex justify-between"><div className="text-sm font-medium">{item.name}</div>{item.isCurrent && <span className="text-xs text-emerald-600">当前</span>}</div><div className="mt-3 flex gap-2">{!item.isCurrent && <button className="secondary-button" onClick={(event) => { event.stopPropagation(); setCurrent(item.id); }}><Check size={14} />设为当前</button>}<button className="secondary-button text-red-600" onClick={(event) => { event.stopPropagation(); remove(item.id); }}><Trash2 size={14} /></button></div></div>)}</div></section>
    <section className="overflow-hidden rounded border border-slate-200 bg-white"><div className="flex h-12 items-center justify-between border-b border-slate-200 px-4"><div><div className="text-sm font-semibold">{selected?.name || '母版详情'}</div><div className="text-xs text-slate-500">{selected?.isCurrent ? '当前使用母版' : '待选母版'}</div></div><div className="flex gap-2"><button className={viewMode === 'preview' ? 'primary-button' : 'secondary-button'} onClick={() => setViewMode('preview')} type="button"><Eye size={15} />预览</button><button className={viewMode === 'source' ? 'primary-button' : 'secondary-button'} onClick={() => setViewMode('source')} type="button"><Code2 size={15} />源码</button></div></div><div className="h-[calc(100vh-8.5rem)]">{selected && (viewMode === 'preview' ? <PreviewFrame html={selected.html} refreshKey={refreshKey} /> : <SourceCodePanel html={selected.html} />)}</div></section>
  </div>;
}
