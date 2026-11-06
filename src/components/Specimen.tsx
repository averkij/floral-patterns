import { useRef, useState, type PointerEvent } from 'react';
import { clamp, constrainRect, type PageConfig, type Rect, type ShapeConfig } from '../state';
import type { PageTimeline } from '../engines/page-engine';
import { useSvgUrl } from '../useSvgUrl';
import PageGrowthPreview from './PageGrowthPreview';
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
  const url = useSvgUrl(svg),
    surface = useRef<SVGSVGElement>(null);
  const drag = useRef<{ startX: number; startY: number; rect: Rect; handle: string } | null>(null);
  const { rect } = settings;
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
      <div className="page-label">A4 / 210 × 297 mm</div>
      <div className="page-with-ruler">
        <div className="ruler" aria-hidden="true">
          {[0, 50, 100, 150, 200, 250, 297].map((n) => (
            <span key={n} style={{ top: `${(n / 297) * 100}%` }}>
              {n}
            </span>
          ))}
        </div>
        <div className="a4-paper" style={{ backgroundColor: settings.paper }}>
          {url ? (
            <img
              className="pattern-image"
              src={url}
              alt="Generated A4 floral garden surrounding a reserved rectangle"
              draggable={false}
            />
          ) : !timeline ? (
            <div className="empty-specimen">
              <span>
                Every garden begins
                <br />
                with a little space.
              </span>
            </div>
          ) : null}
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
                aria-label="Move reserved rectangle. Use arrow keys, or edit dimensions in Reserved space."
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
              <text
                x={rect.x + rect.width / 2}
                y={rect.y + rect.height / 2}
                textAnchor="middle"
                className="reserved-label"
              >
                A little space for possibility.
              </text>
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
        </div>
      </div>
      <div className="specimen-caption">
        <span>Seed {String(settings.seed).padStart(4, '0')}</span>
        <span>Drag the frame to reserve space</span>
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
      <div className="artboard-top">
        <span>
          {settings.kind === 'text'
            ? `Letter / ${settings.text || '—'}`
            : settings.kind === 'custom'
              ? 'Your outline'
              : `Shape / ${settings.kind}`}
        </span>
        <span>{settings.showCells ? 'Cell structure' : '800 × 800'}</span>
      </div>
      <div
        className={`shape-paper ${drawing ? 'drawing' : ''}`}
        style={{ backgroundColor: settings.paper }}
      >
        {url ? (
          <img
            className="pattern-image"
            src={url}
            alt="Floral pattern filling the selected shape"
            draggable={false}
          />
        ) : (
          <div className="empty-specimen">
            <span>
              {drawing ? 'Draw a space for something beautiful.' : 'An outline, ready to bloom.'}
            </span>
          </div>
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
              setHint('Draw a little larger so the flowers have room.');
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
            {hint || 'Drag to draw. Release to close the outline.'}
          </div>
        )}
      </div>
      <div className="specimen-caption">
        <span>Seed {String(settings.seed).padStart(4, '0')}</span>
        <span>
          {drawing
            ? 'Your next garden starts here'
            : 'Choose a shape, type a letter, or draw your own.'}
        </span>
      </div>
    </div>
  );
}
