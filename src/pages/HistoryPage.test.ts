import { describe, expect, it } from 'vitest';
import type { HistoryRecord, LoginHistoryRecord } from '../core/types';
import { generationDescription } from './HistoryPage';

describe('generationDescription', () => {
  it('shows the latest refinement instruction for an adjusted index page', () => {
    const record = { refinementInstruction: '侧边栏折叠按钮放到底部', toneSummary: '专业、严谨、高效' } as HistoryRecord;
    expect(generationDescription(record)).toBe('侧边栏折叠按钮放到底部');
  });

  it('keeps the original summary for an initial index page', () => {
    const record = { refinementInstruction: '', toneSummary: '专业、严谨、高效' } as HistoryRecord;
    expect(generationDescription(record)).toBe('专业、严谨、高效');
  });

  it('keeps the login page description behavior', () => {
    const record = { sourceGenerationId: 'index-1', refinementInstruction: '', instruction: '登录框放到右侧' } as LoginHistoryRecord;
    expect(generationDescription(record)).toBe('登录框放到右侧');
  });
});
