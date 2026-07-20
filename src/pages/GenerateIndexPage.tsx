import { Clipboard, Code2, Download, Eye, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import PreviewFrame from '../components/PreviewFrame';
import SourceCodePanel from '../components/SourceCodePanel';
import ValidationPanel from '../components/ValidationPanel';
import { api } from '../core/api';
import type { HistoryRecord } from '../core/types';

type ViewMode = 'preview' | 'source';
type Props = { initialRecord?: HistoryRecord; hasCurrentTemplate: boolean; onGenerated: (record: HistoryRecord) => Promise<void> };

export default function GenerateIndexPage({ initialRecord, hasCurrentTemplate, onGenerated }: Props) {
  const [systemName, setSystemName] = useState('');
  const [version, setVersion] = useState('');
  const [instruction, setInstruction] = useState('');
  const [refinement, setRefinement] = useState('');
  const [record, setRecord] = useState<HistoryRecord | undefined>(initialRecord);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { if (initialRecord) { setRecord(initialRecord); setSystemName(initialRecord.systemName); setVersion(initialRecord.version); setRefreshKey((key) => key + 1); } }, [initialRecord]);

  const generate = async () => {
    if (!systemName.trim()) return setNotice('请输入系统名称');
    if (!hasCurrentTemplate) return setNotice('请先到“母版管理”上传母版，并将其设为当前母版。');
    setLoading(true); setNotice('AI正在读取母版、维度和硬性要求并生成完整HTML，请稍候…');
    try { const result = await api.generate({ systemName, version, instruction }); setRecord(result.generation); setRefreshKey((key) => key + 1); setNotice(result.generation.validation.valid ? '生成成功，全部校验已通过。' : '生成完成，但存在未通过要求，暂不能下载。'); await onGenerated(result.generation); }
    catch (error) { setNotice(error instanceof Error ? error.message : '生成失败'); } finally { setLoading(false); }
  };
  const refine = async () => {
    if (!record || !refinement.trim()) return setNotice('请输入需要调整的地方');
    setLoading(true); setNotice('AI正在基于上一版HTML按意见精准修改…');
    try { const result = await api.refine(record.id, refinement); setRecord(result.generation); setRefinement(''); setRefreshKey((key) => key + 1); setNotice(result.generation.validation.valid ? '调整完成，校验已通过。' : '调整完成，但存在未通过要求。'); await onGenerated(result.generation); }
    catch (error) { setNotice(error instanceof Error ? error.message : '调整失败'); } finally { setLoading(false); }
  };
  const copy = async () => { if (record) { await navigator.clipboard.writeText(record.html); setNotice('源码已复制'); } };
  const download = () => { if (!record?.validation.valid) return; const url = URL.createObjectURL(new Blob([record.html], { type: 'text/html;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'index.html'; link.click(); URL.revokeObjectURL(url); };
  const appliedDimensions = record?.dimensions.filter((item) => item.applied !== false) || [];

  return <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[400px_minmax(0,1fr)] gap-5 overflow-hidden p-5">
    <section className="min-h-0 space-y-4 overflow-y-auto pr-1">
      <div className="rounded border border-slate-200 bg-white p-4"><h2 className="text-sm font-semibold">AI智能生成</h2><div className="mt-3 space-y-3">
        <label><span className="control-label">系统名称 *</span><input className="text-input" value={systemName} onChange={(e) => setSystemName(e.target.value)} /></label>
        <label><span className="control-label">版本号（选填）</span><input className="text-input" placeholder="例如 V1.0" value={version} onChange={(e) => setVersion(e.target.value)} /></label>
        <label><span className="control-label">生成要求（选填）</span><textarea className="min-h-24 w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-blue-500" placeholder="不填写时，AI会根据系统名称自动判断最合适的调性。" value={instruction} onChange={(e) => setInstruction(e.target.value)} /></label>
        <button className="primary-button w-full" disabled={loading} onClick={generate} type="button"><Sparkles size={16} />{loading ? 'AI生成中…' : 'AI智能生成'}</button>
      </div></div>
      {notice && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}
      {record && <>
        <div className="rounded border border-slate-200 bg-white p-4"><div className="text-sm font-semibold">AI判断</div><div className="mt-2 text-sm text-slate-700">{record.systemType || '未分类'}</div><p className="mt-1 text-sm leading-6 text-slate-500">{record.toneSummary}</p></div>
        {appliedDimensions.length > 0 ? <div className="rounded border border-slate-200 bg-white p-4"><div className="text-sm font-semibold">实际应用维度（{appliedDimensions.length}）</div><div className="mt-2 max-h-48 space-y-2 overflow-auto">{appliedDimensions.map((item) => <div className="rounded bg-slate-50 px-3 py-2 text-xs" key={item.dimensionId}><b>{item.dimensionId}</b>：{String(item.value)}<div className="mt-1 text-slate-500">{item.reason}</div></div>)}</div></div> : <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">AI已评估全部候选维度，本次没有额外应用维度。</div>}
        <ValidationPanel validation={record.validation} />
        <div className="rounded border border-slate-200 bg-white p-4"><div className="text-sm font-semibold">硬性要求逐项检查</div><div className="mt-2 space-y-1">{record.requirementChecks.map((item) => <div className={`text-xs ${item.passed ? 'text-emerald-700' : 'text-red-700'}`} key={item.requirementId}>{item.passed ? '通过' : '失败'} · {item.requirementId}：{item.detail}</div>)}</div></div>
        <div className="rounded border border-slate-200 bg-white p-4"><div className="text-sm font-semibold">继续调整</div><textarea className="mt-3 min-h-20 w-full rounded border border-slate-300 p-3 text-sm" placeholder="例如：主色改成绿色，侧边栏窄一点。" value={refinement} onChange={(e) => setRefinement(e.target.value)} /><button className="secondary-button mt-2 w-full" disabled={loading} onClick={refine}><RefreshCw size={16} />根据意见重新生成</button></div>
      </>}
    </section>
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded border border-slate-200 bg-white"><div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4"><div><div className="text-sm font-semibold">{record?.displayName || '生成结果'}</div><div className="text-xs text-slate-500">AI直接读取母版与规则生成完整HTML</div></div><div className="flex gap-2"><button className="secondary-button" onClick={() => setViewMode('preview')}><Eye size={15} />预览</button><button className="secondary-button" onClick={() => setViewMode('source')}><Code2 size={15} />源码</button><button className="secondary-button" disabled={!record} onClick={copy}><Clipboard size={15} />复制</button><button className="primary-button" disabled={!record?.validation.valid} onClick={download}><Download size={15} />下载</button></div></div>
      <div className="min-h-0 flex-1 overflow-hidden">{!record ? <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">输入系统名称后开始AI生成。</div> : viewMode === 'preview' ? <PreviewFrame html={record.html} refreshKey={refreshKey} /> : <SourceCodePanel html={record.html} />}</div>
    </section>
  </div>;
}
