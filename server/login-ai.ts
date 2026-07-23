import { extractCompleteHtml } from './ai-html.js';

export const loginRequirements = [
  'R1 标题只能显示单一颜色的中文纯文字，不得包含Logo、图标、Emoji或英文；偏右布局时必须位于登录卡片外的页面左侧品牌区。',
  'R2 禁止品牌宣传标语；需要欢迎语时只能使用欢迎回来、欢迎登录等欢迎文案。',
  'R3 背景、文字、登录卡片及其他区域禁止任何形式的渐变色。',
  'R4 严格按配置生成底部信息；协议必须可点击并展示完整内容，版权必须位于页面最底端居中。',
  'R5 登录方式必须严格按照AI选定的维度方案生成。',
  'R6 辅助功能必须严格按照AI选定的维度方案生成。',
  'R7 辅助文案必须使用AI维度方案给出的文字。',
  'R8 有注册入口时必须同步生成完整注册页面或模态框。',
  'R9 选择继承系统主色时必须与参考index.html主色一致。',
  'R10 卡片质感必须执行AI维度方案，并与参考首页明暗风格协调。',
  'R11 不得提供运行时主题切换。',
  'R12 图片通铺必须使用background-size: cover；无图片时保留注释形式的示例链接。',
  'R13 图形验证码必须按配置在页面加载时动态随机生成，禁止固定验证码。',
  'R14 标题超过16字时必须在语义完整的词组处自然换行。',
  'R15 密码输入框必须带可点击的小眼睛切换明文和密文。',
];

export const loginSystemPrompt = `你是一名专业的登录页前端工程师。根据参考index.html、AI确定的登录页维度方案、硬性要求和用户本次要求，输出完整且可直接运行的login.html。

首次生成优先级：硬性要求 > AI维度方案 > 首次补充要求 > 参考index.html视觉样式 > 你的设计判断。
继续调整优先级：硬性要求 > 用户本次调整意见 > AI维度方案 > 上一版login.html > 参考index.html视觉样式 > 你的设计判断。

必须遵守：
1. 首次生成必须逐项执行AI已选择的维度；未选择的候选维度不得被当作默认值。
2. 继续调整时，用户本次意见可以调整对应维度；未提及部分必须保持上一版结果和AI维度方案不变。
3. 用户意见不得覆盖或违反硬性要求；出现冲突时必须保留硬性要求。
4. 参考首页仅用于提取主色、字体、圆角、明暗、边框和视觉调性，禁止复制首页顶栏、侧边栏、菜单、iframe、menuConfig或导航逻辑。
5. 禁止使用linear-gradient、radial-gradient、conic-gradient及任何渐变；纹理、几何图案、光晕必须使用纯色、边框、阴影或伪元素实现。
6. 登录、验证码、密码显隐、Tab切换、注册切换和加载状态必须有真实HTML与JavaScript行为。
7. 当背景图片标记为已上传时，背景CSS必须使用url("__LOGIN_BACKGROUND_IMAGE__")，不得编造图片地址。
8. 预填演示账号时，密码必须统一为123456123456；选择不预填时账号和密码都不得设置value。
9. 只输出完整HTML，不要解释、Markdown或JSON。回复必须从<!DOCTYPE html>开始，以</html>结束。`;

type PromptInput = { config: Record<string, unknown>; requirements?: string[]; instruction: string; referenceHtml: string; previousHtml?: string };
function loginLayoutRule(config: Record<string, unknown>) {
  if (config.layout !== '偏右') return '';
  return `【偏右布局强制结构】
登录卡片必须位于页面右侧，并使用 data-login-card 标记卡片容器。
系统标题必须位于登录卡片外的页面左侧独立品牌区，品牌区容器必须使用 data-login-brand-panel 标记；登录卡片内不得重复系统标题，只能按维度显示欢迎语或“用户登录”等表单标题。`;
}

