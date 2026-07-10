import { defaultRequirements } from '../data/defaultRequirements';

export default function RequirementConfigPage() {
  return (
    <div className="space-y-4 p-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">硬性要求</h2>
        <p className="text-sm text-slate-500">强制项默认锁定，生成和母版上传时都会执行校验。</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {defaultRequirements.map((rule) => (
          <div key={rule.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{rule.id} · {rule.name}</span>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{rule.level}</span>
            </div>
            <p className="text-sm leading-6 text-slate-600">{rule.description}</p>
            <div className="mt-3 text-xs text-slate-400">{rule.locked ? '已锁定' : '可配置'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
