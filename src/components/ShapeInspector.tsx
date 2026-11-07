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
      <Section title="Область">
        <div className="segmented" role="group" aria-label="Тип области">
          {[
            ['shape', 'Фигура'],
            ['text', 'Буква'],
            ['custom', 'Рисунок'],
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
                {kind === 'circle' ? 'Круг' : kind === 'arch' ? 'Арка' : 'Сердце'}
              </button>
            ))}
          </div>
        ) : mode === 'text' ? (
          <>
            <input
              className="letter-input"
              aria-label="Буква или слово"
              value={settings.text}
              maxLength={6}
              onChange={(e) => update({ text: [...e.target.value].slice(0, 6).join('') })}
            />
            <select
              className="font-select"
              aria-label="Шрифт букв"
              value={settings.font}
              onChange={(e) => update({ font: e.target.value as 'serif' | 'sans' })}
            >
              <option value="serif">С засечками</option>
              <option value="sans">Без засечек</option>
            </select>
          </>
        ) : (
          <>
            <button className="draw-button" onClick={onDraw}>
              {drawing ? 'Режим рисования' : 'Нарисовать контур'}
            </button>
          </>
        )}
      </Section>
      <Section title="Композиция">
        <SeedControl seed={settings.seed} onChange={(seed) => update({ seed })} />
        <Slider
          label="Плотность"
          min={60}
          max={260}
          step={10}
          value={settings.density}
          onChange={(density) => update({ density })}
        />
      </Section>
      <ColorControls palette={settings} onChange={update} />
      <Section title="Детали">
        <Slider
          label="Размер цветов"
          min={0.65}
          max={1.5}
          step={0.05}
          value={settings.flowerScale}
          onChange={(flowerScale) => update({ flowerScale })}
        />
        <div className="check-grid">
          <Check
            label="Ячейки"
            checked={settings.showCells}
            onChange={(showCells) => update({ showCells })}
          />
          <Check
            label="Контур"
            checked={settings.showOutline}
            onChange={(showOutline) => update({ showOutline })}
          />
        </div>
      </Section>
    </>
  );
}
