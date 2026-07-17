export type ValidationResult = { valid: boolean; errors: string[]; warnings: string[] };
type ValidationDimension = { id: string; value: unknown };
type ValidationContext = { dimensions?: ValidationDimension[] };

function hasClassElement(html: string, className: string) {
  return new RegExp(`<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'i').test(html);
}

export function validateHtml(html: string, context: ValidationContext = {}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!html.includes('tailwind.config')) errors.push('缺少 tailwind.config 配置块');
  if (!/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html)) errors.push('缺少顶栏 h1 标题');
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
  if (/<(img|i|svg|span|em|strong|picture|use)\b/i.test(h1)) errors.push('h1 标题内部包含非纯文字元素');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(h1)) errors.push('h1 标题包含 Emoji');
  if (!html.includes('contentFrame')) errors.push('缺少 iframe#contentFrame');
  if (!html.includes('menuConfig')) errors.push('缺少 menuConfig');
  for (const name of ['renderPrimaryMenu', 'renderSubMenuInPlace', 'navigateToSub', 'loadPage']) {
    if (!html.includes(`function ${name}`)) errors.push(`缺少 ${name} 函数`);
  }
  if (!html.includes('window.navigateTo')) errors.push('缺少 window.navigateTo');
  if (!html.includes('window.addEventListener') || !html.includes('message')) errors.push('缺少 message 监听');
  if (!html.includes("insertAdjacentElement('afterend', wrapper)") && !html.includes('insertAdjacentElement("afterend", wrapper)')) errors.push('子菜单未以内联方式插入');
  if (/<select\b/i.test(html) || html.includes('currentTheme')) errors.push('检测到主题切换器');
  for (const word of ['页面建设中', '暂无内容', '开发中', '404']) {
    if (html.includes(word)) errors.push(`检测到占位文字：${word}`);
  }

  const userInfo = context.dimensions?.find((item) => item.id === 'userInfo')?.value;
  if (userInfo === '移除用户' && hasClassElement(html, 'user-menu')) {
    errors.push('用户信息维度要求移除用户，但顶栏仍存在用户区域');
  }
  if (typeof userInfo === 'string' && userInfo !== '移除用户') {
    if (!hasClassElement(html, 'user-menu')) errors.push('用户信息维度要求显示用户，但缺少用户区域');
    if (userInfo.includes('头像') !== hasClassElement(html, 'avatar-circle')) errors.push(`用户信息维度的头像配置未生效：${userInfo}`);
    if (!hasClassElement(html, 'user-name')) errors.push('用户信息维度要求显示姓名，但缺少姓名');
    if (userInfo.includes('角色') !== hasClassElement(html, 'user-role')) errors.push(`用户信息维度的角色配置未生效：${userInfo}`);
    const hasDropdown = hasClassElement(html, 'user-dropdown') || hasClassElement(html, 'user-menu-trigger');
    if (userInfo.includes('下拉') !== hasDropdown) errors.push(`用户信息维度的下拉配置未生效：${userInfo}`);
  }
  if (typeof userInfo === 'string' && userInfo.includes('下拉')) {
    if (!hasClassElement(html, 'user-dropdown')) errors.push('用户信息要求下拉菜单，但缺少 user-dropdown 菜单结构');
    if (!html.includes('修改密码')) errors.push('用户下拉菜单缺少“修改密码”');
    if (!html.includes('退出登录')) errors.push('用户下拉菜单缺少“退出登录”');
    const hasInteraction = /(userDropdown|user-dropdown|userMenu)[\s\S]{0,1200}addEventListener\s*\(\s*['"]click['"]/i.test(html)
      || /addEventListener\s*\(\s*['"]click['"][\s\S]{0,1200}(userDropdown|user-dropdown|userMenu)/i.test(html);
    if (!hasClassElement(html, 'user-menu-trigger')) errors.push('用户下拉菜单缺少可点击触发器');
    if (!hasInteraction) errors.push('用户下拉菜单缺少点击展开交互');
    if (!/document\.addEventListener\s*\(\s*['"]click['"]/i.test(html)) errors.push('用户下拉菜单缺少点击页面其他区域关闭逻辑');
  }
  if ((html.match(/<style>/g) || []).length > 2) warnings.push('自定义 CSS 较多');
  return { valid: errors.length === 0, errors, warnings };
}
