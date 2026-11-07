import { useRef, useState, type PointerEvent } from 'react';
import { clamp, constrainRect, type PageConfig, type Rect, type ShapeConfig } from '../state';
import type { PageTimeline } from '../engines/page-engine';
import { useSvgUrl } from '../useSvgUrl';
import PageGrowthPreview from './PageGrowthPreview';
import { layoutPageText, normalizePageText, PAGE_TEXT_FONT, PAGE_TEXT_LIMIT, withoutPageText } from '../page-text';
export function PageSpecimen({
  settings,
  svg,
  update,
  onDragging,
  timeline,
  onPlaybackComplete,
  onPlaybackProgress,
}: {
  settings: PageConfig;
  svg: string;
  update: (p: Partial<PageConfig>) => void;
  onDragging: (b: boolean) => void;
  timeline: PageTimeline | null;
  onPlaybackComplete: () => void;
  onPlaybackProgress: (percent: number) => void;
}) {
  const url = useSvgUrl(withoutPageText(svg)),
    surface = useRef<SVGSVGElement>(null);
  const drag = useRef<{ startX: number; startY: number; rect: Rect; handle: string } | null>(null);
  const { rect } = settings;
  const textLayout = layoutPageText(settings.text, rect);
  const begin = (event: PointerEvent<SVGElement>, handle: string) => {
    event.preventDefault();
    event.stopPropagation();
    surface.current?.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, rect: { ...rect }, handle };
    onDragging(true);
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !surface.current) return;
    const bounds = surface.current.getBoundingClientRect(),
      d = drag.current;
    const dx = ((event.clientX - d.startX) / bounds.width) * 210,
      dy = ((event.clientY - d.startY) / bounds.height) * 297;
    if (d.handle === 'move')
      update({ rect: constrainRect({ ...d.rect, x: d.rect.x + dx, y: d.rect.y + dy }) });
    else {
      let left = d.rect.x,
        top = d.rect.y,
        right = left + d.rect.width,
        bottom = top + d.rect.height;
      if (d.handle.includes('w')) left = clamp(left + dx, 18, right - 40);
      if (d.handle.includes('e')) right = clamp(right + dx, left + 40, 192);
      if (d.handle.includes('n')) top = clamp(top + dy, 18, bottom - 40);
      if (d.handle.includes('s')) bottom = clamp(bottom + dy, top + 40, 279);
      update({ rect: { x: left, y: top, width: right - left, height: bottom - top } });
    }
  };
  const end = () => {
    if (drag.current) {
      drag.current = null;
      onDragging(false);
    }
  };
  return (
    <div className="page-stage">
      <div className="a4-paper" style={{ backgroundColor: settings.paper }}>
        {url && (
          <img
            className="pattern-image"
            src={url}
            alt="Цветочный узор на странице А4 со свободной областью"
            draggable={false}
          />
        )}
        {timeline && (
          <PageGrowthPreview timeline={timeline} onComplete={onPlaybackComplete} onProgress={onPlaybackProgress} />
        )}
        {settings.showFrame && (
          <svg
            className="frame-overlay"
            ref={surface}
            viewBox="0 0 210 297"
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={end}
          >
            <rect
              className="reserved-rect"
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              onPointerDown={(e) => begin(e, 'move')}
              tabIndex={0}
              role="button"
              aria-label="Переместить область текста. Используйте стрелки или поля размеров."
              onKeyDown={(e) => {
                const delta: Record<string, [number, number]> = {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                };
                if (delta[e.key]) {
                  e.preventDefault();
                  const [dx, dy] = delta[e.key];
                  update({
                    rect: constrainRect({
                      ...rect,
                      x: rect.x + dx * (e.shiftKey ? 5 : 1),
                      y: rect.y + dy * (e.shiftKey ? 5 : 1),
                    }),
                  });
                }
              }}
            />
            {(['nw', 'ne', 'se', 'sw'] as const).map((handle) => (
              <rect
                key={handle}
                className={`frame-handle ${handle}`}
                x={(handle.includes('w') ? rect.x : rect.x + rect.width) - 2.1}
                y={(handle.includes('n') ? rect.y : rect.y + rect.height) - 2.1}
                width="4.2"
                height="4.2"
                onPointerDown={(e) => begin(e, handle)}
              />
            ))}
          </svg>
        )}
        <svg className="page-text-layer" viewBox="0 0 210 297">
          <g fill={settings.ink} fontFamily={PAGE_TEXT_FONT} fontSize={textLayout.fontSize} textAnchor="middle" aria-hidden="true">
            {textLayout.lines.map((line, i) => <text key={i} x={textLayout.x} y={textLayout.y + i * textLayout.lineHeight}>{line}</text>)}
          </g>
          <foreignObject x={rect.x + 4} y={rect.y + 4} width={rect.width - 8} height={rect.height - 8}>
            <textarea id="page-text" className="page-text-input" aria-label="Текст на странице"
              title="Нажмите, чтобы ввести текст" placeholder="Введите текст" maxLength={PAGE_TEXT_LIMIT}
              value={settings.text} onChange={e => update({ text: normalizePageText(e.target.value) })}
              style={{ color: settings.ink, backgroundColor: settings.paper, fontFamily: PAGE_TEXT_FONT }} />
          </foreignObject>
        </svg>
      </div>
    </div>
  );
}

