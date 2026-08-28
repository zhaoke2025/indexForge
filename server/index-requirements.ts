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
  const remaining = requirements
    .filter((item) => !protectedIndexRequirementIds.has(item.id))
    .map((item) => item.id === 'R11' ? { ...item, validationType: 'builtin', builtinValidator: 'logout-control', enabled: true } : item)
    .filter((item) => item.enabled);
  if (!remaining.some((item) => item.id === 'R11')) {
    const item = seedRequirements.find((requirement) => requirement[0] === 'R11')!;
    remaining.push({
      id: item[0],
      name: item[1],
      description: item[2],
      level: item[3],
      validationType: item[4],
      builtinValidator: item[5] || undefined,
      enabled: true,
      sortOrder: seedRequirements.indexOf(item),
    });
  }
  return [...protectedRequirements, ...remaining];
}
