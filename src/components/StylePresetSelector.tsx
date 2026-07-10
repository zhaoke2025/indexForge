import type { StylePreset } from '../data/stylePresets';

type Props = {
  presets: StylePreset[];
  value: string;
  onChange: (id: string) => void;
};

export default function StylePresetSelector({ presets, value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          className={`rounded border p-3 text-left transition ${
            value === preset.id
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
          onClick={() => onChange(preset.id)}
          type="button"
        >
          <div className="mb-2 flex items-center gap-1.5">
            {[preset.primary, preset.secondary, preset.surface].map((color) => (
              <span
                key={color}
                className="h-3.5 w-3.5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="text-sm font-medium text-slate-900">{preset.name}</div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{preset.description}</div>
        </button>
      ))}
    </div>
  );
}