export function buildLoginPrompt(input: PromptInput) {
  const colorRule = input.config.colorMode === '继承系统主色'
    ? '【配色继承强制规则】本次已选择“继承系统主色”：必须从参考index.html的tailwind.config、CSS变量或主色样式中识别实际主色，并在login.html中使用完全相同的颜色值；禁止自行改色或使用通用默认蓝色。'
    : '【配色规则】未选择“继承系统主色”，由AI根据已选维度方案和系统业务确定登录页配色，不使用用户预设品牌色。';
  return `【任务】${input.previousHtml ? '根据意见继续调整' : '首次生成'} login.html
【${input.previousHtml ? '本次调整意见（优先于AI维度方案，但不得违反硬性要求）' : '首次生成补充要求（不得覆盖AI维度方案和硬性要求）'}】
${input.instruction || (input.previousHtml ? '未提供调整意见，保持上一版并落实AI维度方案' : '严格按照AI维度方案生成登录页')}
【AI已确定的登录页维度方案】
${JSON.stringify(input.config, null, 2)}
${colorRule}
${loginLayoutRule(input.config)}
【当前启用的登录页硬性要求】
${(input.requirements || loginRequirements).join('\n')}
【参考首页 index.html】
${input.referenceHtml}
${input.previousHtml ? `【上一版 login.html（仅修改本次意见涉及部分）】\n${input.previousHtml}` : ''}

输出前按“${input.previousHtml ? '硬性要求 > 本次调整意见 > AI维度方案' : '硬性要求 > AI维度方案 > 首次补充要求'}”逐项核对，只输出完整login.html。`;
}

export function buildLoginRepairPrompt(html: string, errors: string[], config: Record<string, unknown> = {}) {
  return `以下login.html未通过硬性校验。只修复所列问题，保持其他内容和AI维度方案不变，并输出完整HTML。\n问题：${errors.join('；')}\n\n【必须保持的AI维度方案】\n${JSON.stringify(config)}\n${loginLayoutRule(config)}\n\n${html}`;
}

export function extractLoginHtml(content: string) { return extractCompleteHtml(content); }

type LoginValidationRequirement = { id: string; validationType: string; builtinValidator?: string };
type LoginRequirementCheck = { requirementId: string; passed: boolean; detail: string };
const defaultLoginValidators = ['login-title', 'no-gradient', 'login-footer', 'login-method', 'login-assist', 'login-assist-text', 'login-register', 'login-fixed-theme', 'login-background', 'login-captcha', 'login-password-toggle'];

