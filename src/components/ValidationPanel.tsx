import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ValidationResult } from '../core/validator';

type Props = {
  validation: ValidationResult | null;
};

export default function ValidationPanel({ validation }: Props) {
  if (!validation) {
    return (
      <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-500">
        生成后会显示 11 条硬性要求校验结果。
      </div>
    );
  }

  return (
    <div className={`rounded border p-4 ${validation.valid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${validation.valid ? 'text-emerald-700' : 'text-red-700'}`}>
        {validation.valid ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
        <span>{validation.valid ? '校验通过，可以预览、复制和下载。' : '校验失败，下载已禁用。'}</span>
      </div>
      {validation.errors.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-red-700">
          {validation.errors.map((error) => (
            <li key={error}>- {error}</li>
          ))}
        </ul>
      )}
      {validation.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-amber-700">
          {validation.warnings.map((warning) => (
            <li key={warning} className="flex gap-1">
              <Info className="mt-0.5 shrink-0" size={14} />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
