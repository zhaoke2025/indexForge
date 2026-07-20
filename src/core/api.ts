import type { HistoryRecord, LoginHistoryRecord, TemplateState } from './types';
import type { LoginConfig } from '../data/defaultLoginConfig';
import type { DimensionConfig } from '../data/defaultDimensions';
import type { RequirementRule } from '../data/defaultRequirements';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  if (response.status === 204) return undefined as T;
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload;
}

export const api = {
  loadAll: async () => {
    const [dimensions, requirements, loginDimensions, loginRequirements, templates, generations, loginGenerations] = await Promise.all([
      request<{ dimensions: DimensionConfig[] }>('/api/dimensions'),
      request<{ requirements: RequirementRule[] }>('/api/requirements'),
      request<{ dimensions: DimensionConfig[] }>('/api/login-dimensions'),
      request<{ requirements: RequirementRule[] }>('/api/login-requirements'),
      request<{ templates: TemplateState[] }>('/api/templates'),
      request<{ generations: HistoryRecord[] }>('/api/generations'),
      request<{ generations: LoginHistoryRecord[] }>('/api/login-generations'),
    ]);
    return { dimensions: dimensions.dimensions, requirements: requirements.requirements, loginDimensions: loginDimensions.dimensions, loginRequirements: loginRequirements.requirements, templates: templates.templates, generations: generations.generations, loginGenerations: loginGenerations.generations };
  },
  saveDimension: (dimension: DimensionConfig, create: boolean) => request(`/api/dimensions${create ? '' : `/${dimension.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(dimension) }),
  deleteDimension: (id: string) => request<void>(`/api/dimensions/${id}`, { method: 'DELETE' }),
  reorderDimensions: (ids: string[]) => request('/api/dimensions/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  resetDimensions: () => request('/api/dimensions/reset', { method: 'POST' }),
  saveRequirement: (rule: RequirementRule, create: boolean) => request(`/api/requirements${create ? '' : `/${rule.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(rule) }),
  deleteRequirement: (id: string) => request<void>(`/api/requirements/${id}`, { method: 'DELETE' }),
  reorderRequirements: (ids: string[]) => request('/api/requirements/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  resetRequirements: () => request('/api/requirements/reset', { method: 'POST' }),
  saveLoginDimension: (dimension: DimensionConfig, create: boolean) => request(`/api/login-dimensions${create ? '' : `/${dimension.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(dimension) }),
  deleteLoginDimension: (id: string) => request<void>(`/api/login-dimensions/${id}`, { method: 'DELETE' }),
  reorderLoginDimensions: (ids: string[]) => request('/api/login-dimensions/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  resetLoginDimensions: () => request('/api/login-dimensions/reset', { method: 'POST' }),
  saveLoginRequirement: (rule: RequirementRule, create: boolean) => request(`/api/login-requirements${create ? '' : `/${rule.id}`}`, { method: create ? 'POST' : 'PUT', body: JSON.stringify(rule) }),
  deleteLoginRequirement: (id: string) => request<void>(`/api/login-requirements/${id}`, { method: 'DELETE' }),
  reorderLoginRequirements: (ids: string[]) => request('/api/login-requirements/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  resetLoginRequirements: () => request('/api/login-requirements/reset', { method: 'POST' }),
  uploadTemplate: (name: string, html: string) => request('/api/templates', { method: 'POST', body: JSON.stringify({ name, html }) }),
  setCurrentTemplate: (id: string) => request(`/api/templates/${id}/current`, { method: 'PUT' }),
  deleteTemplate: (id: string) => request<void>(`/api/templates/${id}`, { method: 'DELETE' }),
  generate: (body: { systemName: string; version: string; instruction: string }) => request<{ generation: HistoryRecord }>('/api/generations', { method: 'POST', body: JSON.stringify(body) }),
  refine: (id: string, instruction: string) => request<{ generation: HistoryRecord }>(`/api/generations/${id}/refine`, { method: 'POST', body: JSON.stringify({ instruction }) }),
  deleteGeneration: (id: string) => request<void>(`/api/generations/${id}`, { method: 'DELETE' }),
  deleteGenerations: (ids: string[]) => request<{ deleted: number }>('/api/generations/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  generateLogin: (body: { config: LoginConfig; instruction: string; sourceGenerationId?: string }) => request<{ generation: LoginHistoryRecord }>('/api/login-generations', { method: 'POST', body: JSON.stringify(body) }),
  refineLogin: (id: string, instruction: string, backgroundImage: string) => request<{ generation: LoginHistoryRecord }>(`/api/login-generations/${id}/refine`, { method: 'POST', body: JSON.stringify({ instruction, config: { backgroundImage } }) }),
  deleteLoginGeneration: (id: string) => request<void>(`/api/login-generations/${id}`, { method: 'DELETE' }),
  deleteLoginGenerations: (ids: string[]) => request<{ deleted: number }>('/api/login-generations/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
};
