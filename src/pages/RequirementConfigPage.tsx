import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../core/api';
import type { RequirementRule } from '../data/defaultRequirements';

type Props = { requirements: RequirementRule[]; onReload: () => Promise<void>; scope?: 'index' | 'login' };
const empty: RequirementRule = { id: '', name: '', description: '', level: 'required', enabled: true, validationType: 'ai' };

export default function RequirementConfigPage({ requirements, onReload, scope = 'index' }: Props) {
  const [editing, setEditing] = useState<RequirementRule | null>(null); const [creating, setCreating] = useState(false); const [notice, setNotice] = useState(''); const [formError, setFormError] = useState('');
  useEffect(() => {
    if (!editing) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditing(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [editing]);
  const save = async () => { if (!editing) return; try { await (scope === 'login' ? api.saveLoginRequirement(editing, creating) : api.saveRequirement(editing, creating)); setEditing(null); setFormError(''); await onReload(); setNotice('硬性要求已保存'); } catch (error) { setFormError(error instanceof Error ? error.message : '保存失败'); } };
  const remove = async (id: string) => { if (!confirm('确定删除这条要求吗？')) return; await (scope === 'login' ? api.deleteLoginRequirement(id) : api.deleteRequirement(id)); await onReload(); };
  const move = async (index: number, offset: number) => { const next = [...requirements]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; await (scope === 'login' ? api.reorderLoginRequirements(next.map((item) => item.id)) : api.reorderRequirements(next.map((item) => item.id))); await onReload(); };
  const toggle = async (item: RequirementRule) => { await (scope === 'login' ? api.saveLoginRequirement({ ...item, enabled: !item.enabled }, false) : api.saveRequirement({ ...item, enabled: !item.enabled }, false)); await onReload(); };
  return <div className="space-y-4 p-5">
    <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">{scope === 'login' ? '登录页硬性要求管理' : '硬性要求管理'}</h2><p className="text-sm text-slate-500">新增要求默认由AI检查；内置要求同时执行本地校验。</p></div><div className="flex gap-2"><button className="secondary-button" onClick={async () => { if (confirm('确定恢复默认要求吗？')) { await (scope === 'login' ? api.resetLoginRequirements() : api.resetRequirements()); await onReload(); } }}>恢复默认</button><button className="primary-button" onClick={() => { setCreating(true); setFormError(''); setEditing({ ...empty }); }} type="button"><Plus size={16} />新增要求</button></div></div>
    {notice && <div className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}
    {editing && <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }} role="dialog">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h3 className="font-semibold">{creating ? '新增硬性要求' : `编辑硬性要求：${editing.name}`}</h3><p className="mt-1 text-xs text-slate-500">配置要求级别、校验方式和具体描述。</p></div>
          <button aria-label="关闭" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEditing(null)} type="button"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {formError && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{formError}</div>}
          <label><span className="control-label">ID</span><input autoFocus className="text-input" disabled={!creating} value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} /></label>
          <label><span className="control-label">名称</span><input className="text-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
          <label><span className="control-label">级别</span><select className="text-input" value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value as RequirementRule['level'] })}><option value="required">必须</option><option value="recommended">推荐</option><option value="flexible">灵活</option></select></label>
          <label><span className="control-label">校验方式</span><select className="text-input" value={editing.validationType} onChange={(e) => setEditing({ ...editing, validationType: e.target.value as RequirementRule['validationType'] })}><option value="ai">AI检查</option><option value="builtin">内置检查</option></select></label>
          <label className="md:col-span-2"><span className="control-label">描述</span><textarea className="min-h-28 w-full rounded border border-slate-300 p-3 text-sm" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button className="secondary-button" onClick={() => setEditing(null)} type="button">取消</button><button className="primary-button" onClick={save} type="button">保存</button></div>
      </section>
    </div>}
    <div className="grid grid-cols-2 gap-3">{requirements.map((rule, index) => <div key={rule.id} className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between"><div><div className="font-semibold">{rule.id} · {rule.name}</div><p className="mt-2 text-sm text-slate-600">{rule.description}</p></div><button className={`rounded px-2 py-1 text-xs ${rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} onClick={() => toggle(rule)}>{rule.enabled ? '启用' : '停用'}</button></div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><span>顺序 {index + 1}</span><span>·</span><span>{rule.level}</span><span>·</span><span>{rule.validationType === 'builtin' ? '内置+AI' : 'AI检查'}</span></div>
      <div className="mt-3 flex gap-2"><button disabled={index === 0} className="secondary-button" onClick={() => move(index, -1)}><ArrowUp size={14} /></button><button disabled={index === requirements.length - 1} className="secondary-button" onClick={() => move(index, 1)}><ArrowDown size={14} /></button><button className="secondary-button" onClick={() => { setCreating(false); setFormError(''); setEditing({ ...rule }); }}><Pencil size={14} />编辑</button><button className="secondary-button text-red-600" onClick={() => remove(rule.id)}><Trash2 size={14} />删除</button></div>
    </div>)}</div>
  </div>;
}
