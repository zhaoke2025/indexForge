import { StylePreset } from '../data/stylePresets';
import type { DimensionConfig } from '../data/defaultDimensions';
import type { MenuItemConfig } from './types';
import { buildDisplayName, normalizeVersion } from './version';
import { validateGeneratedHtml, ValidationResult } from './validator';

export type UserConfig = {
  userName: string;
  role: string;
  avatarIcon: string;
  showRole: boolean;
};

export type GenerateOptions = {
  systemName: string;
  version: string;
  preset: StylePreset;
  user: UserConfig;
  dimensions?: DimensionConfig[];
  menuConfig?: MenuItemConfig[];
};

export type GenerateResult = {
  html: string;
  displayName: string;
  normalizedVersion: string;
  validation: ValidationResult;
};

const sourceColors = {
  primary: '#F59E0B',
  secondary: '#FBBF24',
  accent: '#F59E0B',
  dark: '#0F172A',
  light: '#F8FAFC',
  surface: '#1E293B',
  surfaceMuted: '#334155',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  borderLight: '#334155',
  activeBg: '#422006',
  contentFrameBg: '#1E293B',
  hoverSurface: '#475569',
  mutedText: '#CBD5E1',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceAllLiteral(source: string, from: string, to: string): string {
  return source.replace(new RegExp(escapeRegExp(from), 'g'), to);
}

function normalizeIcon(icon: string): string {
  const trimmed = icon.trim();
  if (!trimmed) return 'fa-user-o';
  return trimmed.startsWith('fa-') ? trimmed : `fa-${trimmed}`;
}

function buildUserMenu(user: UserConfig, preset: StylePreset, userInfoShape?: string | boolean): string {
  const userName = escapeHtml(user.userName.trim() || '系统管理员');
  const role = escapeHtml(user.role.trim() || '管理员');
  const icon = escapeHtml(normalizeIcon(user.avatarIcon));
  const shape = typeof userInfoShape === 'string' ? userInfoShape : '头像+姓名+角色';
  if (shape === '移除用户') {
    return '<div class="user-menu user-menu-hidden" style="display: none;"></div>';
  }

  const hasDropdown = shape.includes('下拉');
  const dropdownItems = [
    '<button class="user-dropdown-item" type="button" data-user-action="change-password"><i class="fa fa-key"></i><span>修改密码</span></button>',
    '<button class="user-dropdown-item danger" type="button" data-user-action="logout"><i class="fa fa-sign-out"></i><span>退出登录</span></button>',
  ].filter(Boolean).join('\n                    ');
  const dropdownMarkup = hasDropdown
    ? `<button class="user-menu-arrow" type="button" aria-label="打开用户菜单"><i class="fa fa-angle-down"></i></button>
                <div class="user-dropdown" id="userDropdownMenu">
                    ${dropdownItems}
                </div>`
    : '';

  if (shape.startsWith('仅姓名')) {
    return `<div class="user-menu user-menu-text-only">
                <span class="user-name">${userName}</span>
                ${dropdownMarkup}
            </div>`;
  }

  const roleMarkup = user.showRole && shape.includes('角色') ? `<span class="user-role">${role}</span>` : '';

  return `<div class="user-menu">
                <div class="avatar-circle">
                    <i class="fa ${icon}"></i>
                </div>
                <div class="user-meta">
                    <span class="user-name">${userName}</span>
                    ${roleMarkup}
                </div>
                ${dropdownMarkup}
            </div>`;
}

function injectRoleStyles(html: string, preset: StylePreset): string {
  const roleCss = `

        .user-meta {
            display: flex;
            align-items: flex-start;
            flex-direction: column;
            gap: 2px;
        }

        .user-role {
            color: ${preset.textSecondary};
            font-size: 0.72rem;
            font-weight: 500;
            line-height: 1;
        }`;

  if (html.includes('.user-role')) return html;
  return html.replace(/(\s*\.modal-overlay\s*\{)/, `${roleCss}\n\n$1`);
}

function injectUserDropdown(html: string): string {
  if (!html.includes('user-dropdown')) return html;

  let output = appendCss(html, `        .user-menu {
            position: relative;
        }

        .user-menu-arrow {
            border: none;
            background: transparent;
            color: inherit;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            opacity: 0.72;
        }

        .user-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            min-width: 148px;
            padding: 6px;
            background: #ffffff;
            color: #0f172a;
            border: 1px solid rgba(148, 163, 184, 0.35);
            border-radius: 8px;
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
            display: none;
            z-index: 80;
        }

        .user-dropdown.open {
            display: block;
        }

        .user-dropdown-item {
            width: 100%;
            height: 34px;
            border: none;
            background: transparent;
            color: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 10px;
            border-radius: 6px;
            font-size: 13px;
            text-align: left;
        }

        .user-dropdown-item:hover {
            background: #f1f5f9;
        }

        .user-dropdown-item.danger {
            color: #dc2626;
        }
`);

  const script = `

        function bindUserDropdown() {
            const userMenu = document.querySelector('.user-menu');
            const dropdown = document.getElementById('userDropdownMenu');
            if (!userMenu || !dropdown) return;
            userMenu.addEventListener('click', (event) => {
                event.stopPropagation();
                dropdown.classList.toggle('open');
            });
            document.addEventListener('click', () => dropdown.classList.remove('open'));
            dropdown.querySelectorAll('[data-user-action]').forEach((button) => {
                button.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    const action = button.getAttribute('data-user-action');
                    dropdown.classList.remove('open');
                    if (action === 'change-password') {
                        await showAlert('修改密码', '请在业务系统中接入修改密码页面或接口。', 'info');
                    }
                    if (action === 'logout') {
                        const confirmed = await showConfirm('退出登录', '确定要退出当前系统吗？', '退出登录', '取消');
                        if (confirmed) window.dispatchEvent(new CustomEvent('userLogout'));
                    }
                });
            });
        }
`;

  output = output.replace('\n        function init() {', `${script}\n        function init() {`);
  output = output.replace('window.onload = init;', "window.onload = function() { init(); bindUserDropdown(); };");
  return output;
}

function applyPreset(html: string, preset: StylePreset): string {
  let output = html;

  const colorPairs: Array<[string, string]> = [
    [sourceColors.primary, preset.primary],
    [sourceColors.secondary, preset.secondary],
    [sourceColors.accent, preset.accent],
    [sourceColors.dark, preset.dark],
    [sourceColors.light, preset.light],
    [sourceColors.surface, preset.surface],
    [sourceColors.surfaceMuted, preset.surfaceMuted],
    [sourceColors.textPrimary, preset.textPrimary],
    [sourceColors.textSecondary, preset.textSecondary],
    [sourceColors.borderLight, preset.borderLight],
    [sourceColors.activeBg, preset.activeBg],
    [sourceColors.contentFrameBg, preset.contentFrameBg],
    [sourceColors.hoverSurface, preset.surfaceMuted],
    [sourceColors.mutedText, preset.textSecondary],
  ];

  for (const [from, to] of colorPairs) {
    output = replaceAllLiteral(output, from, to);
  }

  output = output
    .replace(/'DEFAULT':\s*'[^']*'/, `'DEFAULT': '${preset.radius}'`)
    .replace(/'card':\s*'[^']*'/, `'card': '${preset.cardRadius}'`)
    .replace(/border-radius:\s*0px;/g, `border-radius: ${preset.radius};`)
    .replace(/width:\s*260px;/, `width: ${preset.sidebarWidth};`)
    .replace(/height:\s*64px;/, `height: ${preset.headerHeight};`)
    .replace(/box-shadow:\s*0 1px 3px rgba\(0, 0, 0, 0\.15\);/g, `box-shadow: ${preset.shadow};`)
    .replace(/font-family:\s*"PingFang SC", "微软雅黑", "Microsoft YaHei", "Inter", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;/, `font-family: ${preset.fontStack};`)
    .replace(/'modern':\s*\[[^\]]+\]/, `'modern': [${preset.fontStack.split(',').map((font) => `'${font.trim().replace(/"/g, '')}'`).join(', ')}]`);

  return output;
}

function getDimensionValue(dimensions: DimensionConfig[] | undefined, id: string) {
  const dimension = dimensions?.find((item) => item.id === id && item.enabled);
  return dimension?.value;
}

function isCustomDimensionValue(value: string | boolean | undefined) {
  return typeof value === 'string' && value.startsWith('自定义:');
}

function unwrapCustomDimensionValue(value: string | boolean | undefined) {
  return typeof value === 'string' && isCustomDimensionValue(value) ? value.slice('自定义:'.length).trim() : value;
}

function appendCss(html: string, css: string): string {
  if (!css.trim()) return html;
  return html.replace('</style>', `\n\n        /* IndexForge dimension overrides */\n${css}\n    </style>`);
}

function cssRule(selector: string, declarations: Record<string, string | undefined>): string {
  const body = Object.entries(declarations)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `            ${key}: ${value};`)
    .join('\n');
  return body ? `        ${selector} {\n${body}\n        }\n` : '';
}

