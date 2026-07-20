import { FileCode2, History, Layers3, ListChecks, LogIn, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './core/api';
import { readStorage, writeStorage } from './core/storage';
import type { HistoryRecord, LoginHistoryRecord, TemplateState } from './core/types';
import type { DimensionConfig } from './data/defaultDimensions';
import { defaultLoginConfig, type LoginConfig } from './data/defaultLoginConfig';
import type { RequirementRule } from './data/defaultRequirements';
import { defaultStylePreset, stylePresets } from './data/stylePresets';
import DimensionConfigPage from './pages/DimensionConfigPage';
import GenerateIndexPage from './pages/GenerateIndexPage';
import HistoryPage from './pages/HistoryPage';
import LoginGeneratePage from './pages/LoginGeneratePage';
import RequirementConfigPage from './pages/RequirementConfigPage';
import TemplateManagerPage from './pages/TemplateManagerPage';

type PageKey = 'generate' | 'login' | 'loginDimensions' | 'loginRequirements' | 'dimensions' | 'requirements' | 'template' | 'history';
const navItems = [
  { key: 'generate', name: 'AI首页生成', icon: Wand2 }, { key: 'login', name: '登录页生成', icon: LogIn },
  { key: 'loginDimensions', name: '登录页维度', icon: Layers3 }, { key: 'loginRequirements', name: '登录页要求', icon: ListChecks },
  { key: 'dimensions', name: '维度配置', icon: Layers3 }, { key: 'requirements', name: '硬性要求', icon: ListChecks },
  { key: 'template', name: '母版管理', icon: FileCode2 }, { key: 'history', name: '生成记录', icon: History },
] satisfies Array<{ key: PageKey; name: string; icon: typeof Wand2 }>;
const pageMeta: Record<PageKey, { title: string; desc: string }> = {
  generate: { title: 'AI首页生成', desc: '输入系统名称，由AI自动判断调性、选择维度并生成菜单与HTML' }, login: { title: '登录页生成', desc: '生成配套登录页' },
  loginDimensions: { title: '登录页维度', desc: '增删改查登录页 L1-L17 变体维度' }, loginRequirements: { title: '登录页要求', desc: '增删改查登录页生成硬性要求' },
  dimensions: { title: '维度配置', desc: '管理自动参与AI生成的实体维度' }, requirements: { title: '硬性要求', desc: '管理生成结果必须遵守的规则' },
  template: { title: '母版管理', desc: '上传、检测和选择当前HTML母版' }, history: { title: '生成记录', desc: '查看服务器保存的生成和调整记录' },
};

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('generate');
  const [dimensions, setDimensions] = useState<DimensionConfig[]>([]); const [requirements, setRequirements] = useState<RequirementRule[]>([]);
  const [loginDimensions, setLoginDimensions] = useState<DimensionConfig[]>([]); const [loginRequirements, setLoginRequirements] = useState<RequirementRule[]>([]);
  const [templates, setTemplates] = useState<TemplateState[]>([]); const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord>(); const [selectedLoginRecord, setSelectedLoginRecord] = useState<LoginHistoryRecord>(); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [loginConfig, setLoginConfig] = useState<LoginConfig>(() => readStorage('indexforge.loginConfig', defaultLoginConfig));
  const [presetId] = useState(() => readStorage('indexforge.presetId', defaultStylePreset.id));

  const reload = useCallback(async () => { try { const data = await api.loadAll(); setDimensions(data.dimensions); setRequirements(data.requirements); setLoginDimensions(data.loginDimensions); setLoginRequirements(data.loginRequirements); setTemplates(data.templates); setHistory(data.generations); setLoginHistory(data.loginGenerations); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : '服务端数据加载失败'); } finally { setLoading(false); } }, []);
  useEffect(() => { reload(); }, [reload]); useEffect(() => { writeStorage('indexforge.loginConfig', loginConfig); }, [loginConfig]);
  const meta = pageMeta[activePage];
  const content = useMemo(() => {
    if (activePage === 'generate') return <GenerateIndexPage hasCurrentTemplate={templates.some((item) => item.isCurrent && item.validation.valid)} initialRecord={selectedRecord} onGenerated={async (record) => { setSelectedRecord(record); await reload(); }} />;
    if (activePage === 'login') return <LoginGeneratePage config={loginConfig} dimensions={loginDimensions} initialRecord={selectedLoginRecord} onChange={setLoginConfig} onGenerated={reload} presetId={stylePresets.some((item) => item.id === presetId) ? presetId : defaultStylePreset.id} referenceRecord={selectedRecord || history[0]} />;
    if (activePage === 'loginDimensions') return <DimensionConfigPage dimensions={loginDimensions} onReload={reload} scope="login" />;
    if (activePage === 'loginRequirements') return <RequirementConfigPage requirements={loginRequirements} onReload={reload} scope="login" />;
    if (activePage === 'dimensions') return <DimensionConfigPage dimensions={dimensions} onReload={reload} />;
    if (activePage === 'requirements') return <RequirementConfigPage requirements={requirements} onReload={reload} />;
    if (activePage === 'template') return <TemplateManagerPage templates={templates} onReload={reload} />;
    return <HistoryPage loginRecords={loginHistory} records={history} onReload={reload} onPreview={(record) => { setSelectedRecord(record); setActivePage('generate'); }} onPreviewLogin={(record) => { setSelectedLoginRecord(record); setActivePage('login'); }} />;
  }, [activePage, selectedRecord, selectedLoginRecord, loginConfig, dimensions, loginDimensions, loginRequirements, presetId, requirements, templates, history, loginHistory, reload]);

  return <div className="min-h-screen bg-[#f4f7fb] text-slate-900"><aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-white"><div className="flex h-14 items-center gap-2 border-b px-4"><div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-sm font-semibold text-white">IF</div><div><div className="text-sm font-semibold">IndexForge</div><div className="text-xs text-slate-500">AI首页生成器</div></div></div><nav className="flex-1 space-y-1 px-3 py-4">{navItems.map((item) => { const Icon = item.icon; const active = item.key === activePage; return <button className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm ${active ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`} key={item.key} onClick={() => setActivePage(item.key)}><Icon size={17} />{item.name}</button>; })}</nav></aside>
    <main className="ml-60 min-h-screen"><header className="sticky top-0 z-10 flex h-14 items-center border-b bg-white px-6"><div><h1 className="text-base font-semibold">{meta.title}</h1><p className="text-xs text-slate-500">{meta.desc}</p></div></header>{error && <div className="m-5 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{loading ? <div className="p-8 text-sm text-slate-500">正在加载服务器数据…</div> : content}</main>
  </div>;
}
