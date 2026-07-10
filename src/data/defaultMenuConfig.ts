import type { MenuItemConfig } from '../core/types';

export const defaultMenuConfig: MenuItemConfig[] = [
  {
    id: 'ai-tools',
    name: '智能旅行助手',
    icon: 'fa-globe',
    subMenu: [
      { name: '智能行程规划', file: 'trip-planning' },
      { name: '旅行百科问答', file: 'travel-qa' },
      { name: '行程预算分析器', file: 'budget-analyzer' },
    ],
  },
  {
    id: 'knowledge',
    name: '知识库管理',
    icon: 'fa-database',
    file: 'knowledge-management',
    subMenu: [],
  },
  {
    id: 'settings',
    name: '系统设置',
    icon: 'fa-cog',
    file: 'system-settings',
    subMenu: [],
  },
];
