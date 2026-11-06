import type { ShapeConfig } from '../state';
import { Check, ColorControls, Section, SeedControl, Slider } from './Controls';

export default function ShapeInspector({
  settings,
  update,
  drawing,
  onDraw,
}: {
  settings: ShapeConfig;
  update: (p: Partial<ShapeConfig>) => void;
  drawing: boolean;
  onDraw: () => void;
}) {
  const mode = settings.kind === 'text' ? 'text' : settings.kind === 'custom' ? 'custom' : 'shape';
  return (
    <>
      <Section title="Region">
        <div className="segmented" aria-label="Region type">
          {[
            ['shape', 'Shape'],
            ['text', 'Letter'],
            ['custom', 'Draw'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={mode === value}
              className={mode === value ? 'selected' : ''}
              onClick={() => {
                update({ kind: value === 'shape' ? 'circle' : (value as 'text' | 'custom') });
                if (value === 'custom') onDraw();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'shape' ? (
          <div className="shape-presets">
            {(['circle', 'arch', 'heart'] as const).map((kind) => (
              <button
                key={kind}
                className={settings.kind === kind ? 'selected' : ''}
                aria-pressed={settings.kind === kind}
                onClick={() => update({ kind })}
              >
                {kind === 'circle' ? 'Circle' : kind === 'arch' ? 'Arch' : 'Heart'}
              </button>
            ))}
          </div>
        ) : mode === 'text' ? (
          <>
            <input
              className="letter-input"
              aria-label="Letter or word"
              value={settings.text}
              maxLength={6}
              onChange={(e) => update({ text: [...e.target.value].slice(0, 6).join('') })}
            />
            <select
              className="font-select"
              aria-label="Lettering font"
              value={settings.font}
              onChange={(e) => update({ font: e.target.value as 'serif' | 'sans' })}
            >
              <option value="serif">Editorial serif</option>
              <option value="sans">Modern sans</option>
            </select>
            <p className="help-text">Up to 6 characters. Try a monogram.</p>
          </>
        ) : (
          <>
            <button className="draw-button" onClick={onDraw}>
              {drawing ? 'Drawing mode is on' : 'Draw a new outline'}
            </button>
            <p className="help-text">
              Drag on the canvas to draw a closed region. Release to grow.
            </p>
          </>
        )}
      </Section>
      <Section title="Composition">
        <SeedControl seed={settings.seed} onChange={(seed) => update({ seed })} />
        <Slider
          label="Density"
          min={60}
          max={260}
          step={10}
          value={settings.density}
          onChange={(density) => update({ density })}
        />
      </Section>
      <ColorControls palette={settings} onChange={update} />
      <Section title="Detail">
        <Slider
          label="Flower scale"
          min={0.65}
          max={1.5}
          step={0.05}
          value={settings.flowerScale}
          onChange={(flowerScale) => update({ flowerScale })}
        />
        <div className="check-grid">
          <Check
            label="Show cells"
            checked={settings.showCells}
            onChange={(showCells) => update({ showCells })}
          />
          <Check
            label="Show outline"
            checked={settings.showOutline}
            onChange={(showOutline) => update({ showOutline })}
          />
        </div>
      </Section>
    </>
  );
}
