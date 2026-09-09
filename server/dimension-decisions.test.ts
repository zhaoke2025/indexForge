import { describe, expect, it } from 'vitest';
import { applyExplicitDimensionOverrides, buildDimensionDecisionPrompt, parseDimensionPlan, type DimensionDefinition } from './dimension-decisions.js';

const definitions: DimensionDefinition[] = [
  { id: 'mode', name: '明暗模式', group: '视觉', description: '页面明暗关系', valueType: 'single-select', options: ['浅色', '深色'] },
  { id: 'sidebarToggle', name: '侧栏折叠', group: '布局', description: '是否允许折叠', valueType: 'boolean', options: [] },
];

describe('AI dimension decisions', () => {
  it.each(['不要用户名，退出登录按钮在头像右侧，不要收起侧边栏按钮', '隐藏用户名', '用户名不要显示', '去掉姓名'])('overrides an unwanted username for %s', (instruction) => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+姓名', '头像+退出登录按钮'] },
    ];
    const decisions = [{ dimensionId: 'userInfo', applied: true, value: '头像+姓名', reason: '' }];
    expect(applyExplicitDimensionOverrides(instruction, decisions, userDefinitions)[0]).toMatchObject({ applied: true, value: '头像+退出登录按钮' });
  });

  it('selects a no-name option even when AI did not apply userInfo', () => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+用户名', '头像+无下拉+退出登录按钮'] },
    ];
    expect(applyExplicitDimensionOverrides('不要用户名，保留头像', [{ dimensionId: 'userInfo', applied: false, value: null, reason: '' }], userDefinitions)[0])
      .toMatchObject({ applied: true, value: '头像+无下拉+退出登录按钮' });
  });

  it('keeps the previous no-name shape active when AI omits it during refinement', () => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+姓名', '头像+退出登录按钮'] },
    ];
    const previous = [{ dimensionId: 'userInfo', applied: true, value: '头像+退出登录按钮', reason: '' }];
    expect(applyExplicitDimensionOverrides('不要用户名', [{ dimensionId: 'userInfo', applied: false, value: null, reason: '' }], userDefinitions, previous)[0])
      .toMatchObject({ applied: true, value: '头像+退出登录按钮' });
  });

  it('removes both name and avatar when only logout is requested', () => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+姓名', '头像+退出登录按钮', '移除用户'] },
    ];
    expect(applyExplicitDimensionOverrides('不要用户名头像，只要退出登录按钮，且需要用矩形框包裹起来', [{ dimensionId: 'userInfo', applied: true, value: '头像+姓名', reason: '' }], userDefinitions)[0])
      .toMatchObject({ applied: true, value: '移除用户' });
  });

  it('does not remove a username when the removal targets another control', () => {
    const decisions = [{ dimensionId: 'userInfo', applied: true, value: '头像+姓名', reason: '' }];
    expect(applyExplicitDimensionOverrides('保留用户名，不要下拉箭头', decisions, [])).toEqual(decisions);
    expect(applyExplicitDimensionOverrides('不要修改用户名', decisions, [])).toEqual(decisions);
  });

  it('preserves other user features and logout placement when a matching option exists', () => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+用户名+角色+下拉', '头像+角色+下拉'] },
    ];
    const decisions = [
      { dimensionId: 'userInfo', applied: true, value: '头像+用户名+角色+下拉', reason: '' },
      { dimensionId: 'logout', applied: true, value: '用户信息下拉菜单', reason: '' },
    ];
    const result = applyExplicitDimensionOverrides('不要用户名', decisions, userDefinitions);
    expect(result[0].value).toBe('头像+角色+下拉');
    expect(result[1]).toEqual(decisions[1]);
  });

  it('derives an explicit no-name shape when configured options do not cover the request', () => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+姓名'] },
    ];
    expect(applyExplicitDimensionOverrides('不要用户名', [{ dimensionId: 'userInfo', applied: true, value: '头像+姓名', reason: '' }], userDefinitions)[0])
      .toMatchObject({ applied: true, value: '头像' });
  });

  it('allows removing the whole user area with the existing local configuration', () => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+退出登录按钮', '头像+用户名+下拉', '头像+用户名'] },
    ];
    expect(applyExplicitDimensionOverrides('不要用户名头像，只要退出登录按钮，且需要用矩形框包裹起来', [{ dimensionId: 'userInfo', applied: true, value: '头像+用户名', reason: '' }], userDefinitions)[0])
      .toMatchObject({ applied: true, value: '移除用户' });
    expect(userDefinitions[0].options).toEqual(['头像+退出登录按钮', '头像+用户名+下拉', '头像+用户名']);
  });

  it('sends definitions without default values and requires an applied decision for every candidate', () => {
    const prompt = buildDimensionDecisionPrompt({ systemName: '供应链系统', instruction: '', dimensions: definitions, page: 'index' });
    expect(prompt).toContain('母版只提供结构和核心功能');
    expect(prompt).toContain('逐项返回全部启用维度');
    expect(prompt).toContain('applied=false');
    expect(prompt).toContain('不设置数量上限');
    expect(prompt).not.toContain('绝对不得超过');
    expect(prompt).not.toContain('defaultValue');
  });

  it('keeps user intent separate from available resources during refinement', () => {
    const prompt = buildDimensionDecisionPrompt({ systemName: '信贷系统', instruction: '登录背景图片先去掉吧，不太好看', dimensions: definitions, page: 'login', previous: [], resources: ['已上传一张可用的登录页背景图片'] });
    expect(prompt).toContain('【本次补充要求】\n登录背景图片先去掉吧，不太好看');
    expect(prompt).toContain('【可用资源（仅表示可以使用，不代表用户要求采用）】\n已上传一张可用的登录页背景图片');
    expect(prompt).toContain('不得被上一版方案、母版或可用资源覆盖');
    expect(prompt).toContain('不要因为资源存在就自动选择对应维度');
  });

  it('forces a user dropdown removal requested during refinement', () => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+无下拉+退出登录按钮', '头像+用户名+下拉', '头像+用户名'] },
      { id: 'logout', name: '退出登录', group: '顶栏', description: '', valueType: 'single-select', options: ['用户信息下拉菜单', '头像右侧紧挨着顶栏最右侧'] },
    ];
    const previous = [
      { dimensionId: 'userInfo', applied: true, value: '头像+用户名+下拉', reason: '' },
      { dimensionId: 'logout', applied: true, value: '用户信息下拉菜单', reason: '' },
    ];
    const decisions = previous.map((item) => ({ ...item }));
    const result = applyExplicitDimensionOverrides('取消下拉菜单和下拉箭头，只在头像右侧显示退出登录', decisions, userDefinitions, previous);

    expect(result.find((item) => item.dimensionId === 'userInfo')?.value).toBe('头像+用户名');
    expect(result.find((item) => item.dimensionId === 'logout')?.value).toBe('头像右侧紧挨着顶栏最右侧');
  });

  it('does not treat a sidebar submenu request as a user dropdown change', () => {
    const userDefinitions: DimensionDefinition[] = [
      { id: 'userInfo', name: '用户信息', group: '顶栏', description: '', valueType: 'single-select', options: ['头像+姓名+下拉', '头像+姓名'] },
    ];
    const decisions = [{ dimensionId: 'userInfo', applied: true, value: '头像+姓名+下拉', reason: '' }];

    expect(applyExplicitDimensionOverrides('去掉侧边栏子菜单的下拉效果', decisions, userDefinitions)).toEqual(decisions);
  });

  it('parses and validates selected dimension values', () => {
    const plan = parseDimensionPlan(JSON.stringify({ systemType: '供应链', toneSummary: '稳健清晰', dimensions: [
      { dimensionId: 'mode', applied: true, value: '浅色', reason: '适合高密度业务操作' },
      { dimensionId: 'sidebarToggle', applied: false, value: null, reason: '该系统无需折叠' },
    ] }), definitions);
    expect(plan.dimensions).toHaveLength(2);
    expect(plan.dimensions.filter((item) => item.applied)).toHaveLength(1);
    expect(plan.toneSummary).toBe('稳健清晰');
  });

  it('accepts JSON wrapped in a markdown code fence', () => {
    const content = `\`\`\`json\n${JSON.stringify({ dimensions: [
      { dimensionId: 'mode', applied: true, value: '浅色', reason: '' },
      { dimensionId: 'sidebarToggle', applied: false, value: null, reason: '' },
    ] })}\n\`\`\``;
    expect(parseDimensionPlan(content, definitions).dimensions).toHaveLength(2);
  });

  it('rejects values outside configured options', () => {
    expect(() => parseDimensionPlan(JSON.stringify({ dimensions: [
      { dimensionId: 'mode', applied: true, value: '自动', reason: '' },
      { dimensionId: 'sidebarToggle', applied: false, value: null, reason: '' },
    ] }), definitions)).toThrow('不在可选项中');
  });

  it('rejects an incomplete candidate assessment', () => {
    expect(() => parseDimensionPlan(JSON.stringify({ dimensions: [
      { dimensionId: 'mode', applied: true, value: '浅色', reason: '' },
    ] }), definitions)).toThrow('未完整评估候选池');
  });

  it('normalizes inactive values even when AI marks them as applied', () => {
    const inactiveDefinitions: DimensionDefinition[] = [
      { id: 'menuBadge', name: '菜单徽章', group: '菜单', description: '', valueType: 'single-select', options: ['无', 'NEW'] },
      { id: 'menuDivider', name: '菜单分割线', group: '菜单', description: '', valueType: 'boolean', options: [] },
    ];
    const plan = parseDimensionPlan(JSON.stringify({ dimensions: [
      { dimensionId: 'menuBadge', applied: true, value: '无', reason: '无需徽章' },
      { dimensionId: 'menuDivider', applied: true, value: false, reason: '无需分割线' },
    ] }), inactiveDefinitions);
    expect(plan.dimensions.every((item) => item.applied === false && item.value === null)).toBe(true);
  });

  it('allows AI to apply more than fifteen dimensions', () => {
    const many: DimensionDefinition[] = Array.from({ length: 16 }, (_, index) => ({ id: `d${index}`, name: `维度${index}`, group: '测试', description: '', valueType: 'text', options: [] }));
    const content = JSON.stringify({ dimensions: many.map((item) => ({ dimensionId: item.id, applied: true, value: '启用', reason: '测试' })) });
    expect(parseDimensionPlan(content, many).dimensions.filter((item) => item.applied)).toHaveLength(16);
  });
});
