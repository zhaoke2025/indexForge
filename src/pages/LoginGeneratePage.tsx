import { Clipboard, Code2, Download, Eye, RotateCw, Wand2 } from 'lucide-react';
import { useState } from 'react';
import PreviewFrame from '../components/PreviewFrame';
import SourceCodePanel from '../components/SourceCodePanel';
import { api } from '../core/api';
import type { HistoryRecord, LoginHistoryRecord } from '../core/types';
import type { DimensionConfig } from '../data/defaultDimensions';
import type { LoginConfig } from '../data/defaultLoginConfig';

type ViewMode = 'preview' | 'source';

type Props = {
  config: LoginConfig;
  onChange: (config: LoginConfig) => void;
  dimensions: DimensionConfig[];
  presetId: string;
  referenceRecord?: HistoryRecord;
  initialRecord?: LoginHistoryRecord;
  onGenerated?: () => Promise<void>;
};

export default function LoginGeneratePage({ config, onChange, dimensions, presetId, referenceRecord, initialRecord, onGenerated }: Props) {
  const [html, setHtml] = useState(initialRecord?.html || '');
  const [record, setRecord] = useState<LoginHistoryRecord | undefined>(initialRecord);
  const [instruction, setInstruction] = useState('');
  const [refinementInstruction, setRefinementInstruction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState('');

  void presetId;

  const update = <K extends keyof LoginConfig>(key: K, value: LoginConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const uploadBackgroundImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('请选择图片文件。');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setNotice('图片建议小于 2MB，避免生成的 login.html 过大。');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...config, backgroundImage: String(reader.result || '') });
      setNotice('背景图片已载入，生成 login.html 后会作为通铺背景。');
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateLogin({ config: { ...config, version: '', slogan: '' }, instruction, sourceGenerationId: referenceRecord?.id });
      setRecord(result.generation); setHtml(result.generation.html); setViewMode('preview'); setRefreshKey((key) => key + 1);
      setNotice('login.html 已由 AI 生成并通过校验。');
      await onGenerated?.();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : '登录页生成失败'); }
    finally { setGenerating(false); }
  };

  const refine = async () => {
    if (!record || !refinementInstruction.trim()) return;
    setGenerating(true);
    try {
      const result = await api.refineLogin(record.id, refinementInstruction, config.backgroundImage);
      setRecord(result.generation); setHtml(result.generation.html); setRefinementInstruction(''); setViewMode('preview'); setRefreshKey((key) => key + 1);
      setNotice('已根据意见重新生成 login.html。');
      await onGenerated?.();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : '登录页调整失败'); }
    finally { setGenerating(false); }
  };

  const copy = async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setNotice('源码已复制到剪贴板。');
  };

  const download = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'login.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice('login.html 已开始下载。');
  };
  const appliedDimensions = record?.dimensions.filter((item) => item.applied !== false) || [];

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[460px_minmax(0,1fr)] gap-5 overflow-hidden p-5">
      <section className="min-h-0 space-y-4 overflow-y-auto pr-1">
        <div className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">基础信息</h2>
            <p className="mt-1 text-xs text-slate-500">标题必须为纯文字，不输出 Logo、图标或 Emoji。</p>
          </div>
          <div className="space-y-3 p-4">
            <label>
              <span className="control-label">系统名称</span>
              <input className="text-input" value={config.systemName} onChange={(event) => update('systemName', event.target.value)} />
            </label>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">登录页变体维度</h2>
            <p className="mt-1 text-xs text-slate-500">所有启用项都会交给AI评估，由AI决定实际采用项和具体值。</p>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">{dimensions.filter((item) => item.enabled).map((item) => <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600" key={item.id}>{item.name}</span>)}</div>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">可选背景图片</div>
                    <div className="mt-1 text-xs text-slate-500">AI选择“图片通铺”时使用，生成结果会按 cover 内嵌。</div>
                  </div>
                  {config.backgroundImage && (
                    <button className="secondary-button" onClick={() => update('backgroundImage', '')} type="button">
                      清除
                    </button>
                  )}
                </div>
                <input className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:h-9 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:text-sm file:text-white" type="file" accept="image/*" onChange={(event) => uploadBackgroundImage(event.target.files?.[0])} />
                {config.backgroundImage ? (
                  <div className="mt-3 h-28 rounded border border-slate-200 bg-cover bg-center" style={{ backgroundImage: `url(${config.backgroundImage})` }} />
                ) : (
                  <div className="mt-3 rounded border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                    未上传图片时，生成源码会保留注释示例链接，管理员可手动替换。
                  </div>
                )}
            </div>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">AI 生成要求</div>
          <div className="mt-1 text-xs text-slate-500">视觉参考：首页「{referenceRecord?.displayName || '尚未生成'}」；首页仅用于提取风格。</div>
          <textarea className="text-input mt-3 min-h-20" placeholder="选填：补充本次登录页要求" value={instruction} onChange={(event) => setInstruction(event.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="primary-button flex-1" disabled={generating || !referenceRecord} onClick={generate} type="button">
            <Wand2 size={16} />
            {generating ? 'AI 生成中…' : 'AI 智能生成'}
          </button>
        </div>
        {record && <div className="rounded border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">实际应用维度（{appliedDimensions.length}）</div>
          <div className="mt-2 max-h-40 space-y-2 overflow-auto">{appliedDimensions.map((item) => <div className="rounded bg-slate-50 px-3 py-2 text-xs" key={item.dimensionId}><b>{item.dimensionId}</b>：{String(item.value)}<div className="mt-1 text-slate-500">{item.reason}</div></div>)}</div>
        </div>}
        {record && <div className="rounded border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">硬性要求逐项检查</div>
          <div className="mt-2 space-y-1">{record.requirementChecks.map((item) => <div className={`text-xs ${item.passed ? 'text-emerald-700' : 'text-red-700'}`} key={item.requirementId}>{item.passed ? '通过' : '失败'} · {item.requirementId}：{item.detail}</div>)}</div>
        </div>}
        {record && <div className="rounded border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">继续调整</div>
          <textarea className="text-input mt-3 min-h-20" placeholder="例如：登录框向右移动，背景改为浅色几何图案。" value={refinementInstruction} onChange={(event) => setRefinementInstruction(event.target.value)} />
          <button className="secondary-button mt-3 w-full justify-center" disabled={generating || !refinementInstruction.trim()} onClick={refine} type="button"><RotateCw size={16} />根据意见重新生成</button>
        </div>}
        {notice && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}
      </section>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">登录页结果</h2>
            <p className="text-xs text-slate-500">预览与源码输出</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded border border-slate-300 bg-white p-0.5">
              <button className={`inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm ${viewMode === 'preview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => { setViewMode('preview'); setRefreshKey((key) => key + 1); }} type="button">
                <Eye size={15} />
                预览
              </button>
              <button className={`inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm ${viewMode === 'source' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setViewMode('source')} type="button">
                <Code2 size={15} />
                源码
              </button>
            </div>
            <button className="secondary-button" disabled={!html} onClick={copy} type="button">
              <Clipboard size={16} />
              复制
            </button>
            <button className="primary-button" disabled={!html} onClick={download} type="button">
              <Download size={16} />
              下载
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {!html ? (
            <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
              点击生成后在这里查看 login.html 预览。
            </div>
          ) : viewMode === 'preview' ? (
            <PreviewFrame html={html} refreshKey={refreshKey} />
          ) : (
            <SourceCodePanel html={html} />
          )}
        </div>
      </section>
    </div>
  );
}
