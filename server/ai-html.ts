type PromptDimension = {
  id: string;
  name: string;
  group: string;
  description: string;
  valueType: string;
  options: string[];
};

type PromptDecision = { dimensionId: string; value: string | boolean; reason: string };

type PromptRequirement = {
  id: string;
  name: string;
  description: string;
  level: string;
  validationType: string;
};

export function buildHtmlPrompt(input: {
  systemName: string;
  version: string;
  instruction: string;
  dimensions: PromptDimension[];
  decisions: PromptDecision[];
  requirements: PromptRequirement[];
  baseHtml: string;
  refining: boolean;
}) {
  const task = input.instruction || '根据系统名称判断业务类型和最合适的页面调性';
  const modeRules = input.refining
    ? `这是继续调整任务。你必须在上一版HTML中找到与本次要求对应的结构、CSS或JavaScript并完成实际修改。
如果本次要求不是“保持不变”或“无需修改”，禁止原样返回上一版HTML。`
    : '这是首次生成任务。你必须结合系统名称、维度和硬性要求完成业务化改造。';
  return `【系统信息】
系统名称：${input.systemName}
版本号：${input.version || '无'}
生成方式：${input.refining ? '基于上一版HTML继续调整' : '基于当前母版首次生成'}

【本次要求（最高优先执行项）】
${task}

【执行优先级】
硬性要求 > 本次明确要求 > AI维度决策 > 母版视觉样式 > 你的设计判断

【本次任务执行规则】
${modeRules}

【启用维度候选池（仅用于理解能力边界，不含默认值）】
${JSON.stringify(input.dimensions)}

【AI已确定的本次维度方案】
${JSON.stringify(input.decisions)}

【硬性要求】
${JSON.stringify(input.requirements)}

【${input.refining ? '上一版完整index.html' : '原始index.html母版'}】
${input.baseHtml}

【输出前强制核对】
1. 再次阅读本次要求：${task}
2. 确认HTML中已经存在能够证明本次要求已落实的实际代码，不得只在注释或文字说明中提及。
3. 如果要求新增图标、按钮或组件，必须生成对应HTML元素及必要样式；要求交互时还必须生成JavaScript。
4. 如果要求修改颜色、尺寸、间距、位置或文字，必须在最终代码中出现要求指定的准确值。
5. ${input.refining ? '最终HTML必须与上一版产生和本次要求对应的实质差异，禁止无修改原样返回。' : '最终HTML必须体现系统业务名称、业务菜单和本次AI维度方案。'}

现在执行本次要求，只输出修改后的完整index.html。`;
}

export const htmlSystemPrompt = `你是一名专业的后台管理系统前端工程师。你的任务是根据原始index.html、实体维度、硬性要求、系统信息和用户本次要求，生成完整且可直接运行的index.html。

必须遵守：
1. “本次要求”是当前任务的核心验收标准。必须落实到最终HTML代码中，不能忽略、弱化、改写为建议或只做文字说明。
2. 必须保留输入HTML的结构骨架和核心功能；母版视觉样式不是默认方案，应按本次AI维度方案完成业务化适配。
3. 继续调整时必须先定位本次要求对应的HTML、CSS或JavaScript。只修改必要部分，未提及内容保持不变。
4. 除非本次要求明确表示无需修改，否则继续调整禁止原样返回上一版HTML。
5. 新增图标、按钮、搜索框、通知等可视元素时，必须生成真实HTML元素和必要CSS；涉及点击、展开、关闭等行为时必须生成完整JavaScript。
6. 保留核心HTML结构、menuConfig、菜单渲染、iframe、message监听、侧边栏折叠及window.navigateTo逻辑。
7. 根据系统名称生成符合业务场景的中文标题、一级菜单和二级菜单。
8. 启用维度只是候选能力，不包含默认值；必须落实“AI已确定的本次维度方案”，用户本次明确要求可以调整对应决策，但不得违反硬性要求。
9. 用户要求涉及现有维度未覆盖的样式或布局细节时，直接修改对应HTML或CSS，不要要求用户新增维度。
10. 用户明确给出的颜色、尺寸、间距、位置、文字和数量必须逐字精确执行。例如用户要求64px就必须输出64px，不得自行改成相近值。
11. 不得生成不存在的子页面正文，不得向空白iframe注入占位内容。
12. 不得删除或改名硬性要求依赖的ID、函数、核心变量，以及用户区域的 user-menu、avatar-circle、user-name、user-role 类名。
13. 功能型维度必须实现完整行为，不能只生成视觉图标。用户信息维度包含“下拉”时，必须生成可点击触发器、下拉菜单、“修改密码”“退出登录”、重复点击关闭及点击页面其他区域关闭逻辑。
14. 菜单初始化不得依赖 window.onload 或外部 CDN 资源加载完成；必须在脚本末尾直接初始化，或使用 DOMContentLoaded 初始化。
15. 输出前必须逐字重读本次要求，并在最终代码中找到对应实现证据；找不到时继续修改，不得结束输出。
16. 输出前检查HTML标签闭合、CSS、JavaScript语法及全部硬性要求。
17. 不要解释、不要总结、不要输出Markdown代码块、不要返回JSON。
18. 回复必须从<!DOCTYPE html>开始，以</html>结束，只能包含完整index.html。`;

export function buildRepairPrompt(html: string, errors: string[], decisions: PromptDecision[] = []) {
  return `上一版HTML没有通过本地功能校验，请只修复以下错误，其他结构、样式、菜单和功能保持不变：
${errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}

【必须保持的维度方案】
${JSON.stringify(decisions)}

【待修复完整index.html】
${html}

只输出修复后的完整index.html。`;
}

export function extractCompleteHtml(content: string) {
  const cleaned = content.trim().replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.search(/<!doctype html>/i);
  const closingMatch = /<\/html\s*>/ig;
  let end = -1;
  for (const match of cleaned.matchAll(closingMatch)) end = (match.index ?? -1) + match[0].length;
  if (start < 0 || end <= start) throw new Error('AI未返回完整HTML，请重试');
  return cleaned.slice(start, end);
}
