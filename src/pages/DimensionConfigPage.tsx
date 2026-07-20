import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../core/api';
import type { DimensionConfig } from '../data/defaultDimensions';

type Props = { dimensions: DimensionConfig[]; onReload: () => Promise<void>; scope?: 'index' | 'login' };
const empty: DimensionConfig = { id: '', name: '', group: '自定义', description: '', valueType: 'text', options: [], enabled: true };

export default function DimensionConfigPage({ dimensions, onReload, scope = 'index' }: Props) {
  const [editing, setEditing] = useState<DimensionConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!editing) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditing(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [editing]);

  const save = async () => {
    if (!editing) return;
    try { await (scope === 'login' ? api.saveLoginDimension(editing, creating) : api.saveDimension(editing, creating)); setEditing(null); setFormError(''); await onReload(); setNotice('维度已保存'); }
    catch (error) { setFormError(error instanceof Error ? error.message : '保存失败'); }
  };
  const remove = async (id: string) => { if (!window.confirm('确定删除这个维度吗？')) return; await (scope === 'login' ? api.deleteLoginDimension(id) : api.deleteDimension(id)); await onReload(); };
  const move = async (index: number, offset: number) => { const next = [...dimensions]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; await (scope === 'login' ? api.reorderLoginDimensions(next.map((item) => item.id)) : api.reorderDimensions(next.map((item) => item.id))); await onReload(); };
  const toggle = async (item: DimensionConfig) => { await (scope === 'login' ? api.saveLoginDimension({ ...item, enabled: !item.enabled }, false) : api.saveDimension({ ...item, enabled: !item.enabled }, false)); await onReload(); };

  return <div className="space-y-4 p-5">
    <div className="flex items-center justify-between">
      <div><h2 className="text-base font-semibold">{scope === 'login' ? '登录页变体维度管理' : '实体维度管理'}</h2><p className="text-sm text-slate-500">所有启用维度会自动参与下一次AI生成。</p></div>
      <div className="flex gap-2"><button className="secondary-button" onClick={async () => { if (confirm('确定恢复全部默认维度吗？')) { await (scope === 'login' ? api.resetLoginDimensions() : api.resetDimensions()); await onReload(); } }} type="button">恢复默认</button><button className="primary-button" onClick={() => { setCreating(true); setFormError(''); setEditing({ ...empty }); }} type="button"><Plus size={16} />新增维度</button></div>
    </div>
    {notice && <div className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}
    {editing && <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }} role="dialog">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h3 className="font-semibold">{creating ? '新增维度' : `编辑维度：${editing.name}`}</h3><p className="mt-1 text-xs text-slate-500">配置维度定义和可选项，具体值由AI按系统调性决定。</p></div>
          <button aria-label="关闭" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEditing(null)} type="button"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {formError && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{formError}</div>}
          <label><span className="control-label">ID</span><input autoFocus className="text-input" disabled={!creating} value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} /></label>
          <label><span className="control-label">名称</span><input className="text-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
          <label><span className="control-label">分组</span><input className="text-input" value={editing.group} onChange={(e) => setEditing({ ...editing, group: e.target.value })} /></label>
          <label><span className="control-label">值类型</span><select className="text-input" value={editing.valueType || 'text'} onChange={(e) => setEditing({ ...editing, valueType: e.target.value as DimensionConfig['valueType'] })}><option value="text">文本</option><option value="boolean">布尔</option><option value="single-select">单选</option></select></label>
          <label><span className="control-label">选项（逗号分隔）</span><input className="text-input" disabled={editing.valueType !== 'single-select'} placeholder={editing.valueType === 'single-select' ? '选项一,选项二' : '仅单选类型需要填写'} value={(editing.options || []).join(',')} onChange={(e) => setEditing({ ...editing, options: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} /></label>
          <label className="md:col-span-2"><span className="control-label">描述</span><textarea className="min-h-24 w-full rounded border border-slate-300 p-3 text-sm" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button className="secondary-button" onClick={() => setEditing(null)} type="button">取消</button><button className="primary-button" onClick={save} type="button">保存</button></div>
      </section>
    </div>}
    <div className="overflow-hidden rounded border border-slate-200 bg-white">
      <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-3">顺序</th><th>名称</th><th>分组</th><th>描述</th><th>取值规则</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>{dimensions.map((item, index) => <tr className="border-t border-slate-200" key={item.id}>
        <td className="px-3 py-3"><div className="flex items-center gap-1"><span className="w-5 text-xs text-slate-400">{index + 1}</span><button disabled={index === 0} className="disabled:opacity-25" onClick={() => move(index, -1)} type="button"><ArrowUp size={15} /></button><button disabled={index === dimensions.length - 1} className="disabled:opacity-25" onClick={() => move(index, 1)} type="button"><ArrowDown size={15} /></button></div></td>
        <td className="font-medium">{item.name}<div className="text-xs text-slate-400">{item.id}</div></td><td>{item.group}</td><td className="max-w-xs text-slate-600">{item.description}</td><td className="max-w-xs text-slate-600">{item.valueType === 'single-select' ? (item.options || []).join('、') : item.valueType === 'boolean' ? '由AI判断是/否' : '由AI生成'}</td>
        <td><button className={`rounded px-2 py-1 text-xs ${item.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} onClick={() => toggle(item)} type="button">{item.enabled ? '启用' : '停用'}</button></td>
        <td><div className="flex gap-2"><button className="secondary-button" onClick={() => { setCreating(false); setFormError(''); setEditing({ ...item }); }} type="button"><Pencil size={14} />编辑</button><button className="secondary-button text-red-600" onClick={() => remove(item.id)} type="button"><Trash2 size={14} />删除</button></div></td>
      </tr>)}</tbody></table>
    </div>
  </div>;
}
