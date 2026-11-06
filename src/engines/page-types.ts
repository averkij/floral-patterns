export const PAGE_ADAPTER = 'florilegium-frame-v1' as const;
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
  /** Allowed visitors; their presence remains a decision of the upstream seed. */
  visitors: PageVisitor[];
}

export interface VisitorSummary {
  kind: string;
  group: string;
  text: string;
  at: string;
  panel: string;
}

export interface PageResult {
  svg: string;
  ms: number;
  stats: { motifs: number; stems: number; visitors: VisitorSummary[] };
  revision: typeof FLORILEGIUM_REVISION;
  adapter: typeof PAGE_ADAPTER;
}

export interface PageProgress {
  stage: 'loading' | 'growing';
  completed: number;
  total: 4;
  label: string;
}

export interface PageRequest {
  id: number;
  settings: PageSettings;
  runtime: { wasm: string; lua: string };
}

export type PageResponse =
  | { id: number; progress: PageProgress }
  | { id: number; result: PageResult }
  | { id: number; error: string };