function findLoginTitle(html: string, systemName: string) {
  const candidates = [...html.matchAll(/<(h[1-3]|div|span)\b([^>]*)>\s*([^<]*?)\s*<\/\1>/gi)];
  const semantic = candidates.filter((match) => /^h[1-3]$/i.test(match[1]) || /(?:class|id)=["'][^"']*(?:title|system-name|brand-name|login-name)[^"']*["']/i.test(match[2]));
  if (systemName) {
    return semantic.find((match) => match[3].trim() === systemName);
  }
  return semantic[0];
}

function isInsideMarkedElement(html: string, position: number, attribute: string) {
  const openingPattern = new RegExp(`<([a-z][\\w:-]*)\\b[^>]*\\b${attribute}(?:\\s*=\\s*(["'])[^"']*\\2)?(?=\\s|/?>)[^>]*>`, 'gi');
  const openings = [...html.slice(0, position).matchAll(openingPattern)];
  for (let index = openings.length - 1; index >= 0; index -= 1) {
    const opening = openings[index];
    const openingEnd = (opening.index ?? 0) + opening[0].length;
    const closingPattern = new RegExp(`</${opening[1]}\\s*>`, 'i');
    if (closingPattern.test(html.slice(openingEnd, position))) continue;
    if (closingPattern.test(html.slice(position))) return true;
  }
  return false;
}

function validateLoginBuiltin(html: string, config: Record<string, unknown>, validator: string) {
  const errors: string[] = [];
  const loginMethod = String(config.loginMethod || '');
  if (validator === 'login-title') {
    const titleMatch = findLoginTitle(html, String(config.systemName || '').trim());
    const title = titleMatch?.[3] || '';
    if (!titleMatch) errors.push('缺少登录页中文纯文字标题');
    if (/<[^>]+>|[A-Za-z]|[\u{1F300}-\u{1FAFF}]/u.test(title)) errors.push('登录页标题必须是中文纯文字且不得包含图标、英文或Emoji');
    if (titleMatch && config.layout === '偏右') {
      const titlePosition = titleMatch.index ?? 0;
      const inBrandPanel = isInsideMarkedElement(html, titlePosition, 'data-login-brand-panel');
      const inLoginCard = isInsideMarkedElement(html, titlePosition, 'data-login-card');
      if (!inBrandPanel || inLoginCard || !/\bdata-login-card(?:\s*=|\s|>)/i.test(html)) {
        errors.push('偏右布局时，系统标题必须位于登录卡片外的左侧品牌区');
      }
    }
  }
  if (validator === 'no-gradient' && /(?:linear|radial|conic)-gradient\s*\(/i.test(html)) errors.push('禁止使用任何形式的渐变色');
  if (validator === 'login-method' && loginMethod.includes('密码') && !/<input\b[^>]*type=["']password["']/i.test(html)) errors.push('缺少密码输入框');
  if (validator === 'login-password-toggle' && loginMethod.includes('密码') && !/(password.*(toggle|eye|visible)|toggle.*password|fa-eye)/is.test(html)) errors.push('缺少密码显隐按钮或交互逻辑');
  if (validator === 'login-captcha' && loginMethod.includes('图形验证码') && !/(Math\.random|crypto\.getRandomValues)/.test(html)) errors.push('图形验证码必须动态随机生成');
  if (validator === 'login-captcha' && loginMethod.includes('图形验证码') && String(config.captchaMode) === '数字加减法' && !/(\+|-).*Math\.random|Math\.random.*(\+|-)/s.test(html)) errors.push('验证码必须按配置使用数字加减法');
  if (validator === 'login-register' && String(config.registerEntry).includes('有入口') && !['手机号', '验证码', '确认密码'].every((text) => html.includes(text))) errors.push('注册页面字段不完整');
  if (validator === 'login-footer' && String(config.policyFooter).includes('隐私政策') && (!html.includes('隐私政策') || !html.includes('服务协议') || !/(dialog|modal|模态)/i.test(html))) errors.push('隐私政策和服务协议必须可点击并展示完整内容');
  if (validator === 'login-assist') {
    const assist = String(config.assist || '');
    if (assist.includes('记住') && !html.includes('记住')) errors.push('缺少维度要求的记住账号功能');
    if (assist.includes('忘记') && !html.includes('忘记')) errors.push('缺少维度要求的忘记密码功能');
  }
  if (validator === 'login-assist-text') {
    const texts = String(config.assistText || '').split(/[；;]/).map((item) => item.trim()).filter(Boolean);
    if (texts.some((text) => !html.includes(text))) errors.push('辅助文案未按维度方案生成');
  }
  if (validator === 'login-fixed-theme' && /theme[-_ ]?(toggle|switch)|切换主题/i.test(html)) errors.push('不得生成主题切换器');
  if (validator === 'login-background' && String(config.backgroundType) === '图片通铺' && !/background-size\s*:\s*cover/i.test(html)) errors.push('图片通铺必须使用 background-size: cover');
  return errors;
}

export function validateLoginRequirementChecks(html: string, config: Record<string, unknown>, requirements: LoginValidationRequirement[]): LoginRequirementCheck[] {
  return requirements.map((requirement) => {
    if (requirement.validationType !== 'builtin') return { requirementId: requirement.id, passed: true, detail: '已作为AI生成约束，未执行本地校验' };
    if (!requirement.builtinValidator) return { requirementId: requirement.id, passed: false, detail: '未配置可执行的内置校验器' };
    const errors = validateLoginBuiltin(html, config, requirement.builtinValidator);
    return { requirementId: requirement.id, passed: errors.length === 0, detail: errors.length ? errors.join('；') : '内置校验通过' };
  });
}

export function validateLoginHtml(html: string, config: Record<string, unknown>, requirements?: LoginValidationRequirement[]) {
  const validators = requirements ? requirements.filter((item) => item.validationType === 'builtin' && item.builtinValidator).map((item) => item.builtinValidator!) : defaultLoginValidators;
  const errors = validators.flatMap((validator) => validateLoginBuiltin(html, config, validator));
  const warnings: string[] = [];
  return { valid: errors.length === 0, errors, warnings };
}
