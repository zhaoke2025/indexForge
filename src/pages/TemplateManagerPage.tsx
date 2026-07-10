import { FileCheck2, Upload } from 'lucide-react';
import templateHtml from '../../docs/母版-index.html?raw';
import type { TemplateState } from '../core/types';
import { validateGeneratedHtml } from '../core/validator';
import SourceCodePanel from '../components/SourceCodePanel';

type Props = {
  template: TemplateState;
  onChange: (template: TemplateState) => void;
};

export default function TemplateManagerPage({ template, onChange }: Props) {
  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    const html = await file.text();
    onChange({
      name: file.name,
      html,
      validation: validateGeneratedHtml(html),
      isDefault: false,
    });
  };

  const restoreDefault = () => {
    onChange({
      name: '母版-index.html',
      html: templateHtml,
      validation: validateGeneratedHtml(templateHtml),
      isDefault: true,
    });
  };

  return (
    <div className="grid grid-cols-[360px_minmax(0,1fr)] gap-5 p-5">
      <section className="space-y-4">
        <div className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">母版管理</h2>
          <p className="mt-1 text-sm text-slate-500">上传新的 index.html 后，必须通过结构检测才会用于生成。</p>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 hover:bg-slate-100">
            <Upload size={18} />
            上传 index.html
            <input className="hidden" accept=".html,text/html" onChange={(event) => handleUpload(event.target.files?.[0])} type="file" />
          </label>
          <button className="secondary-button mt-3 w-full" onClick={restoreDefault} type="button">
            恢复内置母版
          </button>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileCheck2 size={17} />
            结构检测
          </div>
          <div className="text-sm text-slate-700">当前母版：{template.name}</div>
          <div className={`mt-3 rounded px-3 py-2 text-sm ${template.validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {template.validation.valid ? '检测通过，可用于生成。' : '检测失败，不建议用于生成。'}
          </div>
          {template.validation.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-red-700">
              {template.validation.errors.map((error) => (
                <li key={error}>- {error}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">母版源码查看</div>
        <div className="h-[calc(100vh-8.5rem)]">
          <SourceCodePanel html={template.html} />
        </div>
      </section>
    </div>
  );
}
