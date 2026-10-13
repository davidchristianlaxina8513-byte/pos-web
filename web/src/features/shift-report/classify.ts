export type ProductKind = 'drink' | 'physical' | 'unclassified';

const DRINKS = new Set([
  'hot drinks',
  'ice drinks',
  'blended coffee / frappe',
  'blended milkshake / frappe',
  'fruit smoothies',
  'fruit soda',
  'lemonade / tea',
]);

const PHYSICAL = new Set([
  'all day breakfast',
  'set meal',
  'sandwiches',
  'short order',
]);

function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/g, ' ')
    : '';
}

/** Explicit category mapping. Anything unlisted is unclassified, never guessed. */
export function classifyCategory(categoryName: unknown): ProductKind {
  const name = normalize(categoryName);
  if (DRINKS.has(name)) return 'drink';
  if (PHYSICAL.has(name)) return 'physical';
  return 'unclassified';
}
