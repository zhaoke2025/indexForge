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
  { id: 'R1', name: '标题与品牌', level: 'required', enabled: true, validationType: 'builtin', description: '顶栏 h1 只能输出纯文字。' },
  { id: 'R2', name: 'Tailwind 配置', level: 'required', enabled: true, validationType: 'builtin', description: '必须保留 tailwind.config 配置块。' },
  { id: 'R3', name: '子菜单内联展开', level: 'required', enabled: true, validationType: 'builtin', description: '子菜单必须插入到当前一级菜单项下方。' },
  { id: 'R4', name: '侧边栏位置', level: 'required', enabled: true, validationType: 'ai', description: '侧边栏必须在主内容左侧。' },
  { id: 'R5', name: '空白 iframe', level: 'required', enabled: true, validationType: 'builtin', description: '不存在的子页面不能注入占位文字。' },
  { id: 'R6', name: '固定主题', level: 'required', enabled: true, validationType: 'builtin', description: '单个 HTML 不提供运行时主题切换。' },
  { id: 'R7', name: 'Tailwind 优先', level: 'recommended', enabled: true, validationType: 'ai', description: '样式优先使用 Tailwind 或母版已有类。' },
  { id: 'R8', name: '核心 JS 逻辑', level: 'required', enabled: true, validationType: 'builtin', description: '不得破坏菜单、iframe 和 message 监听逻辑。' },
  { id: 'R9', name: '用户信息', level: 'flexible', enabled: true, validationType: 'ai', description: '用户名称、角色、头像可以按需变化。' },
];

export function getRequirementStatus(validation: ValidationResult) {
  return {
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}
