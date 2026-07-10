export type StylePreset = {
  id: string;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
  light: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  borderLight: string;
  activeBg: string;
  contentFrameBg: string;
  radius: string;
  cardRadius: string;
  sidebarWidth: string;
  headerHeight: string;
  shadow: string;
  fontStack: string;
};

export const stylePresets: StylePreset[] = [
  {
    id: 'minimal-doc',
    name: '极简文档风',
    description: '灰白、直角、浅色、窄栏、无图标、大留白。',
    primary: '#111827',
    secondary: '#6B7280',
    accent: '#2563EB',
    dark: '#FAFAFA',
    light: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: '#F3F4F6',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    borderLight: '#E5E7EB',
    activeBg: '#F3F4F6',
    contentFrameBg: '#FFFFFF',
    radius: '0px',
    cardRadius: '0px',
    sidebarWidth: '232px',
    headerHeight: '56px',
    shadow: 'none',
    fontStack: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: 'cyber-geek',
    name: '赛博极客风',
    description: '荧光绿、直角、等宽、深色、隐形滚动条、极速过渡。',
    primary: '#00FF41',
    secondary: '#22C55E',
    accent: '#00FF41',
    dark: '#020617',
    light: '#0F172A',
    surface: '#0B1220',
    surfaceMuted: '#111827',
    textPrimary: '#E5FFE9',
    textSecondary: '#86EFAC',
    borderLight: '#14532D',
    activeBg: '#052E16',
    contentFrameBg: '#020617',
    radius: '0px',
    cardRadius: '0px',
    sidebarWidth: '248px',
    headerHeight: '56px',
    shadow: '0 0 24px rgba(0, 255, 65, 0.16)',
    fontStack: '"Fira Code", "JetBrains Mono", "Consolas", monospace',
  },
  {
    id: 'young-candy',
    name: '年轻糖果风',
    description: '粉紫、大圆角、NEW 角标、用户区活泼、大间距。',
    primary: '#EC4899',
    secondary: '#A78BFA',
    accent: '#F472B6',
    dark: '#FFF7FB',
    light: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: '#FCE7F3',
    textPrimary: '#4A044E',
    textSecondary: '#9D5C82',
    borderLight: '#FBCFE8',
    activeBg: '#FCE7F3',
    contentFrameBg: '#FFF7FB',
    radius: '16px',
    cardRadius: '16px',
    sidebarWidth: '268px',
    headerHeight: '64px',
    shadow: '0 10px 30px rgba(236, 72, 153, 0.16)',
    fontStack: '"PingFang SC", "Inter", "Microsoft YaHei", sans-serif',
  },
  {
    id: 'enterprise-stable',
    name: '企业稳重风',
    description: '靛蓝、克制圆角、阴影加深、左边框、版本号和管理员标签。',
    primary: '#4F46E5',
    secondary: '#818CF8',
    accent: '#2563EB',
    dark: '#F8FAFC',
    light: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF2FF',
    textPrimary: '#111827',
    textSecondary: '#64748B',
    borderLight: '#CBD5E1',
    activeBg: '#E0E7FF',
    contentFrameBg: '#FFFFFF',
    radius: '6px',
    cardRadius: '6px',
    sidebarWidth: '260px',
    headerHeight: '60px',
    shadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
    fontStack: '"PingFang SC", "Microsoft YaHei", "Inter", sans-serif',
  },
  {
    id: 'immersive-media',
    name: '沉浸媒体风',
    description: '白色主色、深色、顶栏极简、内容沉浸、全屏布局。',
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    accent: '#38BDF8',
    dark: '#020617',
    light: '#0F172A',
    surface: '#111827',
    surfaceMuted: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    borderLight: '#334155',
    activeBg: '#1E293B',
    contentFrameBg: '#020617',
    radius: '4px',
    cardRadius: '4px',
    sidebarWidth: '252px',
    headerHeight: '48px',
    shadow: 'none',
    fontStack: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
];

export const defaultStylePreset = stylePresets[0];
