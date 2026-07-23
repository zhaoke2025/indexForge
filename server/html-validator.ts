export type ValidationResult = { valid: boolean; errors: string[]; warnings: string[] };
export type ValidationRequirement = { id: string; validationType: string; builtinValidator?: string };
type ValidationContext = { requirements?: ValidationRequirement[]; systemName?: string };
export type RequirementCheck = { requirementId: string; passed: boolean; detail: string };

function hasPlaceholderText(html: string, text: string) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`>\\s*${escaped}[！!。.…]?\\s*<|(["'\`])\\s*${escaped}[！!。.…]?\\s*\\1`, 'i').test(html);
}

const defaultBuiltinValidators = ['h1-text', 'tailwind-config', 'inline-submenu', 'blank-iframe', 'fixed-theme', 'core-js'];

function withoutComments(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[;\n])\s*\/\/[^\n]*/g, '$1');
}

function decodeHtmlText(value: string) {
  const named: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
    const point = code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
  });
}

function containingElementInner(html: string, position: number) {
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const stack: Array<{ tag: string; openEnd: number }> = [];
  const token = /<\/?([a-z][\w:-]*)\b[^>]*>/gi;
  for (const match of html.matchAll(token)) {
    if ((match.index ?? 0) >= position) break;
    const tag = match[1].toLowerCase();
    if (match[0][1] === '/') {
      const index = stack.map((item) => item.tag).lastIndexOf(tag);
      if (index >= 0) stack.splice(index);
    } else if (!voidTags.has(tag) && !match[0].endsWith('/>')) {
      stack.push({ tag, openEnd: (match.index ?? 0) + match[0].length });
    }
  }
  const parent = stack.at(-1);
  if (!parent) return null;
  let depth = 1;
  token.lastIndex = position;
  let match: RegExpExecArray | null;
  while ((match = token.exec(html))) {
    if (match[1].toLowerCase() !== parent.tag) continue;
    if (match[0][1] === '/') depth -= 1;
    else if (!match[0].endsWith('/>')) depth += 1;
    if (depth === 0) return { inner: html.slice(parent.openEnd, match.index), offset: parent.openEnd };
  }
  return null;
}

function hasBalancedTailwindConfig(html: string) {
  const clean = withoutComments(html);
  for (const script of clean.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = script[1];
    const assignment = /\btailwind\s*\.\s*config\s*=\s*\{/g.exec(body);
    if (!assignment) continue;
    const start = assignment.index + assignment[0].lastIndexOf('{');
    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let index = start; index < body.length; index += 1) {
      const character = body[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === "'" || character === '"' || character === '`') quote = character;
      else if (character === '{') depth += 1;
      else if (character === '}' && --depth === 0) return true;
    }
  }
  return false;
}