export function ShapeSpecimen({
  settings,
  svg,
  outline,
  drawing,
  onFinish,
}: {
  settings: ShapeConfig;
  svg: string;
  outline: string;
  drawing: boolean;
  onFinish: (points: [number, number][]) => void;
}) {
  const url = useSvgUrl(svg),
    surface = useRef<SVGSVGElement>(null),
    down = useRef(false);
  const pointsRef = useRef<[number, number][]>([]),
    [points, setPoints] = useState<[number, number][]>([]),
    [hint, setHint] = useState('');
  const point = (e: PointerEvent<SVGSVGElement>): [number, number] => {
    const b = surface.current!.getBoundingClientRect();
    return [
      clamp(((e.clientX - b.left) / b.width) * 800, 20, 780),
      clamp(((e.clientY - b.top) / b.height) * 800, 20, 780),
    ];
  };
  return (
    <div className="shape-stage">
      <div
        className={`shape-paper ${drawing ? 'drawing' : ''}`}
        style={{ backgroundColor: settings.paper }}
      >
        {url && (
          <img
            className="pattern-image"
            src={url}
            alt="Цветочный узор внутри выбранной фигуры"
            draggable={false}
          />
        )}
        <svg
          className={`shape-overlay ${drawing ? 'active' : ''}`}
          ref={surface}
          viewBox="0 0 800 800"
          onPointerDown={(e) => {
            if (!drawing) return;
            down.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            pointsRef.current = [point(e)];
            setPoints(pointsRef.current);
            setHint('');
          }}
          onPointerMove={(e) => {
            if (!down.current) return;
            const next = point(e),
              last = pointsRef.current.at(-1)!;
            if (Math.hypot(next[0] - last[0], next[1] - last[1]) < 5) return;
            pointsRef.current = [...pointsRef.current, next];
            setPoints(pointsRef.current);
          }}
          onPointerUp={() => {
            if (!down.current) return;
            down.current = false;
            const p = pointsRef.current,
              area = Math.abs(
                p.reduce((a, v, i) => {
                  const n = p[(i + 1) % p.length];
                  return a + v[0] * n[1] - n[0] * v[1];
                }, 0) / 2,
              );
            if (p.length < 3 || area < 2500) {
              setHint('Нарисуйте контур побольше, чтобы хватило места для цветов.');
              setPoints([]);
              return;
            }
            const stride = Math.max(1, Math.ceil(p.length / 110));
            onFinish(p.filter((_, i) => i % stride === 0));
            setPoints([]);
          }}
          onPointerCancel={() => {
            down.current = false;
            setPoints([]);
          }}
        >
          {settings.showOutline && outline && !drawing && (
            <path
              d={outline}
              fill="none"
              stroke="#626b4d"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />
          )}
          {drawing && points.length > 1 && (
            <polygon
              points={points.map((p) => p.join(',')).join(' ')}
              fill="#626b4d18"
              stroke="#626b4d"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}
        </svg>
        {drawing && (
          <div className="drawing-instruction">
            {hint || 'Рисуйте, удерживая кнопку. Отпустите, чтобы замкнуть контур.'}
          </div>
        )}
      </div>
    </div>
  );
}
