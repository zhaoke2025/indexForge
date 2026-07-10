import type { DimensionConfig } from '../data/defaultDimensions';
import { defaultDimensions } from '../data/defaultDimensions';

type Props = {
  dimensions: DimensionConfig[];
  onChange: (dimensions: DimensionConfig[]) => void;
};

const colorSwatches = [
  '#2563EB',
  '#16A34A',
  '#0891B2',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#D4AF37',
  '#111827',
  '#64748B',
];

const customOption = '自定义';
const customPrefix = '自定义:';

const customDefaults: Record<string, string> = {
  mode: '#F8FAFC #FFFFFF #0F172A #64748B',
  radius: '10px',
  shadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
  sidebarWidth: '260px',
  sidebarScroll: 'auto',
  headerHeight: '60px',
  contentBg: '#F1F5F9',
  activeMenu: 'background:#E0E7FF;color:#2563EB',
  submenuTrigger: '›',
  submenuAnimation: 'all 0.25s ease',
  iframeLoading: '#111827',
  menuIcons: 'FontAwesome',
  menuBadge: 'NEW',
  userInfo: '头像+姓名+角色+下拉',
  menuOrder: '默认',
  spacing: '20px 24px',
  borderStyle: '1px solid #CBD5E1',
  scrollbar: '6px #94A3B8 transparent',
  transitionSpeed: '0.2s ease',
  contentMaxWidth: '1280px',
};

const customPlaceholders: Record<string, string> = {
  mode: '例如：#F8FAFC #FFFFFF #0F172A #64748B',
  radius: '例如：10px / 9999px',
  shadow: '例如：0 12px 28px rgba(15, 23, 42, 0.16)',
  sidebarWidth: '例如：300px',
  sidebarScroll: '例如：auto / visible',
  headerHeight: '例如：64px',
  contentBg: '例如：#F1F5F9 / linear-gradient(...)',
  activeMenu: '例如：background:#E0E7FF;color:#2563EB',
  submenuTrigger: '例如：› / + / ↓',
  submenuAnimation: '例如：all 0.25s ease',
  iframeLoading: '例如：#111827',
  menuIcons: '例如：FontAwesome / hidden',
  menuBadge: '例如：NEW / Beta / 3',
  userInfo: '例如：头像+姓名+角色+下拉',
  menuOrder: '例如：默认',
  spacing: '例如：20px 24px',
  borderStyle: '例如：2px dashed #CBD5E1',
  scrollbar: '例如：6px #94A3B8 transparent',
  transitionSpeed: '例如：0.2s ease / 75ms linear',
  contentMaxWidth: '例如：1280px / 960px',
};

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isCustomValue(value: DimensionConfig['value']) {
  return typeof value === 'string' && value.startsWith(customPrefix);
}

function stripCustomPrefix(value: DimensionConfig['value']) {
  return typeof value === 'string' && value.startsWith(customPrefix) ? value.slice(customPrefix.length) : String(value);
}

function getOptions(item: DimensionConfig) {
  if (!item.options) return [];
  return item.options.includes(customOption) ? item.options : [...item.options, customOption];
}

function getSelectValue(item: DimensionConfig) {
  if (!item.options) return String(item.value);
  const options = getOptions(item);
  return options.includes(String(item.value)) ? String(item.value) : isCustomValue(item.value) ? customOption : String(item.value);
}

export default function DimensionConfigPage({ dimensions, onChange }: Props) {
  const groups = Array.from(new Set(dimensions.map((item) => item.group)));

  const update = (id: string, patch: Partial<DimensionConfig>) => {
    onChange(dimensions.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">25 个维度逐项编辑</h2>
          <p className="text-sm text-slate-500">开启的维度会在生成时覆盖风格预设，部分维度支持自定义 CSS 值。</p>
        </div>
        <button className="secondary-button" onClick={() => onChange(defaultDimensions)} type="button">
          恢复默认
        </button>
      </div>

      {groups.map((group) => (
        <section key={group} className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">{group}</div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {dimensions
              .filter((item) => item.group === group)
              .map((item) => (
                <div key={item.id} className="rounded border border-slate-200 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{item.name}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
                    </div>
                    <input
                      checked={item.enabled}
                      className="mt-1 h-4 w-4"
                      onChange={(event) => update(item.id, { enabled: event.target.checked })}
                      type="checkbox"
                    />
                  </div>
                  {item.id === 'primary' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                        <input
                          aria-label="选择主色"
                          className="h-9 w-11 cursor-pointer rounded border border-slate-300 bg-white p-1"
                          onChange={(event) => update(item.id, { value: event.target.value.toUpperCase() })}
                          type="color"
                          value={isHexColor(item.value) ? item.value : '#2563EB'}
                        />
                        <input
                          className="text-input"
                          onChange={(event) => update(item.id, { value: event.target.value })}
                          placeholder="#2563EB"
                          value={String(item.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {colorSwatches.map((color) => (
                          <button
                            aria-label={`使用颜色 ${color}`}
                            className={`h-6 w-6 rounded border shadow-sm ${item.value === color ? 'ring-2 ring-blue-500 ring-offset-1' : 'border-white'}`}
                            key={color}
                            onClick={() => update(item.id, { value: color })}
                            style={{ backgroundColor: color }}
                            type="button"
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  ) : typeof item.value === 'boolean' ? (
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input checked={item.value} onChange={(event) => update(item.id, { value: event.target.checked })} type="checkbox" />
                      启用
                    </label>
                  ) : item.options ? (
                    <div className="space-y-2">
                      <select
                        className="text-input"
                        value={getSelectValue(item)}
                        onChange={(event) => {
                          const nextValue = event.target.value === customOption ? `${customPrefix}${customDefaults[item.id] || String(item.value)}` : event.target.value;
                          update(item.id, { value: nextValue });
                        }}
                      >
                        {getOptions(item).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {getSelectValue(item) === customOption ? (
                        <input
                          className="text-input"
                          onChange={(event) => update(item.id, { value: `${customPrefix}${event.target.value}` })}
                          placeholder={customPlaceholders[item.id] || '请输入自定义值'}
                          value={stripCustomPrefix(item.value)}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <input className="text-input" value={item.value} onChange={(event) => update(item.id, { value: event.target.value })} />
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
