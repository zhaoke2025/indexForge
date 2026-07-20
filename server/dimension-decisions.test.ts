import { describe, expect, it } from 'vitest';
import { buildDimensionDecisionPrompt, parseDimensionPlan, type DimensionDefinition } from './dimension-decisions.js';

const definitions: DimensionDefinition[] = [
  { id: 'mode', name: '明暗模式', group: '视觉', description: '页面明暗关系', valueType: 'single-select', options: ['浅色', '深色'] },
  { id: 'sidebarToggle', name: '侧栏折叠', group: '布局', description: '是否允许折叠', valueType: 'boolean', options: [] },
];

describe('AI dimension decisions', () => {
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

  it('parses and validates selected dimension values', () => {
    const plan = parseDimensionPlan(JSON.stringify({ systemType: '供应链', toneSummary: '稳健清晰', dimensions: [
      { dimensionId: 'mode', applied: true, value: '浅色', reason: '适合高密度业务操作' },
      { dimensionId: 'sidebarToggle', applied: false, value: null, reason: '该系统无需折叠' },
    ] }), definitions);
    expect(plan.dimensions).toHaveLength(2);
    expect(plan.dimensions.filter((item) => item.applied)).toHaveLength(1);
    expect(plan.toneSummary).toBe('稳健清晰');
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
