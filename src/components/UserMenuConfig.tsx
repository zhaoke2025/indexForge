import type { UserConfig } from '../core/generator';

type Props = {
  value: UserConfig;
  onChange: (value: UserConfig) => void;
};

export default function UserMenuConfig({ value, onChange }: Props) {
  const update = (patch: Partial<UserConfig>) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-2 gap-3">
      <label>
        <span className="control-label">用户名</span>
        <input className="text-input" value={value.userName} onChange={(event) => update({ userName: event.target.value })} />
      </label>
      <label>
        <span className="control-label">角色</span>
        <input className="text-input" value={value.role} onChange={(event) => update({ role: event.target.value })} />
      </label>
      <label>
        <span className="control-label">头像图标</span>
        <input
          className="text-input"
          value={value.avatarIcon}
          onChange={(event) => update({ avatarIcon: event.target.value })}
          placeholder="fa-user-o"
        />
      </label>
      <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
        <input
          checked={value.showRole}
          className="h-4 w-4 rounded border-slate-300 text-blue-600"
          onChange={(event) => update({ showRole: event.target.checked })}
          type="checkbox"
        />
        <span>显示角色标签</span>
      </label>
    </div>
  );
}
