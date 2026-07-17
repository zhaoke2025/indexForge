import { extractCompleteHtml } from './ai-html.js';

export const loginRequirements = [
  'R1 标题只能显示单一颜色的中文纯文字，不得包含Logo、图标、Emoji或英文。',
  'R2 禁止品牌宣传标语；需要欢迎语时只能使用欢迎回来、欢迎登录等欢迎文案。',
  'R3 背景、文字、登录卡片及其他区域禁止任何形式的渐变色。',
  'R4 严格按配置生成底部信息；协议必须可点击并展示完整内容，版权必须位于页面最底端居中。',
  'R5 登录方式必须严格按照固定维度生成。',
  'R6 辅助功能必须严格按照固定维度生成。',
  'R7 辅助文案必须使用固定维度给出的文字。',
  'R8 有注册入口时必须同步生成完整注册页面或模态框。',
  'R9 选择继承系统主色时必须与参考index.html主色一致。',
  'R10 卡片质感必须执行固定维度，并与参考首页明暗风格协调。',
  'R11 不得提供运行时主题切换。',
  'R12 图片通铺必须使用background-size: cover；无图片时保留注释形式的示例链接。',
  'R13 图形验证码必须按配置在页面加载时动态随机生成，禁止固定验证码。',
  'R14 标题超过16字时必须在语义完整的词组处自然换行。',
  'R15 密码输入框必须带可点击的小眼睛切换明文和密文。',
];

export const loginSystemPrompt = `你是一名专业的登录页前端工程师。根据参考index.html、登录页固定维度、硬性要求和用户本次要求，输出完整且可直接运行的login.html。

首次生成优先级：硬性要求 > 固定维度 > 首次补充要求 > 参考index.html视觉样式 > 你的设计判断。
继续调整优先级：硬性要求 > 用户本次调整意见 > 固定维度 > 上一版login.html > 参考index.html视觉样式 > 你的设计判断。

必须遵守：
1. 首次生成必须逐项执行L1-L18固定维度。
2. 继续调整时，用户本次意见可以覆盖对应固定维度；未提及部分必须保持上一版结果和固定维度不变。
3. 用户意见不得覆盖或违反硬性要求；出现冲突时必须保留硬性要求。
4. 参考首页仅用于提取主色、字体、圆角、明暗、边框和视觉调性，禁止复制首页顶栏、侧边栏、菜单、iframe、menuConfig或导航逻辑。
5. 禁止使用linear-gradient、radial-gradient、conic-gradient及任何渐变；纹理、几何图案、光晕必须使用纯色、边框、阴影或伪元素实现。
6. 登录、验证码、密码显隐、Tab切换、注册切换和加载状态必须有真实HTML与JavaScript行为。
7. 当背景图片标记为已上传时，背景CSS必须使用url("__LOGIN_BACKGROUND_IMAGE__")，不得编造图片地址。
8. 预填演示账号时，密码必须统一为123456123456；选择不预填时账号和密码都不得设置value。
9. 只输出完整HTML，不要解释、Markdown或JSON。回复必须从<!DOCTYPE html>开始，以</html>结束。`;

type PromptInput = { config: Record<string, unknown>; requirements?: string[]; instruction: string; referenceHtml: string; previousHtml?: string };
export function buildLoginPrompt(input: PromptInput) {
  return `【任务】${input.previousHtml ? '根据意见继续调整' : '首次生成'} login.html
【${input.previousHtml ? '本次调整意见（优先于固定维度，但不得违反硬性要求）' : '首次生成补充要求（不得覆盖固定维度和硬性要求）'}】
${input.instruction || (input.previousHtml ? '未提供调整意见，保持上一版并落实固定维度' : '严格按照固定维度生成登录页')}
【登录页固定维度 L1-L18】
${JSON.stringify(input.config, null, 2)}
【当前启用的登录页硬性要求】
${(input.requirements || loginRequirements).join('\n')}
【参考首页 index.html】
${input.referenceHtml}
${input.previousHtml ? `【上一版 login.html（仅修改本次意见涉及部分）】\n${input.previousHtml}` : ''}

输出前按“${input.previousHtml ? '硬性要求 > 本次调整意见 > 固定维度' : '硬性要求 > 固定维度 > 首次补充要求'}”逐项核对，只输出完整login.html。`;
}

export function buildLoginRepairPrompt(html: string, errors: string[]) {
  return `以下login.html未通过硬性校验。只修复所列问题，保持其他内容不变，并输出完整HTML。\n问题：${errors.join('；')}\n\n${html}`;
}

export function extractLoginHtml(content: string) { return extractCompleteHtml(content); }

export function validateLoginHtml(html: string, config: Record<string, unknown>) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const loginMethod = String(config.loginMethod || '');
  const demoAccount = String(config.demoAccount || '');
  if (!/^\s*<!doctype html>/i.test(html) || !/<\/html>\s*$/i.test(html)) errors.push('必须输出完整HTML文档');
  if (!/<form\b[^>]*[\s\S]*?<\/form>/i.test(html)) errors.push('缺少登录表单');
  if (/(?:linear|radial|conic)-gradient\s*\(/i.test(html)) errors.push('禁止使用任何形式的渐变色');
  if (loginMethod.includes('密码') && !/<input\b[^>]*type=["']password["']/i.test(html)) errors.push('缺少密码输入框');
  if (loginMethod.includes('密码') && !/(password.*(toggle|eye|visible)|toggle.*password|fa-eye)/is.test(html)) errors.push('缺少密码显隐按钮或交互逻辑');
  if (loginMethod.includes('图形验证码') && !/(Math\.random|crypto\.getRandomValues)/.test(html)) errors.push('图形验证码必须动态随机生成');
  if (loginMethod.includes('图形验证码') && String(config.captchaMode) === '数字加减法' && !/(\+|-).*Math\.random|Math\.random.*(\+|-)/s.test(html)) errors.push('验证码必须按配置使用数字加减法');
  if (String(config.registerEntry).includes('有入口') && !['手机号', '验证码', '确认密码'].every((text) => html.includes(text))) errors.push('注册页面字段不完整');
  if (String(config.policyFooter).includes('隐私政策') && (!html.includes('隐私政策') || !html.includes('服务协议') || !/(dialog|modal|模态)/i.test(html))) errors.push('隐私政策和服务协议必须可点击并展示完整内容');
  if (demoAccount && demoAccount !== '不预填' && (!html.includes(demoAccount) || !html.includes('123456123456'))) errors.push('预填账号或统一密码未按配置生成');
  if (/theme[-_ ]?(toggle|switch)|切换主题/i.test(html)) errors.push('不得生成主题切换器');
  if (/menuConfig|primaryMenuContainer|contentFrame/.test(html)) errors.push('登录页不得复制首页菜单或iframe结构');
  return { valid: errors.length === 0, errors, warnings };
}
