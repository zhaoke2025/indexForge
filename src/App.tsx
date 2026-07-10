import { FileCode2, History, Layers3, ListChecks, LogIn, Menu, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import templateHtml from '../docs/母版-index.html?raw';
import { readStorage, writeStorage } from './core/storage';
import type { HistoryRecord, TemplateState } from './core/types';
import { validateGeneratedHtml } from './core/validator';
import { defaultDimensions, type DimensionConfig } from './data/defaultDimensions';
import { defaultLoginConfig, type LoginConfig } from './data/defaultLoginConfig';
import { defaultMenuConfig } from './data/defaultMenuConfig';
import { defaultStylePreset, stylePresets } from './data/stylePresets';
import type { MenuItemConfig } from './core/types';
import DimensionConfigPage from './pages/DimensionConfigPage';
import GenerateIndexPage from './pages/GenerateIndexPage';
import HistoryPage from './pages/HistoryPage';
import LoginGeneratePage from './pages/LoginGeneratePage';
import MenuConfigPage from './pages/MenuConfigPage';
import RequirementConfigPage from './pages/RequirementConfigPage';
import TemplateManagerPage from './pages/TemplateManagerPage';

type PageKey = 'generate' | 'login' | 'dimensions' | 'requirements' | 'template' | 'menu' | 'history';

const navItems = [
  { key: 'generate', name: '首页生成', icon: Wand2 },
  { key: 'login', name: '登录页生成', icon: LogIn },
  { key: 'dimensions', name: '维度配置', icon: Layers3 },
  { key: 'requirements', name: '硬性要求', icon: ListChecks },
  { key: 'template', name: '母版管理', icon: FileCode2 },
  { key: 'menu', name: '菜单配置', icon: Menu },
  { key: 'history', name: '生成记录', icon: History },
] satisfies Array<{ key: PageKey; name: string; icon: typeof Wand2 }>;

const pageMeta: Record<PageKey, { title: string; desc: string }> = {
  generate: { title: '首页生成', desc: '基于当前母版、维度和菜单配置生成后台首页 index.html' },
  login: { title: '登录页生成', desc: '基于当前主色和登录页维度生成 login.html' },
  dimensions: { title: '维度配置', desc: '逐项编辑 25 个可调维度' },
  requirements: { title: '硬性要求', desc: '查看 9 条红线规则和校验说明' },
  template: { title: '母版管理', desc: '上传、检测和查看 index.html 母版' },
  menu: { title: '菜单配置', desc: '自定义 menuConfig 和子菜单结构' },
  history: { title: '生成记录', desc: '预览和下载历史生成结果' },
};

function mergeDimensionsWithDefaults(dimensions: DimensionConfig[]) {
  const dimensionById = new Map(dimensions.map((dimension) => [dimension.id, dimension]));
  return defaultDimensions.map((defaultDimension) => {
    const currentDimension = dimensionById.get(defaultDimension.id);
    if (!currentDimension) return defaultDimension;
    return {
      ...defaultDimension,
      enabled: currentDimension.enabled,
      value: currentDimension.value,
    };
  });
}

function mergeLoginConfigWithDefaults(config: LoginConfig) {
  return {
    ...defaultLoginConfig,
    ...config,
  };
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('generate');
  const [dimensions, setDimensions] = useState<DimensionConfig[]>(() => mergeDimensionsWithDefaults(readStorage('indexforge.dimensions', defaultDimensions)));
  const [loginConfig, setLoginConfig] = useState<LoginConfig>(() => mergeLoginConfigWithDefaults(readStorage('indexforge.loginConfig', defaultLoginConfig)));
  const [presetId, setPresetId] = useState(() => {
    const storedPresetId = readStorage('indexforge.presetId', defaultStylePreset.id);
    return stylePresets.some((preset) => preset.id === storedPresetId) ? storedPresetId : defaultStylePreset.id;
  });
  const [menuConfig, setMenuConfig] = useState<MenuItemConfig[]>(() => readStorage('indexforge.menuConfig', defaultMenuConfig));
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => readStorage('indexforge.history', []));
  const [previewHtml, setPreviewHtml] = useState('');
  const [template, setTemplate] = useState<TemplateState>(() =>
    readStorage('indexforge.template', {
      name: '母版-index.html',
      html: templateHtml,
      validation: validateGeneratedHtml(templateHtml),
      isDefault: true,
    }),
  );

  useEffect(() => { writeStorage('indexforge.dimensions', dimensions); }, [dimensions]);
  useEffect(() => { writeStorage('indexforge.loginConfig', loginConfig); }, [loginConfig]);
  useEffect(() => { writeStorage('indexforge.presetId', presetId); }, [presetId]);
  useEffect(() => { writeStorage('indexforge.menuConfig', menuConfig); }, [menuConfig]);
  useEffect(() => { writeStorage('indexforge.history', historyRecords); }, [historyRecords]);
  useEffect(() => { writeStorage('indexforge.template', template); }, [template]);

  const meta = pageMeta[activePage];
  const generationTemplate = template.validation.valid ? template.html : templateHtml;

  const content = useMemo(() => {
    if (activePage === 'generate') {
      return (
        <GenerateIndexPage
          dimensions={dimensions}
          initialHtml={previewHtml}
          menuConfig={menuConfig}
          onDimensionsChange={setDimensions}
          onMenuConfigChange={setMenuConfig}
          onPresetChange={setPresetId}
          onGenerated={(record) => setHistoryRecords((records) => [record, ...records].slice(0, 30))}
          presetId={presetId}
          templateHtml={generationTemplate}
        />
      );
    }
    if (activePage === 'login') return <LoginGeneratePage config={loginConfig} dimensions={dimensions} onChange={setLoginConfig} presetId={presetId} />;
    if (activePage === 'dimensions') return <DimensionConfigPage dimensions={dimensions} onChange={setDimensions} />;
    if (activePage === 'requirements') return <RequirementConfigPage />;
    if (activePage === 'template') return <TemplateManagerPage template={template} onChange={setTemplate} />;
    if (activePage === 'menu') return <MenuConfigPage menuConfig={menuConfig} onChange={setMenuConfig} />;
    return (
      <HistoryPage
        records={historyRecords}
        onPreview={(record) => {
          setPreviewHtml(record.html);
          setActivePage('generate');
        }}
      />
    );
  }, [activePage, dimensions, generationTemplate, historyRecords, loginConfig, menuConfig, presetId, previewHtml, template]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-sm font-semibold text-white">IF</div>
          <div>
            <div className="text-sm font-semibold leading-4">IndexForge</div>
            <div className="text-xs text-slate-500">首页母版生成器</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <button
                key={item.key}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition ${
                  active ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                onClick={() => setActivePage(item.key)}
                type="button"
              >
                <Icon size={17} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-4 py-3" />
      </aside>

      <main className="ml-60 min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <h1 className="text-base font-semibold">{meta.title}</h1>
            <p className="text-xs text-slate-500">{meta.desc}</p>
          </div>
          <div />
        </header>
        {content}
      </main>
    </div>
  );
}
