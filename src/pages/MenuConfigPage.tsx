import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { MenuItemConfig } from '../core/types';
import { defaultMenuConfig } from '../data/defaultMenuConfig';

type Props = {
  menuConfig: MenuItemConfig[];
  onChange: (menuConfig: MenuItemConfig[]) => void;
};

function slug(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `menu-${Date.now()}`;
}

export default function MenuConfigPage({ menuConfig, onChange }: Props) {
  const [aiPrompt, setAiPrompt] = useState('机器人管理后台，包含设备接入、任务调度、运行监控、模型知识库、系统设置');
  const [aiStatus, setAiStatus] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const updateMenu = (index: number, patch: Partial<MenuItemConfig>) => {
    onChange(menuConfig.map((item, current) => (current === index ? { ...item, ...patch } : item)));
  };

  const addMenu = () => onChange([...menuConfig, { id: `menu-${Date.now()}`, name: '新菜单', icon: 'fa-folder', file: 'new-page', subMenu: [] }]);

  const addSub = (index: number) => {
    const menu = menuConfig[index];
    updateMenu(index, { subMenu: [...menu.subMenu, { name: '新子菜单', file: 'new-sub-page' }], file: undefined });
  };

  const updateSub = (menuIndex: number, subIndex: number, patch: { name?: string; file?: string }) => {
    const menu = menuConfig[menuIndex];
    updateMenu(menuIndex, { subMenu: menu.subMenu.map((sub, current) => (current === subIndex ? { ...sub, ...patch } : sub)) });
  };

  const generateWithAi = async () => {
    setAiLoading(true);
    setAiStatus('');
    try {
      const response = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const payload = (await response.json()) as { menuConfig?: MenuItemConfig[]; error?: string };
      if (!response.ok || !payload.menuConfig) throw new Error(payload.error || '大模型生成失败');
      onChange(payload.menuConfig);
      setAiStatus('大模型菜单已生成并应用。');
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : '大模型生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5 p-5">
      <section className="rounded border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">大模型辅助生成菜单</h2>
            <p className="text-sm text-slate-500">通过服务端读取 OPENAI_API_KEY，调用 DeepSeek 生成 menuConfig。</p>
          </div>
          <button className="primary-button" disabled={aiLoading} onClick={generateWithAi} type="button">
            <Sparkles size={16} />
            {aiLoading ? '生成中' : '大模型生成'}
          </button>
        </div>
        <textarea
          className="min-h-20 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          onChange={(event) => setAiPrompt(event.target.value)}
          placeholder="描述系统类型、业务模块、目标用户和希望生成的菜单层级"
          value={aiPrompt}
        />
        {aiStatus && <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">{aiStatus}</div>}
      </section>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">菜单结构自定义</h2>
          <p className="text-sm text-slate-500">配置会替换母版中的 menuConfig，同时保留原有渲染和跳转逻辑。</p>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button" onClick={() => onChange(defaultMenuConfig)} type="button">恢复默认</button>
          <button className="primary-button" onClick={addMenu} type="button"><Plus size={16} />添加一级菜单</button>
        </div>
      </div>

      <div className="space-y-3">
        {menuConfig.map((menu, index) => (
          <div key={menu.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3">
              <label><span className="control-label">ID</span><input className="text-input" value={menu.id} onChange={(event) => updateMenu(index, { id: slug(event.target.value) })} /></label>
              <label><span className="control-label">名称</span><input className="text-input" value={menu.name} onChange={(event) => updateMenu(index, { name: event.target.value })} /></label>
              <label><span className="control-label">图标</span><input className="text-input" value={menu.icon} onChange={(event) => updateMenu(index, { icon: event.target.value })} /></label>
              <button className="secondary-button mt-6" onClick={() => onChange(menuConfig.filter((_, current) => current !== index))} type="button"><Trash2 size={16} /></button>
            </div>
            {menu.subMenu.length === 0 && (
              <label className="mt-3 block"><span className="control-label">页面文件</span><input className="text-input" value={menu.file || ''} onChange={(event) => updateMenu(index, { file: event.target.value })} /></label>
            )}
            <div className="mt-3 space-y-2">
              {menu.subMenu.map((sub, subIndex) => (
                <div key={`${menu.id}-${subIndex}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded bg-slate-50 p-2">
                  <input className="text-input" value={sub.name} onChange={(event) => updateSub(index, subIndex, { name: event.target.value })} />
                  <input className="text-input" value={sub.file} onChange={(event) => updateSub(index, subIndex, { file: event.target.value })} />
                  <button className="secondary-button" onClick={() => updateMenu(index, { subMenu: menu.subMenu.filter((_, current) => current !== subIndex) })} type="button"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button className="secondary-button mt-3" onClick={() => addSub(index)} type="button"><Plus size={16} />添加子菜单</button>
          </div>
        ))}
      </div>
    </div>
  );
}
