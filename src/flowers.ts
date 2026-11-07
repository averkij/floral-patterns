/** Versioned illustrated cultivars; colors are independent of foliage ink. */
export const FLOWERS = [
  { id: 'rose', label: 'Roses', color: '#c65375', plan: 'rose' },
  { id: 'tiger-lily', label: 'Tiger lily', color: '#e47b36', plan: 'lily' },
  { id: 'bachelors-button', label: "Bachelor’s button", color: '#527bc6', plan: 'daisy' },
  { id: 'tulip', label: 'Tulip', color: '#d95b68', plan: 'lily' },
  { id: 'sunflower', label: 'Sunflower', color: '#e8b739', plan: 'daisy' },
  { id: 'aster', label: 'Aster', color: '#a078be', plan: 'daisy' },
  { id: 'pansy', label: 'Pansy', color: '#8856ae', plan: 'rose' },
  { id: 'snowdrop', label: 'Snowdrop', color: '#e5e9df', plan: 'lily' },
] as const;
export type Flower = (typeof FLOWERS)[number]['id'];
export type FlowerColors = Record<Flower, string>;
export const defaultFlowerColors = Object.fromEntries(FLOWERS.map(f => [f.id, f.color])) as FlowerColors;
export const isFlower = (value: unknown): value is Flower => FLOWERS.some(f => f.id === value);
