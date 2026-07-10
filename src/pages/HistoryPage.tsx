import { Download, Eye } from 'lucide-react';
import type { HistoryRecord } from '../core/types';
import BackupControls from '../components/BackupControls';

type Props = {
  records: HistoryRecord[];
  onPreview: (record: HistoryRecord) => void;
};

export default function HistoryPage({ records, onPreview }: Props) {
  const download = (record: HistoryRecord) => {
    const blob = new Blob([record.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">生成记录</h2>
        <p className="text-sm text-slate-500">记录保存在当前浏览器本地。</p>
      </div>
      <div className="max-w-sm rounded border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold">数据备份</div>
        <BackupControls />
      </div>
      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">软件名称</th>
              <th className="px-4 py-3">版本</th>
              <th className="px-4 py-3">风格</th>
              <th className="px-4 py-3">生成时间</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{record.displayName}</td>
                <td className="px-4 py-3">{record.version}</td>
                <td className="px-4 py-3">{record.presetName}</td>
                <td className="px-4 py-3">{record.generatedAt}</td>
                <td className="px-4 py-3">{record.validation.valid ? '通过' : '失败'}</td>
                <td className="flex gap-2 px-4 py-3">
                  <button className="secondary-button" onClick={() => onPreview(record)} type="button"><Eye size={16} />预览</button>
                  <button className="secondary-button" onClick={() => download(record)} type="button"><Download size={16} />下载</button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>暂无生成记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
