import { constrainRect, type PageConfig, type Visitor } from '../state';
import { Check, ColorControls, Section, SeedControl, Slider } from './Controls';
import { FLOWERS, defaultFlowerColors } from '../flowers';

const visitors: [Visitor, string][] = [
  ['butterfly', 'Butterflies'],
  ['bee', 'Bees'],
  ['bird', 'Birds'],
  ['snail', 'Snails'],
];
export default function PageInspector({
  settings,
  update,
  watchGrowth,
  onWatchGrowth,
  onReplay,
  replayDisabled,
}: {
  settings: PageConfig;
  update: (p: Partial<PageConfig>) => void;
  watchGrowth: boolean;
  onWatchGrowth: (enabled: boolean) => void;
  onReplay: () => void;
  replayDisabled: boolean;
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
        <div className="growth-controls">
          <Check label="Watch growth" checked={watchGrowth} onChange={onWatchGrowth} />
          <button onClick={onReplay} disabled={replayDisabled} aria-label="Replay growth">
            Replay
          </button>
        </div>
      </Section>
      <ColorControls palette={settings} onChange={update} />
      <Section title="Flowers">
        <p className="help-text flower-intro">Choose your varieties and their bloom colors.</p>
        <div className="flower-list">
          {FLOWERS.map(flower => (
            <div className="flower-row" key={flower.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={settings.flowers.includes(flower.id)}
                  disabled={settings.flowers.length === 1 && settings.flowers[0] === flower.id}
                  onChange={(event) => update({
                    flowers: FLOWERS.filter(f => f.id === flower.id
                      ? event.target.checked
                      : settings.flowers.includes(f.id)).map(f => f.id),
                  })}
                />
                <span>{flower.label}</span>
              </label>
              <label className="color-well flower-color" style={{ backgroundColor: settings.flowerColors[flower.id] }}>
                <input
                  type="color"
                  aria-label={`${flower.label} flower color`}
                  value={settings.flowerColors[flower.id]}
                  onChange={(event) => update({
                    flowerColors: { ...settings.flowerColors, [flower.id]: event.target.value },
                  })}
                />
              </label>
            </div>
          ))}
        </div>
        <button className="reset-flower-colors" onClick={() => update({ flowerColors: { ...defaultFlowerColors } })}>
          Reset flower colors
        </button>
        <p className="help-text">Keep at least one selected. The seed picks up to four varieties per garden. Spring and autumn may show buds or seed heads.</p>
      </Section>
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
