export type DimensionDefinition = {
  id: string;
  name: string;
  group: string;
  description: string;
  valueType: string;
  options: string[];
};

export type DimensionDecision = {
  dimensionId: string;
  applied: boolean;
  value: string | boolean | null;
  reason: string;
};

export type DimensionPlan = {
  systemType: string;
  toneSummary: string;
  dimensions: DimensionDecision[];
};

const inactiveValues: Record<string, Array<string | boolean>> = {
  sidebarToggle: [false],
  menuDivider: [false],
  menuBadge: ['无'],
  menuOrder: ['默认'],
  submenuTrigger: ['无'],
  submenuAnimation: ['无'],
  iframeLoading: ['空白'],
  assist: ['无'],
  registerEntry: ['无'],
  policyFooter: ['无'],
  copyrightFooter: ['无'],
  decoration: ['无'],
  demoAccount: ['不预填'],
};

function hasActiveEffect(dimensionId: string, value: unknown) {
  return !(inactiveValues[dimensionId] || []).some((inactive) => inactive === value);
}

export type AppliedDimensionDecision = DimensionDecision & { applied: true; value: string | boolean };

export function appliedDimensionDecisions(decisions: DimensionDecision[]): AppliedDimensionDecision[] {
  return decisions.filter((item): item is AppliedDimensionDecision => item.applied === true && item.value !== null);
}

export function buildDimensionDecisionPrompt(input: {
  systemName: string;
  instruction: string;
  dimensions: DimensionDefinition[];
  page: 'index' | 'login';
  previous?: DimensionDecision[];
  resources?: string[];
}) {
  const pageName = input.page === 'login' ? '登录页' : '后台首页';
  return `请为“${input.systemName}”规划${pageName}的实体维度。

【启用维度候选池】
${JSON.stringify(input.dimensions)}

【本次补充要求】
${input.instruction || '无'}
【可用资源（仅表示可以使用，不代表用户要求采用）】
${input.resources?.length ? input.resources.join('\n') : '无'}
${input.previous ? `\n【上一版维度方案】\n${JSON.stringify(input.previous)}\n继续调整时只更新本次要求涉及的决策，其他决策保持不变。` : ''}

规则：
1. 母版只提供结构和核心功能，不代表默认视觉方案。
2. 用户本次补充或调整要求是维度决策的最高优先依据。必须理解其自然语言含义，对涉及维度执行增加、取消或变更；不得被上一版方案、母版或可用资源覆盖。
3. 可用资源只说明当前具备该素材，不等于用户要求使用。是否使用必须服从用户本次要求；不要因为资源存在就自动选择对应维度。
4. dimensions 必须逐项返回全部启用维度，每个候选维度恰好一条，不得遗漏或重复。
5. 实际需要应用时 applied=true，并给出具体 value；不需要应用时 applied=false，value=null。
6. applied=true 时，single-select 的 value 必须严格取自 options；boolean 必须返回布尔值；text 根据系统业务和整体调性生成具体值。
7. 决策应形成统一、克制且适合该系统业务的整体风格，reason 简要说明采用或不采用的业务依据。
8. 是否采用以及实际采用多少项均由AI根据当前系统业务自主判断，不设置数量上限；不得为了填满候选池而采用没有实际作用的维度。值为“无”“默认”“空白”“不预填”或布尔 false 的关闭型配置不得标记为 applied=true。
9. 只返回 JSON 对象：{"systemType":"业务类型","toneSummary":"整体调性","dimensions":[{"dimensionId":"维度ID","applied":true,"value":"具体值","reason":"选择理由"},{"dimensionId":"维度ID","applied":false,"value":null,"reason":"不采用理由"}]}。`;
}

export function parseDimensionPlan(content: string, definitions: DimensionDefinition[]): DimensionPlan {
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error('AI未返回有效的维度决策JSON'); }
  const source = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  if (!Array.isArray(source.dimensions)) throw new Error('AI维度决策缺少 dimensions 数组');
  const byId = new Map(definitions.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const dimensions = source.dimensions.map((item) => {
    const decision = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const dimensionId = String(decision.dimensionId || '');
    const definition = byId.get(dimensionId);
    if (!definition || seen.has(dimensionId)) throw new Error(`AI返回了无效或重复的维度：${dimensionId || '空ID'}`);
    seen.add(dimensionId);
    if (typeof decision.applied !== 'boolean') throw new Error(`维度 ${dimensionId} 缺少 applied 布尔值`);
    const applied = decision.applied;
    const value = decision.value;
    if (!applied && value !== null) throw new Error(`未应用维度 ${dimensionId} 的 value 必须为 null`);
    if (applied && definition.valueType === 'boolean' && typeof value !== 'boolean') throw new Error(`维度 ${dimensionId} 必须返回布尔值`);
    if (applied && definition.valueType !== 'boolean' && typeof value !== 'string') throw new Error(`维度 ${dimensionId} 必须返回文本值`);
    if (applied && definition.valueType === 'single-select' && !definition.options.includes(String(value))) throw new Error(`维度 ${dimensionId} 的值不在可选项中`);
    const normalizedApplied = applied && hasActiveEffect(dimensionId, value);
    return { dimensionId, applied: normalizedApplied, value: normalizedApplied ? value as string | boolean : null, reason: String(decision.reason || '').trim() };
  });
  if (seen.size !== definitions.length) throw new Error(`AI维度决策未完整评估候选池：应返回 ${definitions.length} 项，实际返回 ${seen.size} 项`);
  return {
    systemType: String(source.systemType || '').trim(),
    toneSummary: String(source.toneSummary || '').trim(),
    dimensions,
  };
}
