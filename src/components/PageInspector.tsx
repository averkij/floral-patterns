import { constrainRect, type PageConfig, type Visitor } from '../state';
import { Check, ColorControls, Section, SeedControl, Slider } from './Controls';

const visitors: [Visitor, string][] = [
  ['butterfly', 'Butterflies'],
  ['bee', 'Bees'],
  ['bird', 'Birds'],
  ['snail', 'Snails'],
];
export default function PageInspector({
  settings,
  update,
}: {
  settings: PageConfig;
  update: (p: Partial<PageConfig>) => void;
}) {
  const rectangle = (key: 'x' | 'y' | 'width' | 'height', value: number) =>
    update({ rect: constrainRect({ ...settings.rect, [key]: value }) });
  return (
    <>
      <Section title="Composition">
        <SeedControl seed={settings.seed} onChange={(seed) => update({ seed })} />
        <Slider
          label="Density"
          value={settings.density}
          min={0.2}
          max={1}
          step={0.05}
          onChange={(density) => update({ density })}
        />
      </Section>
      <ColorControls palette={settings} onChange={update} />
      <Section title="Garden">
        <label className="select-row">
          <span>Season</span>
          <select
            value={settings.season}
            onChange={(e) => update({ season: e.target.value as PageConfig['season'] })}
          >
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="autumn">Autumn</option>
          </select>
        </label>
        <p className="field-caption">Visitors allowed</p>
        <div className="check-grid">
          {visitors.map(([key, label]) => (
            <Check
              key={key}
              label={label}
              checked={settings.visitors.includes(key)}
              onChange={(checked) =>
                update({
                  visitors: checked
                    ? [...settings.visitors, key]
                    : settings.visitors.filter((v) => v !== key),
                })
              }
            />
          ))}
        </div>
        <p className="help-text">The seed decides who visits.</p>
      </Section>
      <Section title="Reserved space">
        <div className="dimension-grid">
          {(['width', 'height', 'x', 'y'] as const).map((key) => (
            <label key={key}>
              <span>{{ width: 'Width', height: 'Height', x: 'Left', y: 'Top' }[key]}</span>
              <div>
                <input
                  aria-label={`Rectangle ${key}`}
                  type="number"
                  value={Math.round(settings.rect[key] * 10) / 10}
                  step="1"
                  min={key === 'x' || key === 'y' ? 18 : 40}
                  max={
                    key === 'x'
                      ? 192 - settings.rect.width
                      : key === 'y'
                        ? 279 - settings.rect.height
                        : key === 'width'
                          ? 174
                          : 261
                  }
                  onChange={(e) => rectangle(key, +e.target.value)}
                />
                <span>mm</span>
              </div>
            </label>
          ))}
        </div>
        <Check
          label="Show frame"
          checked={settings.showFrame}
          onChange={(showFrame) => update({ showFrame })}
        />
      </Section>
    </>
  );
}
