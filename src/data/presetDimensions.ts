import type { DimensionConfig } from './defaultDimensions';
import { stylePresets } from './stylePresets';

type DimensionOverrides = Record<string, string | boolean>;

const presetDimensionOverrides: Record<string, DimensionOverrides> = {
  'minimal-doc': {
    mode: '浅色',
    shadow: '无',
    activeMenu: '仅文字',
    submenuTrigger: '无',
    submenuAnimation: '无',
    menuBadge: '无',
    menuIcons: '隐藏',
    menuDivider: false,
    spacing: '宽松',
    borderStyle: '标准',
    scrollbar: '细',
    transitionSpeed: '标准',
    contentMaxWidth: '文档居中',
    contentBg: '纯色',
    userInfo: '仅姓名+下拉',
    sidebarFooter: '版本信息',
  },
  'cyber-geek': {
    mode: '深色',
    shadow: '强',
    activeMenu: '左边框',
    submenuTrigger: '箭头',
    submenuAnimation: '快速',
    iframeLoading: '深色空白',
    menuBadge: '无',
    menuIcons: 'FontAwesome',
    menuDivider: false,
    spacing: '紧凑',
    borderStyle: '无',
    scrollbar: '细',
    transitionSpeed: '快速',
    contentMaxWidth: '全屏',
    contentBg: '深色',
    userInfo: '头像+姓名+角色+下拉',
    sidebarFooter: '版本信息',
  },
  'young-candy': {
    mode: '浅色',
    shadow: '强',
    activeMenu: '背景色块',
    submenuTrigger: '箭头',
    submenuAnimation: '柔和',
    menuBadge: 'NEW',
    menuIcons: 'FontAwesome',
    menuDivider: false,
    spacing: '宽松',
    borderStyle: '标准',
    scrollbar: '标准',
    transitionSpeed: '柔和',
    contentMaxWidth: '全屏',
    contentBg: '跟随预设',
    userInfo: '头像+姓名+角色+下拉',
    sidebarFooter: '版本信息',
  },
  'enterprise-stable': {
    mode: '浅色',
    shadow: '强',
    activeMenu: '左边框',
    submenuTrigger: '箭头',
    submenuAnimation: '标准',
    menuBadge: '无',
    menuIcons: 'FontAwesome',
    menuDivider: true,
    spacing: '标准',
    borderStyle: '标准',
    scrollbar: '标准',
    transitionSpeed: '标准',
    contentMaxWidth: '全屏',
    contentBg: '浅灰',
    userInfo: '头像+姓名+角色+下拉',
    sidebarFooter: '版本信息',
  },
  'immersive-media': {
    mode: '深色',
    shadow: '无',
    activeMenu: '仅文字',
    submenuTrigger: '无',
    submenuAnimation: '柔和',
    iframeLoading: '深色空白',
    menuBadge: '无',
    menuIcons: '弱化',
    menuDivider: false,
    spacing: '紧凑',
    borderStyle: '无',
    scrollbar: '细',
    transitionSpeed: '柔和',
    contentMaxWidth: '全屏',
    contentBg: '深色',
    userInfo: '移除用户',
    sidebarFooter: '',
    headerHeight: '48px',
  },
};

export function applyStylePresetToDimensions(presetId: string, dimensions: DimensionConfig[]): DimensionConfig[] {
  const preset = stylePresets.find((item) => item.id === presetId);
  const overrides: Record<string, string | boolean | undefined> = {
    primary: preset?.primary,
    radius: preset?.radius,
    font: preset?.fontStack,
    sidebarWidth: preset?.sidebarWidth,
    headerHeight: preset?.headerHeight,
    ...presetDimensionOverrides[presetId],
  };

  return dimensions.map((dimension) => {
    const value = overrides[dimension.id];
    if (value === undefined) return dimension;
    return { ...dimension, enabled: true, value };
  });
}
