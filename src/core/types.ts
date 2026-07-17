import type { ValidationResult } from './validator';

export type MenuSubItem = {
  name: string;
  file: string;
};

export type MenuItemConfig = {
  id: string;
  name: string;
  icon: string;
  file?: string;
  subMenu: MenuSubItem[];
};

export type HistoryRecord = {
  id: string;
  parentId?: string;
  systemName: string;
  version: string;
  displayName: string;
  instruction: string;
  refinementInstruction?: string;
  systemType: string;
  toneSummary: string;
  dimensions: Array<{ dimensionId: string; value: string | boolean; reason: string }>;
  menuConfig: MenuItemConfig[];
  requirementChecks: Array<{ requirementId: string; passed: boolean; detail: string }>;
  generatedAt: string;
  html: string;
  status: string;
  validation: ValidationResult;
};

export type LoginHistoryRecord = {
  id: string;
  parentId?: string;
  sourceGenerationId: string;
  systemName: string;
  version: string;
  slogan: string;
  instruction: string;
  refinementInstruction?: string;
  config: Record<string, unknown>;
  generatedAt: string;
  html: string;
  status: string;
  validation: ValidationResult;
};

export type TemplateState = {
  id: string;
  name: string;
  html: string;
  validation: ValidationResult;
  isCurrent: boolean;
};
