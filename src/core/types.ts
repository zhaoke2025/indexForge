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
  systemName: string;
  version: string;
  displayName: string;
  presetName: string;
  generatedAt: string;
  html: string;
  validation: ValidationResult;
};

export type TemplateState = {
  name: string;
  html: string;
  validation: ValidationResult;
  isDefault: boolean;
};
