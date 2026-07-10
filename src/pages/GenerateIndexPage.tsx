import { Clipboard, Code2, Download, Eye, RotateCw, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PreviewFrame from '../components/PreviewFrame';
import SourceCodePanel from '../components/SourceCodePanel';
import StylePresetSelector from '../components/StylePresetSelector';
import UserMenuConfig from '../components/UserMenuConfig';
import ValidationPanel from '../components/ValidationPanel';
import { generateIndexHtml, type UserConfig } from '../core/generator';
import type { HistoryRecord, MenuItemConfig } from '../core/types';
import type { ValidationResult } from '../core/validator';
import type { DimensionConfig } from '../data/defaultDimensions';
import { applyStylePresetToDimensions } from '../data/presetDimensions';
import { stylePresets } from '../data/stylePresets';

type ViewMode = 'preview' | 'source';

type Props = {
  templateHtml: string;
  dimensions: DimensionConfig[];
  onDimensionsChange: (dimensions: DimensionConfig[]) => void;
  presetId: string;
  onPresetChange: (presetId: string) => void;
  menuConfig: MenuItemConfig[];
  onMenuConfigChange: (menuConfig: MenuItemConfig[]) => void;
  onGenerated: (record: HistoryRecord) => void;
  initialHtml?: string;
};

export default function GenerateIndexPage({ templateHtml, dimensions, onDimensionsChange, presetId, onPresetChange, menuConfig, onMenuConfigChange, onGenerated, initialHtml }: Props) {
  const [systemName, setSystemName] = useState('智慧运营后台');
  const [version, setVersion] = useState('V1.0');
  const [user, setUser] = useState<UserConfig>({
    userName: '系统管理员',
    role: '管理员',
    avatarIcon: 'fa-user-o',
    showRole: true,
  });
  const [html, setHtml] = useState(initialHtml || '');
  const [displayName, setDisplayName] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [aiMenuLoading, setAiMenuLoading] = useState(false);

  const selectedPreset = useMemo(
    () => stylePresets.find((preset) => preset.id === presetId) ?? stylePresets[0],
    [presetId],
  );

  const canExport = Boolean(html && validation?.valid);

  useEffect(() => {
    if (!initialHtml) return;
    setHtml(initialHtml);
    setDisplayName('历史记录预览');
    setViewMode('preview');
    setPreviewRefreshKey((key) => key + 1);
  }, [initialHtml]);

  const runGenerate = (menuOverride?: MenuItemConfig[], successNotice?: string) => {
    const activeMenuConfig = menuOverride || menuConfig;
    const result = generateIndexHtml(templateHtml, {
      systemName,
      version,
      preset: selectedPreset,
      user,
      dimensions,
      menuConfig: activeMenuConfig,
    });
    setHtml(result.html);
    setDisplayName(result.displayName);
    setValidation(result.validation);
    setNotice(successNotice || (result.validation.valid ? '生成成功，校验已通过。' : '生成完成，但校验失败。'));
    setViewMode('preview');
    setPreviewRefreshKey((key) => key + 1);
    onGenerated({
      id: `${Date.now()}`,
      systemName,
      version: result.normalizedVersion,
      displayName: result.displayName,
      presetName: selectedPreset.name,
      generatedAt: new Date().toLocaleString(),
      html: result.html,
      validation: result.validation,
    });
  };

  const handleGenerate = () => {
    runGenerate();
  };

  const handlePresetChange = (nextPresetId: string) => {
    onPresetChange(nextPresetId);
    onDimensionsChange(applyStylePresetToDimensions(nextPresetId, dimensions));
    setNotice('已按风格预设更新维度配置，重新生成后生效。');
  };

  const handlePreview = () => {
    if (!html) {
      handleGenerate();
      return;
    }
    setViewMode('preview');
    setPreviewRefreshKey((key) => key + 1);
    setNotice('预览已刷新。');
  };

  const handleAiMenu = async () => {
    setAiMenuLoading(true);
    setNotice('');
    try {
      const response = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemName,
          prompt: `请根据软件名称「${systemName || '后台管理系统'}」自我发挥，生成适合正式后台首页的一级菜单和子菜单。菜单应贴合业务，不要生成页面正文内容。`,
        }),
      });
      const payload = (await response.json()) as { menuConfig?: MenuItemConfig[]; error?: string };
      if (!response.ok || !payload.menuConfig) throw new Error(payload.error || '大模型菜单生成失败');
      onMenuConfigChange(payload.menuConfig);
      runGenerate(payload.menuConfig, '大模型已根据软件名称生成菜单，并已重新生成当前 index.html。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '大模型菜单生成失败');
    } finally {
      setAiMenuLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setNotice('源码已复制到剪贴板。');
  };

  const handleDownload = () => {
    if (!canExport) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice('index.html 已开始下载。');
  };

  return (
    <div className="grid grid-cols-[430px_minmax(0,1fr)] gap-5 p-5">
      <section className="space-y-4">
        <div className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">基础信息</h2>
          </div>
          <div className="space-y-3 p-4">
            <label>
              <span className="control-label">软件名称</span>
              <input className="text-input" value={systemName} onChange={(event) => setSystemName(event.target.value)} />
            </label>
            <label>
              <span className="control-label">版本号</span>
              <input className="text-input" value={version} onChange={(event) => setVersion(event.target.value)} />
            </label>
            <button className="secondary-button w-full" disabled={aiMenuLoading} onClick={handleAiMenu} type="button">
              <Sparkles size={16} />
              {aiMenuLoading ? '正在生成菜单' : '根据软件名称 AI 生成菜单'}
            </button>
            <div className="rounded bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              当前菜单：{menuConfig.map((menu) => menu.name).join(' / ') || '未配置'}
            </div>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">风格预设</h2>
            <p className="mt-1 text-xs text-slate-500">选择预设会同步修改维度配置。</p>
          </div>
          <div className="p-4">
            <StylePresetSelector presets={stylePresets} value={presetId} onChange={handlePresetChange} />
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">右上角用户信息</h2>
          </div>
          <div className="p-4">
            <UserMenuConfig value={user} onChange={setUser} />
          </div>
        </div>

        <div className="flex gap-2">
          <button className="primary-button flex-1" onClick={handleGenerate} type="button">
            <Wand2 size={16} />
            生成 index.html
          </button>
          <button className="secondary-button" onClick={handleGenerate} type="button">
            <RotateCw size={16} />
            重新生成
          </button>
        </div>

        {notice && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}

        <ValidationPanel validation={validation} />
      </section>

      <section className="min-w-0 rounded border border-slate-200 bg-white">
        <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900">{displayName || '生成结果'}</h2>
            <p className="text-xs text-slate-500">母版预览与源码输出</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded border border-slate-300 bg-white p-0.5">
              <button
                className={`inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm ${
                  viewMode === 'preview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={handlePreview}
                type="button"
              >
                <Eye size={15} />
                预览
              </button>
              <button
                className={`inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm ${
                  viewMode === 'source' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setViewMode('source')}
                type="button"
              >
                <Code2 size={15} />
                源码
              </button>
            </div>
            <button className="secondary-button" disabled={!html} onClick={handleCopy} type="button">
              <Clipboard size={16} />
              复制
            </button>
            <button className="primary-button" disabled={!canExport} onClick={handleDownload} type="button">
              <Download size={16} />
              下载
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-7.75rem)] overflow-hidden">
          {!html ? (
            <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
              点击生成后在这里查看 iframe 预览。
            </div>
          ) : viewMode === 'preview' ? (
            <PreviewFrame html={html} refreshKey={previewRefreshKey} />
          ) : (
            <SourceCodePanel html={html} />
          )}
        </div>
      </section>
    </div>
  );
}
