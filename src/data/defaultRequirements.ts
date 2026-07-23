import type { ValidationResult } from '../core/validator';

export type RequirementRule = {
  id: string;
  name: string;
  level: 'required' | 'recommended' | 'flexible';
  description: string;
  enabled: boolean;
  validationType: 'builtin' | 'ai';
  builtinValidator?: string;
  sortOrder?: number;
};

export const defaultRequirements: RequirementRule[] = [
  { id: 'R1', name: '标题与品牌', level: 'required', enabled: true, validationType: 'builtin', builtinValidator: 'h1-text', description: '1、顶栏 h1 只能输出纯文字。顶栏标题只能是纯文字（必须是用户提供系统名称全称），旁边不能有任何 logo、图标、Emoji 或图片。2、禁止在标题左侧放置收起侧边栏按钮，会被误认为 logo。' },
  { id: 'R2', name: 'Tailwind 配置', level: 'required', enabled: true, validationType: 'builtin', builtinValidator: 'tailwind-config', description: '必须完整保留 tailwind.config 配置块，可以修改其中的颜色、圆角、字体等值，但不能删除该配置块。' },
  { id: 'R3', name: '子菜单（二级菜单）', level: 'required', enabled: true, validationType: 'builtin', builtinValidator: 'inline-submenu', description: '1、子菜单必须插入到当前一级菜单项下方。点击一级菜单后，子菜单必须在下方以内联方式展开（插入到当前菜单项之后），不能改为下拉、弹出、侧滑或其他形式。2、子菜单要比一级菜单靠右一些；在一级菜单有图标的情况下，至少和一级菜单的文字左对齐，不能比一级菜单靠左。3、点击菜单时，禁止使用左侧边框高亮。' },
  { id: 'R4', name: '导航栏位置', level: 'required', enabled: true, validationType: 'ai', description: '导航菜单栏只能在左侧或顶部。除非额外要求，通常为左侧。' },
  { id: 'R5', name: '空白 iframe', level: 'required', enabled: true, validationType: 'builtin', builtinValidator: 'blank-iframe', description: '不存在的子页面不能注入占位文字。' },
  { id: 'R6', name: '固定主题', level: 'required', enabled: true, validationType: 'builtin', builtinValidator: 'fixed-theme', description: '单个 HTML 不提供运行时主题切换。' },
  { id: 'R7', name: 'Tailwind 优先', level: 'recommended', enabled: true, validationType: 'ai', description: '布局、间距、颜色、圆角、阴影等尽量用 Tailwind 工具类实现，仅滚动条、毛玻璃等极少数情况使用自定义 CSS。' },
  { id: 'R8', name: '核心 JS 逻辑', level: 'required', enabled: true, validationType: 'builtin', builtinValidator: 'core-js', description: 'menuConfig 数据、renderPrimaryMenu、renderSubMenu、navigateTo、message 监听等核心功能逻辑不能改动，只能调整视觉样式类。' },
  { id: 'R9', name: '用户信息', level: 'flexible', enabled: true, validationType: 'ai', description: '用户名和头像可以自由变化（改名、改图标、加标签、甚至完全移除），不受限制。用户名长度遵循实体要求。' },
  { id: 'R10', name: '禁止出现无关数据', level: 'required', enabled: true, validationType: 'ai', description: '无论是侧边栏还是顶栏，都禁止出现统计数字和版本号。' },
  { id: 'R11', name: '退出系统', level: 'required', enabled: true, validationType: 'ai', description: '无论是在用户名头像下拉中退出登录，还是在顶栏最右侧或侧边栏最底部，都必须有退出登录的按钮或者文字。' },
];

export function getRequirementStatus(validation: ValidationResult) {
  return {
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}
