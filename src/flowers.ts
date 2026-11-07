/** Versioned illustrated cultivars; colors are independent of foliage ink. */
export const FLOWERS = [
  { id: 'rose', label: 'Роза', color: '#c65375', plan: 'rose' },
  { id: 'tiger-lily', label: 'Тигровая лилия', color: '#e47b36', plan: 'lily' },
  { id: 'bachelors-button', label: 'Василёк', color: '#527bc6', plan: 'daisy' },
  { id: 'tulip', label: 'Тюльпан', color: '#d95b68', plan: 'lily' },
  { id: 'sunflower', label: 'Подсолнух', color: '#e8b739', plan: 'daisy' },
  { id: 'aster', label: 'Астра', color: '#a078be', plan: 'daisy' },
  { id: 'pansy', label: 'Анютины глазки', color: '#8856ae', plan: 'rose' },
  { id: 'snowdrop', label: 'Подснежник', color: '#e5e9df', plan: 'lily' },
] as const;
export type Flower = (typeof FLOWERS)[number]['id'];
export type FlowerColors = Record<Flower, string>;
export const defaultFlowerColors = Object.fromEntries(FLOWERS.map(f => [f.id, f.color])) as FlowerColors;
export const isFlower = (value: unknown): value is Flower => FLOWERS.some(f => f.id === value);
