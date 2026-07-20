export type ValidationResult = { valid: boolean; errors: string[]; warnings: string[] };
export type ValidationRequirement = { id: string; validationType: string; builtinValidator?: string };
type ValidationContext = { requirements?: ValidationRequirement[] };
export type RequirementCheck = { requirementId: string; passed: boolean; detail: string };

function hasPlaceholderText(html: string, text: string) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`>\\s*${escaped}[！!。.…]?\\s*<|(["'\`])\\s*${escaped}[！!。.…]?\\s*\\1`, 'i').test(html);
}

const defaultBuiltinValidators = ['h1-text', 'tailwind-config', 'inline-submenu', 'blank-iframe', 'fixed-theme', 'core-js'];

function validateBuiltin(html: string, validator: string): string[] {
  const errors: string[] = [];
  if (validator === 'h1-text') {
    if (!/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html)) errors.push('缺少顶栏 h1 标题');
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
    if (/<(img|i|svg|span|em|strong|picture|use)\b/i.test(h1)) errors.push('h1 标题内部包含非纯文字元素');
    if (/[\u{1F300}-\u{1FAFF}]/u.test(h1)) errors.push('h1 标题包含 Emoji');
  }
  if (validator === 'tailwind-config' && !html.includes('tailwind.config')) errors.push('缺少 tailwind.config 配置块');
  if (validator === 'inline-submenu' && !html.includes("insertAdjacentElement('afterend', wrapper)") && !html.includes('insertAdjacentElement("afterend", wrapper)')) errors.push('子菜单未以内联方式插入');
  if (validator === 'blank-iframe') {
    for (const word of ['页面建设中', '暂无内容', '开发中', '404']) {
      if (hasPlaceholderText(html, word)) errors.push(`检测到占位文字：${word}`);
    }
  }
  if (validator === 'fixed-theme' && (/<select\b/i.test(html) || html.includes('currentTheme'))) errors.push('检测到主题切换器');
  if (validator === 'core-js') {
    if (!html.includes('contentFrame')) errors.push('缺少 iframe#contentFrame');
    if (!html.includes('menuConfig')) errors.push('缺少 menuConfig');
    for (const name of ['renderPrimaryMenu', 'renderSubMenuInPlace', 'navigateToSub', 'loadPage']) {
      if (!html.includes(`function ${name}`)) errors.push(`缺少 ${name} 函数`);
    }
    if (!html.includes('window.navigateTo')) errors.push('缺少 window.navigateTo');
    if (!html.includes('window.addEventListener') || !html.includes('message')) errors.push('缺少 message 监听');
  }
  return errors;
}

export function validateRequirementChecks(html: string, requirements: ValidationRequirement[]): RequirementCheck[] {
  return requirements.map((requirement) => {
    if (requirement.validationType !== 'builtin') return { requirementId: requirement.id, passed: true, detail: '已作为AI生成约束，未执行本地校验' };
    if (!requirement.builtinValidator) return { requirementId: requirement.id, passed: false, detail: '未配置可执行的内置校验器' };
    const errors = validateBuiltin(html, requirement.builtinValidator);
    return { requirementId: requirement.id, passed: errors.length === 0, detail: errors.length ? errors.join('；') : '内置校验通过' };
  });
}

export function validateHtml(html: string, context: ValidationContext = {}): ValidationResult {
  const validators = context.requirements
    ? context.requirements.filter((item) => item.validationType === 'builtin' && item.builtinValidator).map((item) => item.builtinValidator!)
    : defaultBuiltinValidators;
  const errors = validators.flatMap((validator) => validateBuiltin(html, validator));
  const warnings: string[] = [];
  return { valid: errors.length === 0, errors, warnings };
}
