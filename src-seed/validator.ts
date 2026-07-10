export type ValidationResult = { valid: boolean; errors: string[]; warnings: string[] };

export function validateGeneratedHtml(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!html.includes('tailwind.config')) errors.push('缺少 tailwind.config 配置块');
  if (!/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html)) errors.push('缺少顶栏 h1 标题');

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const h1Inner = h1Match[1];
    if (/<(img|i|svg|span|em|strong|picture|use)\b/i.test(h1Inner)) {
      errors.push('h1 标题内部包含非纯文字元素');
    }
    if (/[\u{1F300}-\u{1FAFF}]/u.test(h1Inner)) {
      errors.push('h1 标题包含 Emoji，不符合纯文字要求');
    }
  }

  if (!html.includes('contentFrame')) errors.push('缺少 iframe#contentFrame');
  if (!html.includes('menuConfig')) errors.push('缺少 menuConfig');
  if (!html.includes('function renderPrimaryMenu')) errors.push('缺少 renderPrimaryMenu 函数');
  if (!html.includes('function renderSubMenuInPlace')) errors.push('缺少 renderSubMenuInPlace 函数');
  if (!html.includes('function navigateToSub')) errors.push('缺少 navigateToSub 函数');
  if (!html.includes('function loadPage')) errors.push('缺少 loadPage 函数');
  if (!html.includes('window.navigateTo')) errors.push('缺少 window.navigateTo 跨页面导航方法');
  if (!html.includes('window.addEventListener') || !html.includes('message')) errors.push('缺少 message 监听');

  const inlineSubmenuOk =
    html.includes("insertAdjacentElement('afterend', wrapper)") ||
    html.includes('insertAdjacentElement("afterend", wrapper)');
  if (!inlineSubmenuOk) errors.push('子菜单未检测到以内联方式插入到当前菜单项下方');

  if (/<select\b/i.test(html) || html.includes('currentTheme')) {
    errors.push('检测到主题切换器或主题状态管理');
  }

  const forbiddenPlaceholders = ['页面建设中', '暂无内容', '开发中', '404'];
  for (const word of forbiddenPlaceholders) {
    if (html.includes(word)) errors.push(`检测到 iframe 或页面占位文字：${word}`);
  }

  if ((html.match(/<style>/g) || []).length > 2) {
    warnings.push('自定义 CSS 较多，建议优先使用 Tailwind 或母版已有类');
  }

  return { valid: errors.length === 0, errors, warnings };
}
