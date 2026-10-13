import { describe, expect, it } from 'vitest';
import { classifyCategory } from './classify';

describe('classifyCategory', () => {
  it('maps beverage categories to drink', () => {
    for (const name of [
      'Hot Drinks',
      'Ice Drinks',
      'Blended Coffee / Frappe',
      'Blended Milkshake / Frappe',
      'Fruit Smoothies',
      'Fruit Soda',
      'Lemonade / Tea',
    ]) {
      expect(classifyCategory(name)).toBe('drink');
    }
  });
  it('maps food categories to physical', () => {
    for (const name of [
      'All Day Breakfast',
      'Set Meal',
      'Sandwiches',
      'Short Order',
    ]) {
      expect(classifyCategory(name)).toBe('physical');
    }
  });
  it('never silently classifies unknown input', () => {
    for (const name of ['Desserts', '', null, undefined, 42]) {
      expect(classifyCategory(name)).toBe('unclassified');
    }
  });
});