function shadowValue(value: string | boolean | undefined) {
  if (isCustomDimensionValue(value)) return unwrapCustomDimensionValue(value) as string;
  if (value === '无') return 'none';
  if (value === '轻') return '0 4px 12px rgba(15, 23, 42, 0.10)';
  if (value === '标准') return '0 8px 24px rgba(15, 23, 42, 0.16)';
  if (value === '强') return '0 18px 44px rgba(15, 23, 42, 0.28)';
  return undefined;
}

function orderMenuConfig(menuConfig: MenuItemConfig[] | undefined, dimensions: DimensionConfig[] | undefined) {
  if (!menuConfig?.length) return menuConfig;
  const order = getDimensionValue(dimensions, 'menuOrder');
  let next = menuConfig.map((menu) => ({ ...menu, subMenu: [...menu.subMenu] }));
  if (order === '一级菜单按名称排序') next = next.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  if (order === '子菜单按名称排序') next = next.map((menu) => ({ ...menu, subMenu: [...menu.subMenu].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')) }));
  return next;
}

function applyDimensions(html: string, dimensions: DimensionConfig[] | undefined, preset: StylePreset): string {
  if (!dimensions?.length) return html;

  let output = html;
  let css = '';
  const primary = getDimensionValue(dimensions, 'primary');
  const radius = getDimensionValue(dimensions, 'radius');
  const font = getDimensionValue(dimensions, 'font');
  const mode = getDimensionValue(dimensions, 'mode');
  const shadow = getDimensionValue(dimensions, 'shadow');
  const sidebarWidth = getDimensionValue(dimensions, 'sidebarWidth');
  const sidebarScroll = getDimensionValue(dimensions, 'sidebarScroll');
  const headerHeight = getDimensionValue(dimensions, 'headerHeight');
  const contentBg = getDimensionValue(dimensions, 'contentBg');
  const sidebarToggle = getDimensionValue(dimensions, 'sidebarToggle');
  const activeMenu = getDimensionValue(dimensions, 'activeMenu');
  const submenuAnimation = getDimensionValue(dimensions, 'submenuAnimation');
  const iframeLoading = getDimensionValue(dimensions, 'iframeLoading');
  const spacing = getDimensionValue(dimensions, 'spacing');
  const borderStyle = getDimensionValue(dimensions, 'borderStyle');
  const scrollbar = getDimensionValue(dimensions, 'scrollbar');
  const transitionSpeed = getDimensionValue(dimensions, 'transitionSpeed');
  const menuIcons = getDimensionValue(dimensions, 'menuIcons');
  const menuDivider = getDimensionValue(dimensions, 'menuDivider');
  const contentMaxWidth = getDimensionValue(dimensions, 'contentMaxWidth');

  if (typeof primary === 'string' && primary.startsWith('#')) {
    output = replaceAllLiteral(output, preset.primary, primary);
    output = output.replace(/primary:\s*'#[^']+'/g, `primary: '${primary}'`);
    output = output.replace(/background:\s*linear-gradient\(135deg,\s*#[0-9A-Fa-f]{6},\s*#[0-9A-Fa-f]{6}\);/g, `background: ${primary};`);
  }
  if (mode === '浅色') {
    css += cssRule('body, .app-container, .app-main', { 'background-color': '#F8FAFC', color: '#0F172A' });
    css += cssRule('.app-header, .app-sidebar, .dynamic-submenu-wrapper', { 'background-color': '#FFFFFF', color: '#0F172A' });
    css += cssRule('.app-header h1, .nav-primary-item, .user-name', { color: '#0F172A' });
    css += cssRule('.submenu-item, .user-role', { color: '#64748B' });
  }
  if (mode === '深色') {
    css += cssRule('body, .app-container, .app-main', { 'background-color': '#0F172A', color: '#F8FAFC' });
    css += cssRule('.app-header, .app-sidebar, .dynamic-submenu-wrapper', { 'background-color': '#1E293B', color: '#F8FAFC' });
    css += cssRule('.app-header h1, .nav-primary-item, .user-name', { color: '#F8FAFC' });
    css += cssRule('.submenu-item, .user-role', { color: '#CBD5E1' });
  }
  if (mode === '纯黑极客') {
    css += cssRule('body, .app-container, .app-main, .app-content', { 'background-color': '#000000', color: '#22C55E' });
    css += cssRule('.app-header, .app-sidebar, .dynamic-submenu-wrapper', { 'background-color': '#020617', color: '#22C55E' });
    css += cssRule('.app-header h1, .nav-primary-item, .user-name', { color: '#22C55E' });
    css += cssRule('.submenu-item, .user-role', { color: '#86EFAC' });
    css += cssRule('#contentFrame', { background: '#000000' });
  }
  if (isCustomDimensionValue(mode)) {
    const [pageBg = '#F8FAFC', surfaceBg = '#FFFFFF', textColor = '#0F172A', mutedColor = '#64748B'] = (unwrapCustomDimensionValue(mode) as string).split(/\s+/);
    css += cssRule('body, .app-container, .app-main, .app-content', { 'background-color': pageBg, color: textColor });
    css += cssRule('.app-header, .app-sidebar, .dynamic-submenu-wrapper', { 'background-color': surfaceBg, color: textColor });
    css += cssRule('.app-header h1, .nav-primary-item, .user-name', { color: textColor });
    css += cssRule('.submenu-item, .user-role', { color: mutedColor });
  }
  const radiusValue = unwrapCustomDimensionValue(radius);
  if (typeof radiusValue === 'string') {
    output = output.replace(/border-radius:\s*[^;]+;/g, `border-radius: ${radiusValue};`);
    output = output.replace(/'DEFAULT':\s*'[^']*'/, `'DEFAULT': '${radiusValue}'`);
    output = output.replace(/'card':\s*'[^']*'/, `'card': '${radiusValue}'`);
  }
  if (typeof font === 'string') {
    output = output.replace(/font-family:\s*[^;]+;/, `font-family: ${font};`);
  }
  const dimensionShadow = shadowValue(shadow);
  if (dimensionShadow) {
    css += cssRule('.app-header', { 'box-shadow': dimensionShadow, 'z-index': '20' });
    css += cssRule('.app-sidebar', { 'box-shadow': dimensionShadow, 'z-index': '10' });
    css += cssRule('.app-content, #contentFrame, .dynamic-submenu-wrapper, .modal-dialog-custom', { 'box-shadow': dimensionShadow });
  }
  const sidebarWidthValue = unwrapCustomDimensionValue(sidebarWidth);
  if (typeof sidebarWidthValue === 'string') output = output.replace(/\.app-sidebar\s*\{([\s\S]*?)width:\s*[^;]+;/, `.app-sidebar {$1width: ${sidebarWidthValue};`);
  if (sidebarScroll === '整体滚动') {
    css += cssRule('.app-sidebar, .sidebar-menu-container', { 'overflow-y': 'visible' });
  }
  if (sidebarScroll === '独立滚动') {
    css += cssRule('.app-sidebar, .sidebar-menu-container', { 'overflow-y': 'auto' });
  }
  if (isCustomDimensionValue(sidebarScroll)) {
    css += cssRule('.app-sidebar, .sidebar-menu-container', { 'overflow-y': unwrapCustomDimensionValue(sidebarScroll) as string });
  }
  const headerHeightValue = unwrapCustomDimensionValue(headerHeight);
  if (typeof headerHeightValue === 'string') output = output.replace(/\.app-header\s*\{([\s\S]*?)height:\s*[^;]+;/, `.app-header {$1height: ${headerHeightValue};`);
  if (contentBg === '纯色') css += cssRule('.app-content', { 'background-color': '#FFFFFF' });
  if (contentBg === '深色') css += cssRule('.app-content', { 'background-color': '#0F172A' });
  if (contentBg === '浅灰') css += cssRule('.app-content', { 'background-color': '#F1F5F9' });
  if (isCustomDimensionValue(contentBg)) css += cssRule('.app-content', { background: unwrapCustomDimensionValue(contentBg) as string });
  if (sidebarToggle === false) css += cssRule('.sidebar-toggle-btn', { display: 'none' });
  if (activeMenu === '左边框') {
    css += cssRule('.nav-primary-active, .submenu-active', { 'background-color': 'transparent', 'border-left': `4px solid ${typeof primary === 'string' ? primary : preset.primary}`, color: typeof primary === 'string' ? primary : preset.primary });
  }
  if (activeMenu === '仅文字') {
    css += cssRule('.nav-primary-active, .submenu-active', { 'background-color': 'transparent', 'border-left': 'none', 'font-weight': '700', color: typeof primary === 'string' ? primary : preset.primary });
  }
  if (submenuAnimation === '无') css += cssRule('.dynamic-submenu-wrapper, .submenu-item', { transition: 'none' });
  if (submenuAnimation === '快速') css += cssRule('.dynamic-submenu-wrapper, .submenu-item', { transition: 'all 0.08s ease-out' });
  if (submenuAnimation === '柔和') css += cssRule('.dynamic-submenu-wrapper, .submenu-item', { transition: 'all 0.4s ease-in-out' });
  if (isCustomDimensionValue(submenuAnimation)) css += cssRule('.dynamic-submenu-wrapper, .submenu-item', { transition: unwrapCustomDimensionValue(submenuAnimation) as string });
  if (iframeLoading === '深色空白') css += cssRule('#contentFrame', { background: '#111827' });
  if (iframeLoading === '浅色空白') css += cssRule('#contentFrame', { background: '#F8FAFC' });
  if (isCustomDimensionValue(iframeLoading)) css += cssRule('#contentFrame', { background: unwrapCustomDimensionValue(iframeLoading) as string });
  if (spacing === '紧凑') {
    css += cssRule('.app-header', { padding: '0 16px' });
    css += cssRule('.header-left, .user-menu', { gap: '8px' });
    css += cssRule('.app-content', { padding: '12px 16px' });
    css += cssRule('.nav-primary-item', { padding: '8px 14px', gap: '8px' });
    css += cssRule('.submenu-item', { padding: '7px 14px 7px 38px', gap: '6px' });
    css += cssRule('#contentFrame', { width: '100%' });
  }
  if (spacing === '宽松') {
    css += cssRule('.app-header', { padding: '0 32px' });
    css += cssRule('.header-left, .user-menu', { gap: '20px' });
    css += cssRule('.app-content', { padding: '32px 40px' });
    css += cssRule('.nav-primary-item', { padding: '16px 24px', gap: '16px' });
    css += cssRule('.submenu-item', { padding: '14px 24px 14px 56px', gap: '14px' });
    css += cssRule('#contentFrame', { width: '100%' });
  }
  if (isCustomDimensionValue(spacing)) {
    const spacingValue = unwrapCustomDimensionValue(spacing) as string;
    const [blockGap = spacingValue, inlineGap = spacingValue] = spacingValue.split(/\s+/);
    css += cssRule('.app-header', { padding: `0 ${inlineGap}` });
    css += cssRule('.header-left, .user-menu', { gap: inlineGap });
    css += cssRule('.app-content', { padding: spacingValue });
    css += cssRule('.nav-primary-item', { padding: spacingValue, gap: inlineGap });
    css += cssRule('.submenu-item', { padding: `${blockGap} ${inlineGap} ${blockGap} calc(${inlineGap} + 28px)`, gap: inlineGap });
  }
  if (borderStyle === '无') output = output.replace(/border-(right|bottom|top|left):\s*1px solid [^;]+;/g, 'border-$1: none;');
  if (borderStyle === '强调') output = output.replace(/border-(right|bottom|top|left):\s*1px solid/g, 'border-$1: 2px solid');
  if (isCustomDimensionValue(borderStyle)) {
    css += cssRule('.app-header, .app-sidebar, #contentFrame, .dynamic-submenu-wrapper, .modal-dialog-custom', {
      border: unwrapCustomDimensionValue(borderStyle) as string,
    });
  }
  if (transitionSpeed === '快速') output = output.replace(/0\.2s|0\.25s/g, '0.08s');
  if (transitionSpeed === '柔和') output = output.replace(/0\.2s|0\.25s/g, '0.35s');
  if (isCustomDimensionValue(transitionSpeed)) {
    css += cssRule('.app-header, .app-sidebar, .nav-primary-item, .submenu-item, .dynamic-submenu-wrapper, .user-menu, #contentFrame', {
      transition: `all ${unwrapCustomDimensionValue(transitionSpeed)}`,
    });
  }
  if (menuIcons === '隐藏') output = output.replace(/\.nav-primary-item i\s*\{([\s\S]*?)\}/, '.nav-primary-item i { display: none; }');
  if (menuIcons === '弱化') output = output.replace(/\.nav-primary-item i\s*\{([\s\S]*?)font-size:\s*[^;]+;/, '.nav-primary-item i {$1font-size: 1rem;');
  if (menuDivider === true) css += cssRule('.nav-primary-item, .submenu-item', { 'border-bottom': '1px solid rgba(148, 163, 184, 0.18)' });
  if (scrollbar === '细') {
    css += `        ::-webkit-scrollbar { width: 3px; height: 3px; }\n        ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.7); }\n`;
  }
  if (scrollbar === '强调') {
    css += `        ::-webkit-scrollbar { width: 10px; height: 10px; }\n        ::-webkit-scrollbar-thumb { background: ${typeof primary === 'string' ? primary : preset.primary}; }\n`;
  }
  if (isCustomDimensionValue(scrollbar)) {
    const [size = '6px', thumb = '#94A3B8', track = 'transparent'] = (unwrapCustomDimensionValue(scrollbar) as string).split(/\s+/);
    css += `        ::-webkit-scrollbar { width: ${size}; height: ${size}; }\n        ::-webkit-scrollbar-track { background: ${track}; }\n        ::-webkit-scrollbar-thumb { background: ${thumb}; }\n`;
  }
  if (contentMaxWidth === '宽屏居中') output = output.replace(/#contentFrame\s*\{/, '#contentFrame {\n            max-width: 1280px;\n            margin: 0 auto;\n            display: block;');
  if (contentMaxWidth === '文档居中') output = output.replace(/#contentFrame\s*\{/, '#contentFrame {\n            max-width: 960px;\n            margin: 0 auto;\n            display: block;');
  if (isCustomDimensionValue(contentMaxWidth)) output = output.replace(/#contentFrame\s*\{/, `#contentFrame {\n            max-width: ${unwrapCustomDimensionValue(contentMaxWidth)};\n            margin: 0 auto;\n            display: block;`);

  return appendCss(output, css);
}

function toJsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function applyMenuRenderDimensions(html: string, dimensions: DimensionConfig[] | undefined): string {
  let output = html;
  const trigger = getDimensionValue(dimensions, 'submenuTrigger');
  const badge = getDimensionValue(dimensions, 'menuBadge');
  const triggerMark = isCustomDimensionValue(trigger) ? String(unwrapCustomDimensionValue(trigger)) : trigger === '箭头' ? '▾' : trigger === '加号' ? '+' : '';
  const badgeText = isCustomDimensionValue(badge) ? String(unwrapCustomDimensionValue(badge)) : badge === 'NEW' || badge === 'Beta' ? badge : '';

  if (triggerMark || badgeText) {
    const triggerPart = triggerMark ? `\${menu.subMenu.length > 0 ? '<span class="submenu-trigger">${triggerMark}</span>' : ''}` : '';
    const badgePart = badgeText ? `<span class="menu-badge">${badgeText}</span>` : '';
    output = output.replace(
      "div.innerHTML = `<i class=\"fa ${getPrimaryIcon(menu.id)}\"></i><span>${menu.name}</span>`;",
      `div.innerHTML = \`<i class="fa \${getPrimaryIcon(menu.id)}"></i><span>\${menu.name}</span>${triggerPart}${badgePart}\`;`,
    );
  }

  const badgeCss = badge === 'NEW' || badge === 'Beta' || isCustomDimensionValue(badge)
    ? `        .menu-badge, .submenu-trigger {
            margin-left: auto;
            font-size: 10px;
            line-height: 1;
            padding: 3px 6px;
            border-radius: 999px;
            background: rgba(37, 99, 235, 0.12);
            color: inherit;
        }
`
    : trigger === '箭头' || trigger === '加号' || isCustomDimensionValue(trigger)
      ? `        .submenu-trigger {
            margin-left: auto;
            font-size: 12px;
            color: inherit;
        }
`
      : '';

  return appendCss(output, badgeCss);
}

function replaceMenuConfig(html: string, menuConfig: MenuItemConfig[] | undefined, dimensions: DimensionConfig[] | undefined): string {
  const orderedMenuConfig = orderMenuConfig(menuConfig, dimensions);
  if (!orderedMenuConfig?.length) return applyMenuRenderDimensions(html, dimensions);
  const menuLiteral = orderedMenuConfig
    .map((menu) => {
      const fileLine = menu.file ? `\n            file: '${toJsString(menu.file)}',` : '';
      const subMenu = menu.subMenu.map((sub) => `{ name: '${toJsString(sub.name)}', file: '${toJsString(sub.file)}' }`).join(',\n                ');
      return `{
            id: '${toJsString(menu.id)}',
            name: '${toJsString(menu.name)}',${fileLine}
            subMenu: [${subMenu ? `\n                ${subMenu}\n            ` : ''}]
        }`;
    })
    .join(', ');
  const iconMap = orderedMenuConfig.map((menu) => `'${toJsString(menu.id)}': '${toJsString(menu.icon)}'`).join(',\n                ');

  const output = html
    .replace(/const menuConfig = \[[\s\S]*?\];\n\n        let activePrimaryId/, `const menuConfig = [${menuLiteral}];\n\n        let activePrimaryId`)
    .replace(/const map = \{[\s\S]*?\};\n            return map/, `const map = {\n                ${iconMap}\n            };\n            return map`)
    .replace(/let activePrimaryId = '[^']+';/, `let activePrimaryId = '${toJsString(orderedMenuConfig[0].id)}';`)
    .replace(/let activeSubMenuName = '[^']+';/, `let activeSubMenuName = '${toJsString(orderedMenuConfig[0].subMenu[0]?.name || '')}';`)
    .replace(/menuConfig.find\(m => m.id === 'ai-tools'\)/g, `menuConfig.find(m => m.id === '${toJsString(orderedMenuConfig[0].id)}')`)
    .replace(/activePrimaryId = 'ai-tools';/g, `activePrimaryId = '${toJsString(orderedMenuConfig[0].id)}';`)
    .replace(/data-menu-id="ai-tools"/g, `data-menu-id="${toJsString(orderedMenuConfig[0].id)}"`);

  return applyMenuRenderDimensions(output, dimensions);
}

function keepInitialContentBlank(html: string): string {
  return html
    .replace('loadPage(defaultMenu.subMenu[0].file);', "contentFrame.src = 'about:blank';")
    .replace("loadPage(menuConfig[0]?.file || '');", "contentFrame.src = 'about:blank';");
}

const sidebarToggleIcons: Record<string, [string, string]> = {
  菜单: ['fa-bars', 'fa-angle-double-right'],
  双箭头: ['fa-angle-double-left', 'fa-angle-double-right'],
  单箭头: ['fa-angle-left', 'fa-angle-right'],
  面板折叠: ['fa-outdent', 'fa-indent'],
};

function applySidebarToggleDimensions(html: string, dimensions: DimensionConfig[] | undefined): string {
  const position = getDimensionValue(dimensions, 'sidebarTogglePosition');
  const iconStyle = getDimensionValue(dimensions, 'sidebarToggleIcon');
  const [expandedIcon, collapsedIcon] = sidebarToggleIcons[typeof iconStyle === 'string' ? iconStyle : '菜单'] ?? sidebarToggleIcons.菜单;
  const buttonPattern = /<button class="sidebar-toggle-btn" id="sidebarToggleBtn">[\s\S]*?<\/button>/;
  const matchedButton = html.match(buttonPattern)?.[0];
  if (!matchedButton) return html;

  const button = matchedButton.replace(/class="fa [^"]+" id="toggleIcon"/, `class="fa ${expandedIcon}" id="toggleIcon"`);
  let output = html.replace(buttonPattern, '');

  if (position === '标题右侧') {
    output = output.replace(/(<div class="header-left">[\s\S]*?<h1[^>]*>[\s\S]*?<\/h1>)/, `$1\n                ${button}`);
  } else if (position === '侧边栏底部') {
    output = output.replace(
      '<div class="sidebar-menu-container" id="primaryMenuContainer"></div>',
      `<div class="sidebar-menu-container" id="primaryMenuContainer"></div>\n                <div class="sidebar-toggle-bottom">${button}</div>`,
    );
    output = appendCss(output, `        .sidebar-toggle-bottom {
            flex-shrink: 0;
            display: flex;
            justify-content: flex-end;
            padding: 8px 12px;
            border-top: 1px solid rgba(148, 163, 184, 0.22);
        }
        .sidebar-collapsed .sidebar-toggle-bottom {
            justify-content: center;
            padding-inline: 0;
        }
`);
  } else if (position === '用户信息左侧') {
    output = output.replace(/(<div class="user-menu(?:\s[^"]*)?">)/, `${button}\n            $1`);
    if (!output.includes('id="sidebarToggleBtn"')) {
      output = output.replace(/(<div class="header-left">[\s\S]*?<h1[^>]*>[\s\S]*?<\/h1>)/, `$1\n                ${button}`);
    }
  } else {
    output = output.replace(/(<div class="header-left">)/, `$1\n                ${button}`);
  }

  return output
    .replace(/toggleIcon\.classList\.remove\('fa-bars'\);/, `toggleIcon.classList.remove('${expandedIcon}');`)
    .replace(/toggleIcon\.classList\.add\('fa-angle-double-right'\);/, `toggleIcon.classList.add('${collapsedIcon}');`)
    .replace(/toggleIcon\.classList\.remove\('fa-angle-double-right'\);/, `toggleIcon.classList.remove('${collapsedIcon}');`)
    .replace(/toggleIcon\.classList\.add\('fa-bars'\);/, `toggleIcon.classList.add('${expandedIcon}');`);
}

function applyStructuralDimensions(html: string, dimensions: DimensionConfig[] | undefined, version: string): string {
  let output = html;
  const sidebarFooter = getDimensionValue(dimensions, 'sidebarFooter');
  if (typeof sidebarFooter === 'string' && sidebarFooter.trim()) {
    const footerText = escapeHtml(sidebarFooter === '版本信息' ? `版本 ${version}` : sidebarFooter);
    const footerHtml = `
                <div class="sidebar-footer">${footerText}</div>`;
    output = output.replace(
      '<div class="sidebar-menu-container" id="primaryMenuContainer"></div>',
      `<div class="sidebar-menu-container" id="primaryMenuContainer"></div>${footerHtml}`,
    );
    output = appendCss(output, `        .sidebar-footer {
            flex-shrink: 0;
            padding: 12px 18px;
            border-top: 1px solid rgba(148, 163, 184, 0.22);
            color: inherit;
            opacity: 0.68;
            font-size: 12px;
            white-space: nowrap;
        }
        .sidebar-collapsed .sidebar-footer {
            display: none;
        }
`);
  }
  return applySidebarToggleDimensions(output, dimensions);
}

export function generateIndexHtml(templateHtml: string, options: GenerateOptions): GenerateResult {
  const normalizedVersion = normalizeVersion(options.version);
  const displayName = buildDisplayName(options.systemName, normalizedVersion);
  const safeDisplayName = escapeHtml(displayName);

  let html = templateHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeDisplayName}</title>`);
  html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, `<h1>${safeDisplayName}</h1>`);
  html = applyPreset(html, options.preset);
  html = applyDimensions(html, options.dimensions, options.preset);
  html = replaceMenuConfig(html, options.menuConfig, options.dimensions);
  html = html.replace(
    /<div class="user-menu">\s*<div class="avatar-circle">[\s\S]*?<\/div>\s*<span class="user-name">[\s\S]*?<\/span>\s*<\/div>/,
    buildUserMenu(
      options.user,
      options.preset,
      getDimensionValue(options.dimensions, 'userInfo'),
    ),
  );
  html = injectRoleStyles(html, options.preset);
  html = injectUserDropdown(html);
  html = applyStructuralDimensions(html, options.dimensions, normalizedVersion);
  html = keepInitialContentBlank(html);

  return {
    html,
    displayName,
    normalizedVersion,
    validation: validateGeneratedHtml(html),
  };
}
