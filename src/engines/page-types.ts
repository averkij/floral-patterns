import type { Flower, FlowerColors } from '../flowers';
import type { TextFont } from '../text-fonts';

export const PAGE_ADAPTER = 'florilegium-continuous-v4' as const;
export const FLORILEGIUM_REVISION = '9fbaf56d53e6525e02da05cd802ea7da82052099' as const;

export type PageVisitor =
  | 'butterfly'
  | 'bee'
  | 'bird'
  | 'snail'
  | 'dragonfly'
  | 'beetle'
  | 'caterpillar'
  | 'fly';
export type PageSeason = 'spring' | 'summer' | 'autumn';

/** Millimetres, measured from the top left of a 210 × 297 mm A4 sheet. */
export interface PageRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageSettings {
  version: 1;
  seed: number;
  rect: PageRectangle;
  ink: string;
  accent: string;
  paper: string;
  density: number;
  season: PageSeason;
  /** Each selected type is placed once, independently of density and season. */
  visitors: PageVisitor[];
  /** Omitted only for legacy callers using the original sampled community. */
  flowers?: Flower[];
  flowerColors?: FlowerColors;
  flowersMatchInk?: boolean;
  /** Plain text in the reserved rectangle; omitted in older shared settings. */
  text?: string;
  textFont?: TextFont;
  textSize?: number;
}

export interface VisitorSummary {
  kind: string;
  group: string;
  text: string;
  at: string;
}

export interface PageGrowthEvent {
  id: string;
  kind: 'stem' | 'bloom';
  /** Upstream schedule, in seconds. */
  start: number;
  duration: number;
  /** PDF points, in the SVG's single local y-up coordinate system. */
  x: number;
  y: number;
  path?: string;
  width?: number;
  length?: number;
}

export interface PageTimeline {
  svg: string;
  duration: number;
  events: PageGrowthEvent[];
}

export interface PageResult {
  svg: string;
  ms: number;
  stats: { motifs: number; stems: number; visitors: VisitorSummary[] };
  revision: typeof FLORILEGIUM_REVISION;
  adapter: typeof PAGE_ADAPTER;
  timeline?: PageTimeline;
}

export interface PageProgress {
  stage: 'loading' | 'growing';
  completed: number;
  total: number;
  label: string;
}

export interface PageRequest {
  id: number;
  settings: PageSettings;
  runtime: { wasm: string; lua: string; fonts?: string };
  animate?: boolean;
}

export type PageResponse =
  | { id: number; progress: PageProgress }
  | { id: number; result: PageResult }
  | { id: number; error: string };
