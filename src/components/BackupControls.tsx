import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { createBackup, restoreBackup } from '../core/backup';

export default function BackupControls() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState('');

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(createBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `indexforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('备份已导出');
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      restoreBackup(JSON.parse(await file.text()));
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '备份导入失败');
    }
  };

  return <div className="space-y-2">
    <div className="flex gap-2">
      <button className="secondary-button flex-1" onClick={exportBackup} type="button"><Download size={15} />导出备份</button>
      <button className="secondary-button flex-1" onClick={() => inputRef.current?.click()} type="button"><Upload size={15} />恢复备份</button>
      <input ref={inputRef} className="hidden" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0])} type="file" />
    </div>
    {notice && <p className="text-xs text-slate-500">{notice}</p>}
  </div>;
}