function cssRules(html: string) {
  const css = [...withoutComments(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join('\n');
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({ selector: match[1].trim(), declarations: match[2] }));
}

function declaration(body: string, property: string) {
  return new RegExp(`(?:^|;)\\s*${property.replace('-', '\\-')}\\s*:\\s*([^;!]+)`, 'i').exec(body)?.[1].trim();
}

function cssLength(value?: string) {
  const match = value?.match(/^(-?[\d.]+)\s*(px|r?em)?$/i);
  if (!match) return undefined;
  const number = Number(match[1]);
  return match[2]?.toLowerCase() === 'rem' || match[2]?.toLowerCase() === 'em' ? number * 16 : number;
}

function leftPadding(body: string) {
  const explicit = cssLength(declaration(body, 'padding-left'));
  if (explicit !== undefined) return explicit;
  const values = declaration(body, 'padding')?.split(/\s+/) ?? [];
  return cssLength(values.length === 1 ? values[0] : values.length === 4 ? values[3] : values[1]);
}

function functionBody(value: string, name: string) {
  const opening = new RegExp(`\\bfunction\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, 'i').exec(value);
  if (!opening) return '';
  const start = opening.index + opening[0].length - 1;
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') quote = character;
    else if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) return value.slice(start + 1, index);
  }
  return '';
}

function validateBuiltin(html: string, validator: string, context: ValidationContext = {}): string[] {
  const errors: string[] = [];
  if (validator === 'h1-text') {
    const match = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    if (!match) {
      errors.push('缺少顶栏 h1 标题');
    } else {
      const inner = match[1];
      if (/<[^>]+>/.test(inner)) errors.push('h1 标题只能包含纯文字');
      if (/[\u{1F300}-\u{1FAFF}]/u.test(inner)) errors.push('h1 标题包含 Emoji');
      const title = decodeHtmlText(inner.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (context.systemName && title !== context.systemName.trim()) errors.push(`顶栏 h1 必须完整显示系统名称：${context.systemName.trim()}`);

      const parent = containingElementInner(html, match.index);
      if (parent) {
        const localStart = match.index - parent.offset;
        const localEnd = localStart + match[0].length;
        const before = parent.inner.slice(0, localStart);
        const after = parent.inner.slice(localEnd);
        if (/<(?:button|a)\b[^>]*(?:id|class)=["'][^"']*(?:sidebar[^"']*toggle|toggle[^"']*sidebar)[^"']*["'][^>]*>[\s\S]*$/i.test(before)) {
          errors.push('禁止在标题左侧放置侧边栏收起按钮');
        }
        const brandingBefore = /<(?:img|svg|picture|i)\b/i.test(before) || /<(?!button\b)[^>]+\b(?:id|class)=["'][^"']*(?:logo|brand)[^"']*["']/i.test(before);
        const brandingAfter = /^\s*<(?:img|svg|picture|i)\b/i.test(after) || /^\s*<(?!button\b)[^>]+\b(?:id|class)=["'][^"']*(?:logo|brand)[^"']*["']/i.test(after);
        if (brandingBefore || brandingAfter) errors.push('标题旁边不能放置 logo、图标或图片');
      }
    }
  }
  if (validator === 'tailwind-config') {
    if (!/tailwind\s*\.\s*config/i.test(html)) errors.push('缺少 tailwind.config 配置块');
    else if (!hasBalancedTailwindConfig(html)) errors.push('缺少有效的 tailwind.config 配置块');
  }
  if (validator === 'inline-submenu') {
    const clean = withoutComments(html);
    const submenuFunction = functionBody(clean, 'renderSubMenuInPlace');
    const inlineInsertion = /(?:\b(?:active|current|primary|menu)\w*|event\.currentTarget|this)\s*\.\s*(?:insertAdjacentElement\s*\(\s*(['"])afterend\1\s*,\s*\w+\s*\)|after\s*\(\s*\w+\s*\))/i.test(submenuFunction);
    if (!inlineInsertion) errors.push('子菜单必须在 renderSubMenuInPlace 中以内联方式插入当前一级菜单项之后');

    const rules = cssRules(html);
    const submenuRules = rules.filter((rule) => /\.?(?:dynamic-)?submenu(?:-item|-wrapper|\b)/i.test(rule.selector));
    if (submenuRules.some((rule) => /^(?:absolute|fixed)$/i.test(declaration(rule.declarations, 'position') || ''))) {
      errors.push('子菜单不能使用弹出、悬浮、抽屉或侧滑定位');
    }

    const submenu = rules.find((rule) => /\.submenu-item\b/i.test(rule.selector) && leftPadding(rule.declarations) !== undefined);
    const primary = rules.find((rule) => /\.nav-primary-item\b/i.test(rule.selector) && !/\s+[i.]|:/.test(rule.selector) && leftPadding(rule.declarations) !== undefined);
    const icon = rules.find((rule) => /\.nav-primary-item\s+(?:i|svg)\b/i.test(rule.selector));
    const submenuLeft = submenu ? leftPadding(submenu.declarations) : undefined;
    const primaryLeft = primary ? leftPadding(primary.declarations) ?? 0 : 0;
    const textLeft = primaryLeft + (icon ? (cssLength(declaration(icon.declarations, 'width')) ?? 0) + (cssLength(declaration(primary?.declarations || '', 'gap')) ?? 0) : 1);
    if (submenuLeft === undefined || submenuLeft < textLeft) errors.push('子菜单左侧缩进必须至少与一级菜单文字对齐');

    const leftHighlight = rules.some((rule) => {
      if (!/(?:active|selected|current)/i.test(rule.selector)) return false;
      const border = declaration(rule.declarations, 'border-left');
      const width = cssLength(declaration(rule.declarations, 'border-left-width'));
      const color = declaration(rule.declarations, 'border-left-color');
      return Boolean(
        (border && !/^(?:0(?:\D|$)|none\b|transparent\b)/i.test(border))
        || (width !== undefined && width > 0)
        || (color && !/^(?:transparent|initial|inherit)$/i.test(color)),
      );
    });
    if (leftHighlight || /(?:active|selected|current)[^'"\n]{0,80}["'][^"']*\bborder-l-(?!0\b|transparent\b)/i.test(clean)) {
      errors.push('菜单激活态禁止使用左侧边框高亮');
    }
  }
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

export function validateRequirementChecks(html: string, requirements: ValidationRequirement[], context: ValidationContext = {}): RequirementCheck[] {
  return requirements.map((requirement) => {
    if (requirement.validationType !== 'builtin') return { requirementId: requirement.id, passed: true, detail: '已作为AI生成约束，未执行本地校验' };
    if (!requirement.builtinValidator) return { requirementId: requirement.id, passed: false, detail: '未配置可执行的内置校验器' };
    const errors = validateBuiltin(html, requirement.builtinValidator, context);
    return { requirementId: requirement.id, passed: errors.length === 0, detail: errors.length ? errors.join('；') : '内置校验通过' };
  });
}

export function validateHtml(html: string, context: ValidationContext = {}): ValidationResult {
  const validators = context.requirements
    ? context.requirements.filter((item) => item.validationType === 'builtin' && item.builtinValidator).map((item) => item.builtinValidator!)
    : defaultBuiltinValidators;
  const errors = validators.flatMap((validator) => validateBuiltin(html, validator, context));
  const warnings: string[] = [];
  return { valid: errors.length === 0, errors, warnings };
}
