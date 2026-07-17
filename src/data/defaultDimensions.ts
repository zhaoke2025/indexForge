export type DimensionConfig = {
  id: string;
  name: string;
  group: string;
  enabled: boolean;
  description: string;
  value: string | boolean;
  options?: string[];
  valueType?: 'text' | 'boolean' | 'single-select';
  sortOrder?: number;
};

export const defaultDimensions: DimensionConfig[] = [
  { id: 'primary', name: '配色方案', group: '视觉基因层', enabled: true, description: '主色、辅色、背景色、文字色和状态色。', value: '#2563EB' },
  { id: 'radius', name: '圆角半径', group: '视觉基因层', enabled: true, description: '按钮、侧栏、iframe 和弹窗的圆角控制。', value: '6px', options: ['0px', '4px', '6px', '8px', '12px', '16px', '自定义'] },
  { id: 'font', name: '字体家族', group: '视觉基因层', enabled: true, description: '系统主要字体栈。', value: '"PingFang SC", "Microsoft YaHei", "Inter", sans-serif' },
  { id: 'mode', name: '明暗模式', group: '视觉基因层', enabled: true, description: '页面整体明暗关系。', value: '跟随预设', options: ['跟随预设', '浅色', '深色', '纯黑极客', '自定义'] },
  { id: 'shadow', name: '阴影深度', group: '视觉基因层', enabled: true, description: '顶部栏、内容框和弹层的层次。', value: '标准', options: ['无', '轻', '标准', '强', '自定义'] },
  { id: 'sidebarWidth', name: '侧边栏宽度', group: '布局结构层', enabled: true, description: '左侧导航占用宽度。', value: '260px', options: ['232px', '248px', '260px', '280px', '320px'] },
  { id: 'sidebarScroll', name: '侧边栏滚动策略', group: '布局结构层', enabled: true, description: '侧边栏菜单是否独立滚动。', value: '独立滚动', options: ['独立滚动', '整体滚动'] },
  { id: 'headerHeight', name: '顶栏高度与元素', group: '布局结构层', enabled: true, description: '顶栏高度和信息密度。', value: '60px', options: ['48px', '56px', '60px', '64px'] },
  { id: 'contentBg', name: '内容区背景材质', group: '布局结构层', enabled: true, description: 'iframe 外层背景效果。', value: '跟随预设', options: ['跟随预设', '纯色', '深色', '浅灰'] },
  { id: 'sidebarToggle', name: '侧边栏折叠控制', group: '布局结构层', enabled: true, description: '保留顶部折叠按钮。', value: true },
  { id: 'sidebarTogglePosition', name: '侧边栏折叠按钮位置', group: '布局结构层', enabled: true, description: '折叠按钮可放在标题左侧、标题右侧、侧边栏底部或用户信息左侧。', value: '标题左侧', options: ['标题左侧', '标题右侧', '侧边栏底部', '用户信息左侧'] },
  { id: 'sidebarToggleIcon', name: '侧边栏折叠图标', group: '信息装饰层', enabled: true, description: '选择折叠按钮展开和收起时使用的图标样式。', value: '菜单', options: ['菜单', '双箭头', '单箭头', '面板折叠'] },
  { id: 'activeMenu', name: '菜单激活态样式', group: '交互反馈层', enabled: true, description: '一级菜单和子菜单选中样式。', value: '背景色块', options: ['背景色块', '左边框', '仅文字'] },
  { id: 'submenuTrigger', name: '子菜单展开触发器', group: '交互反馈层', enabled: true, description: '一级菜单右侧是否显示层级提示。', value: '无', options: ['无', '箭头', '加号'] },
  { id: 'submenuAnimation', name: '子菜单展开动画', group: '交互反馈层', enabled: true, description: '子菜单展开和收起速度。', value: '标准', options: ['无', '快速', '标准', '柔和'] },
  { id: 'iframeLoading', name: 'iframe 加载状态', group: '交互反馈层', enabled: true, description: '子页面加载期间反馈。', value: '空白', options: ['空白', '深色空白', '浅色空白'] },
  { id: 'menuIcons', name: '菜单图标系统', group: '信息装饰层', enabled: true, description: '菜单左侧图标风格。', value: 'FontAwesome', options: ['FontAwesome', '弱化', '隐藏'] },
  { id: 'menuDivider', name: '菜单分割线', group: '信息装饰层', enabled: true, description: '菜单项之间是否显示分割线。', value: false },
  { id: 'menuBadge', name: '菜单角标/徽章', group: '信息装饰层', enabled: true, description: '菜单项右侧标记。', value: '无', options: ['无', 'NEW', 'Beta'] },
  { id: 'sidebarFooter', name: '侧边栏底部信息', group: '信息装饰层', enabled: true, description: '侧边栏底部版本信息。', value: '版本信息' },
  { id: 'userInfo', name: '顶栏用户信息与下拉菜单', group: '信息装饰层', enabled: true, description: '用户名、角色、头像，以及右上角修改密码、退出登录下拉操作。', value: '头像+姓名+角色+下拉', options: ['头像+姓名+角色+下拉', '头像+姓名+角色', '头像+姓名+下拉', '头像+姓名', '仅姓名+下拉', '仅姓名', '移除用户'] },
  { id: 'menuOrder', name: '菜单顺序与重组', group: '信息装饰层', enabled: true, description: '控制菜单排序方式，或通过菜单配置页精确调整。', value: '默认', options: ['默认', '一级菜单按名称排序', '子菜单按名称排序'] },
  { id: 'spacing', name: '间距', group: '额外基础层', enabled: true, description: '页面内边距和菜单间距。', value: '标准', options: ['紧凑', '标准', '宽松', '自定义'] },
  { id: 'borderStyle', name: '全局边框样式', group: '视觉基因层', enabled: true, description: '边框强度与形态。', value: '标准', options: ['无', '标准', '强调', '自定义'] },
  { id: 'scrollbar', name: '滚动条外观', group: '视觉基因层', enabled: true, description: '滚动条宽度和颜色。', value: '标准', options: ['细', '标准', '强调', '自定义'] },
  { id: 'transitionSpeed', name: '全局过渡速度', group: '交互反馈层', enabled: true, description: 'hover、active、展开折叠的过渡速度。', value: '标准', options: ['快速', '标准', '柔和', '自定义'] },
  { id: 'contentMaxWidth', name: '内容区域最大宽度与对齐', group: '布局结构层', enabled: true, description: '内容区是否全屏或居中。', value: '全屏', options: ['全屏', '宽屏居中', '文档居中'] },
];
