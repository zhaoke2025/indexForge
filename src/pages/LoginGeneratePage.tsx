import { Clipboard, Code2, Download, Eye, RotateCw, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import PreviewFrame from '../components/PreviewFrame';
import SourceCodePanel from '../components/SourceCodePanel';
import { generateLoginHtml } from '../core/loginGenerator';
import type { DimensionConfig } from '../data/defaultDimensions';
import type { LoginConfig } from '../data/defaultLoginConfig';
import { stylePresets } from '../data/stylePresets';

type ViewMode = 'preview' | 'source';

type Props = {
  config: LoginConfig;
  onChange: (config: LoginConfig) => void;
  dimensions: DimensionConfig[];
  presetId: string;
};

const selectOptions: { key: keyof LoginConfig; label: string; options: string[] }[] = [
  { key: 'layout', label: '登录框位置', options: ['居中', '偏右'] },
  { key: 'backgroundType', label: '背景类型', options: ['纯色', '几何图案', '图片通铺', '左右分割'] },
  { key: 'colorMode', label: '配色方案', options: ['继承系统主色', '独立品牌色', '纯黑白灰'] },
  { key: 'cardStyle', label: '卡片质感', options: ['跟随系统风格', '纯白实心', '毛玻璃', '半透明', '深色实心'] },
  { key: 'radius', label: '圆角风格', options: ['8px', '12px', '16px'] },
  { key: 'brandMode', label: '品牌区域', options: ['纯文字标题', '标题+标语', '纯文字（无标语）'] },
  { key: 'loginMethod', label: '登录方式组合', options: ['仅账号密码', '账号密码+图形验证码', '账号密码+短信验证码', '手机验证码（无密码）', 'Tab切换（多方式）'] },
  { key: 'formStyle', label: '表单组件风格', options: ['线框风格', '填充风格', '底部下划线'] },
  { key: 'assist', label: '辅助功能组合', options: ['无', '仅记住账号', '仅忘记密码', '记住+忘记'] },
  { key: 'rememberText', label: '记住账号文案', options: ['记住账号', '记住账号（7天）', '记住账号（30天）'] },
  { key: 'forgotText', label: '忘记密码文案', options: ['忘记密码', '忘记密码？请联系管理员', '忘记密码？联系技术支持'] },
  { key: 'registerEntry', label: '注册入口', options: ['无', '有入口+注册页面'] },
  { key: 'loadingState', label: '加载状态', options: ['按钮文字变化', '旋转菊花', '两者都有'] },
  { key: 'errorMode', label: '错误提示方式', options: ['弹窗提示', '输入框下方文字', '顶部横幅'] },
  { key: 'footer', label: '底部信息', options: ['无', '仅版权', '版权+版本号', '版权+隐私政策+服务协议'] },
  { key: 'decoration', label: '装饰元素', options: ['无', '背景光晕', '几何形状', '网格纹理'] },
  { key: 'demoAccount', label: '预填演示数据', options: ['无', 'admin', 'test', 'demo', 'usertest', 'companytest', 'devtest', 'autotest'] },
];

export default function LoginGeneratePage({ config, onChange, dimensions, presetId }: Props) {
  const [html, setHtml] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState('');

  const preset = useMemo(() => stylePresets.find((item) => item.id === presetId) ?? stylePresets[0], [presetId]);

  const update = <K extends keyof LoginConfig>(key: K, value: LoginConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const uploadBackgroundImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('请选择图片文件。');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setNotice('图片建议小于 2MB，避免生成的 login.html 过大。');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...config, backgroundImage: String(reader.result || '') });
      setNotice('背景图片已载入，生成 login.html 后会作为通铺背景。');
    };
    reader.readAsDataURL(file);
  };

  const generate = () => {
    const result = generateLoginHtml(config, preset, dimensions);
    setHtml(result.html);
    setViewMode('preview');
    setRefreshKey((key) => key + 1);
    setNotice('login.html 已生成。');
  };

  const copy = async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setNotice('源码已复制到剪贴板。');
  };

  const download = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'login.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice('login.html 已开始下载。');
  };

  return (
    <div className="grid grid-cols-[460px_minmax(0,1fr)] gap-5 p-5">
      <section className="space-y-4">
        <div className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">基础信息</h2>
            <p className="mt-1 text-xs text-slate-500">标题必须为纯文字，不输出 Logo、图标或 Emoji。</p>
          </div>
          <div className="space-y-3 p-4">
            <label>
              <span className="control-label">系统名称</span>
              <input className="text-input" value={config.systemName} onChange={(event) => update('systemName', event.target.value)} />
            </label>
            <label>
              <span className="control-label">版本号</span>
              <input className="text-input" value={config.version} onChange={(event) => update('version', event.target.value)} />
            </label>
            <label>
              <span className="control-label">标语</span>
              <input className="text-input" value={config.slogan} onChange={(event) => update('slogan', event.target.value)} />
            </label>
            <label>
              <span className="control-label">独立品牌色</span>
              <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                <input className="h-9 w-11 rounded border border-slate-300 bg-white p-1" type="color" value={config.brandColor} onChange={(event) => update('brandColor', event.target.value.toUpperCase())} />
                <input className="text-input" value={config.brandColor} onChange={(event) => update('brandColor', event.target.value)} />
              </div>
            </label>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">登录页变体维度</h2>
            <p className="mt-1 text-xs text-slate-500">覆盖 L1-L17，生成时会继承当前首页主色和风格。</p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {selectOptions.map((item) => (
              <label key={item.key}>
                <span className="control-label">{item.label}</span>
                <select className="text-input" value={String(config[item.key])} onChange={(event) => update(item.key, event.target.value as never)}>
                  {item.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            ))}
            {config.backgroundType === '图片通铺' && (
              <div className="col-span-2 rounded border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">背景图片</div>
                    <div className="mt-1 text-xs text-slate-500">上传后生成的 login.html 会直接内嵌图片并按 cover 通铺。</div>
                  </div>
                  {config.backgroundImage && (
                    <button className="secondary-button" onClick={() => update('backgroundImage', '')} type="button">
                      清除
                    </button>
                  )}
                </div>
                <input className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:h-9 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:text-sm file:text-white" type="file" accept="image/*" onChange={(event) => uploadBackgroundImage(event.target.files?.[0])} />
                {config.backgroundImage ? (
                  <div className="mt-3 h-28 rounded border border-slate-200 bg-cover bg-center" style={{ backgroundImage: `url(${config.backgroundImage})` }} />
                ) : (
                  <div className="mt-3 rounded border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                    未上传图片时，生成源码会保留注释示例链接，管理员可手动替换。
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="primary-button flex-1" onClick={generate} type="button">
            <Wand2 size={16} />
            生成 login.html
          </button>
          <button className="secondary-button" onClick={generate} type="button">
            <RotateCw size={16} />
            重新生成
          </button>
        </div>
        {notice && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}
      </section>

      <section className="min-w-0 rounded border border-slate-200 bg-white">
        <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">登录页结果</h2>
            <p className="text-xs text-slate-500">预览与源码输出</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded border border-slate-300 bg-white p-0.5">
              <button className={`inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm ${viewMode === 'preview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => { setViewMode('preview'); setRefreshKey((key) => key + 1); }} type="button">
                <Eye size={15} />
                预览
              </button>
              <button className={`inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm ${viewMode === 'source' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setViewMode('source')} type="button">
                <Code2 size={15} />
                源码
              </button>
            </div>
            <button className="secondary-button" disabled={!html} onClick={copy} type="button">
              <Clipboard size={16} />
              复制
            </button>
            <button className="primary-button" disabled={!html} onClick={download} type="button">
              <Download size={16} />
              下载
            </button>
          </div>
        </div>
        <div className="h-[calc(100vh-7.75rem)] overflow-hidden">
          {!html ? (
            <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
              点击生成后在这里查看 login.html 预览。
            </div>
          ) : viewMode === 'preview' ? (
            <PreviewFrame html={html} refreshKey={refreshKey} />
          ) : (
            <SourceCodePanel html={html} />
          )}
        </div>
      </section>
    </div>
  );
}
