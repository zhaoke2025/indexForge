import { seedRequirements } from './defaults.js';

export type IndexRequirement = {
  id: string;
  name: string;
  description: string;
  level: string;
  validationType: string;
  builtinValidator?: string;
  enabled: boolean;
  sortOrder?: number;
};

export const protectedIndexRequirementIds = new Set<string>(seedRequirements.slice(0, 3).map((item) => item[0]));

export function enforcedIndexRequirements(requirements: IndexRequirement[]) {
  const protectedRequirements: IndexRequirement[] = seedRequirements.slice(0, 3).map((item, index) => ({
    id: item[0],
    name: item[1],
    description: item[2],
    level: item[3],
    validationType: item[4],
    builtinValidator: item[5] || undefined,
    enabled: true,
    sortOrder: index,
  }));
  return [
    ...protectedRequirements,
    ...requirements.filter((item) => !protectedIndexRequirementIds.has(item.id) && item.enabled),
  ];
}
