import { constrainRect, type PageConfig, type Visitor } from '../state';
import { Check, ColorControls, Section, SeedControl, Slider } from './Controls';
import { FLOWERS, defaultFlowerColors } from '../flowers';
import FlowerGlyph from './FlowerGlyph';
import VisitorGlyph from './VisitorGlyph';

const visitors: [Visitor, string][] = [
  ['butterfly', 'Бабочки'],
  ['bee', 'Пчёлы'],
  ['bird', 'Птицы'],
  ['snail', 'Улитки'],
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
      <Section title="Композиция">
        <SeedControl seed={settings.seed} onChange={(seed) => update({ seed })} />
        <Slider
          label="Плотность"
          percent
          value={settings.density}
          min={0.2}
          max={1}
          step={0.05}
          onChange={(density) => update({ density })}
        />
        <div className="growth-controls">
          <Check label="Анимация" checked={watchGrowth} onChange={onWatchGrowth} />
          <button onClick={onReplay} disabled={replayDisabled} aria-label="Повторить анимацию">
            Повтор
          </button>
        </div>
      </Section>
      <ColorControls palette={settings} onChange={update} />
      <Section title="Цветы" action={
        <button className="text-button" onClick={() => update({ flowerColors: { ...defaultFlowerColors } })}>Сбросить цвета</button>
      }>
        <div className="flower-grid" role="group" aria-label="Виды цветов">
          {FLOWERS.map(flower => (
            <div className="flower-tile" key={flower.id}>
              <button className="flower-select"
                aria-pressed={settings.flowers.includes(flower.id)}
                aria-label={flower.label}
                aria-disabled={settings.flowers.length === 1 && settings.flowers[0] === flower.id}
                title={settings.flowers.length === 1 && settings.flowers[0] === flower.id ? 'Оставьте хотя бы один вид' : flower.label}
                onClick={() => {
                  if (settings.flowers.length === 1 && settings.flowers[0] === flower.id) return;
                  update({ flowers: FLOWERS.filter(f => f.id === flower.id
                    ? !settings.flowers.includes(f.id) : settings.flowers.includes(f.id)).map(f => f.id) });
                }}>
                <FlowerGlyph flower={flower.id} color={settings.flowerColors[flower.id]} />
                <span className="flower-name">{flower.label}</span>
                {settings.flowers.includes(flower.id) && <span className="flower-selected" aria-hidden="true">✓</span>}
              </button>
              <label className="color-well flower-color" title={`Цвет: ${flower.label}`} style={{ backgroundColor: settings.flowerColors[flower.id] }}>
                <input
                  type="color"
                  aria-label={`Цвет: ${flower.label}`}
                  value={settings.flowerColors[flower.id]}
                  onChange={(event) => update({
                    flowerColors: { ...settings.flowerColors, [flower.id]: event.target.value },
                  })}
                />
              </label>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Стиль">
        <div className="segmented" role="group" aria-label="Время года">
          {(['spring', 'summer', 'autumn'] as const).map(season =>
            <button key={season} aria-pressed={settings.season === season} onClick={() => update({ season })}>
              {{ spring: 'Весна', summer: 'Лето', autumn: 'Осень' }[season]}
            </button>)}
        </div>
      </Section>
      <Section title="Объекты">
        <div className="flower-grid visitor-options" role="group" aria-label="Объекты">
          {visitors.map(([key, label]) => (
            <button className="flower-select visitor-select"
              key={key}
              aria-label={label}
              aria-pressed={settings.visitors.includes(key)}
              onClick={() =>
                update({
                  visitors: settings.visitors.includes(key)
                    ? settings.visitors.filter(v => v !== key)
                    : [...settings.visitors, key],
                })
              }
            >
              <VisitorGlyph visitor={key} />
              <span className="flower-name">{label}</span>
              {settings.visitors.includes(key) && <span className="flower-selected" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Область текста">
        <button className="edit-page-text" onClick={() => document.getElementById('page-text')?.focus()}>Редактировать текст</button>
        <div className="dimension-grid">
          {(['width', 'height', 'x', 'y'] as const).map((key) => (
            <label key={key}>
              <span>{{ width: 'Ширина', height: 'Высота', x: 'Слева', y: 'Сверху' }[key]}</span>
              <div>
                <input
                  aria-label={`Область: ${{ width: 'ширина', height: 'высота', x: 'слева', y: 'сверху' }[key]}`}
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
                <span>мм</span>
              </div>
            </label>
          ))}
        </div>
        <Check
          label="Рамка"
          checked={settings.showFrame}
          onChange={(showFrame) => update({ showFrame })}
        />
      </Section>
    </>
  );
}
