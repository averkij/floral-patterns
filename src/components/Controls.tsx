import type { ReactNode } from 'react';
import { palettes, type Palette } from '../state';

export function Icon({
  name,
  size = 18,
}: {
  name: 'arrow' | 'external' | 'dice' | 'close' | 'download' | 'check' | 'cells' | 'frame';
  size?: number;
}) {
  const paths = {
    arrow: (
      <>
        <path d="M4 12h15m-6-6 6 6-6 6" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6" />
      </>
    ),
    dice: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 7h.01M12 12h.01M17 17h.01M7 17h.01M17 7h.01" strokeWidth="2.7" />
      </>
    ),
    close: <path d="m5 5 14 14M19 5 5 19" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    cells: (
      <>
        <rect x="3" y="3" width="18" height="18" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </>
    ),
    frame: (
      <>
        <rect x="4" y="4" width="16" height="16" />
        <path d="M7 7h10v10H7z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="control-section">
      <div className="section-heading"><h2>{title}</h2>{action}</div>
      {children}
    </section>
  );
}
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
  percent = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  percent?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      <output>
        {percent ? Math.round(value * 100) : value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
        {percent ? '%' : suffix}
      </output>
    </label>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
export function SeedControl({ seed, onChange }: { seed: number; onChange: (n: number) => void }) {
  return (
    <div className="seed-row">
      <label htmlFor="seed">Вариант</label>
      <input
        id="seed"
        type="number"
        min="1"
        max="2147483646"
        value={seed}
        onChange={(e) =>
          onChange(Math.max(1, Math.min(2147483646, Math.floor(+e.target.value || 1))))
        }
      />
      <button
        className="icon-button"
        aria-label="Случайный вариант"
        title="Случайный вариант"
        onClick={() => onChange(1 + Math.floor(Math.random() * 999999))}
      >
        <Icon name="dice" />
      </button>
    </div>
  );
}
export function ColorControls({
  palette,
  onChange,
}: {
  palette: Palette;
  onChange: (p: Partial<Palette>) => void;
}) {
  return (
    <Section title="Палитра">
      <div className="color-controls">
        {(['ink', 'accent', 'paper'] as const).map((key) => (
          <label className="color-control" key={key}>
            <span className="color-well" style={{ backgroundColor: palette[key] }}>
              <input
                type="color"
                aria-label={`Цвет: ${{ ink: 'зелень', accent: 'акцент', paper: 'бумага' }[key]}`}
                value={palette[key]}
                onChange={(e) => onChange({ [key]: e.target.value })}
              />
            </span>
            <span>{{ ink: 'Зелень', accent: 'Акцент', paper: 'Бумага' }[key]}</span>
          </label>
        ))}
      </div>
      <div className="palette-row">
        {palettes.map((p) => (
          <button
            className="palette-swatch"
            key={p.name}
            title={p.name}
            aria-label={`Палитра: ${p.name}`}
            onClick={() => onChange(p.colors)}
            style={{ backgroundColor: p.colors.ink }}
          >
            <span style={{ backgroundColor: p.colors.accent }} />
            <span style={{ backgroundColor: p.colors.paper }} />
          </button>
        ))}
      </div>
    </Section>
  );
}
export function Actions({
  busy,
  growDisabled = false,
  hasOutput,
  onGrow,
  onExport,
  onShare,
  shareLabel,
  children,
}: {
  busy: boolean;
  growDisabled?: boolean;
  hasOutput: boolean;
  onGrow: () => void;
  onExport: () => void;
  onShare: () => void;
  shareLabel: string;
  children?: ReactNode;
}) {
  return (
    <div className="actions">
      <button className="primary-button" onClick={onGrow} disabled={busy || growDisabled} aria-busy={busy}>
        {busy ? 'Создаём…' : 'Создать узор'}
        {busy ? <span className="button-spinner" aria-hidden="true" /> : <Icon name="arrow" />}
      </button>
      <div className="action-pair">
        <button disabled={!hasOutput || busy} onClick={onExport}>
          Скачать SVG
        </button>
        <button onClick={onShare}>{shareLabel}</button>
      </div>
      {children}
    </div>
  );
}
