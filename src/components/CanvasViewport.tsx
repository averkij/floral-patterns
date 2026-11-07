import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import './CanvasViewport.css';

type CanvasKind = 'page' | 'shape';
type ZoomState = Record<CanvasKind, number | null>;
const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 175, 200];

/** Preview sizing only. The specimen still receives its original SVG and settings. */
export default function CanvasViewport({ kind, children }: { kind: CanvasKind; children: ReactNode }) {
  const [zoomByKind, setZoomByKind] = useState<ZoomState>({ page: null, shape: null });
  const [fitPercent, setFitPercent] = useState(50);
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pendingCenter = useRef<{ x: number; y: number } | null>(null);
  const previousKind = useRef(kind);
  const zoom = zoomByKind[kind];
  const fitting = zoom === null;
  const baseWidth = kind === 'page' ? 794 : 800;
  const effectiveZoom = zoom ?? fitPercent;

  useEffect(() => {
    if (!fitting) return;
    const specimen = stage.current?.firstElementChild;
    if (!specimen) return;
    const measure = () => setFitPercent(Math.round(specimen.getBoundingClientRect().width / baseWidth * 100));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(specimen);
    return () => observer.disconnect();
  }, [baseWidth, fitting, kind]);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    if (previousKind.current !== kind || fitting) {
      element.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    } else if (pendingCenter.current) {
      const center = pendingCenter.current;
      element.scrollLeft = center.x * element.scrollWidth - element.clientWidth / 2;
      element.scrollTop = center.y * element.scrollHeight - element.clientHeight / 2;
    }
    previousKind.current = kind;
    pendingCenter.current = null;
  }, [kind, zoom, fitting]);

  const changeZoom = (next: number) => {
    const element = viewport.current;
    if (element) {
      pendingCenter.current = {
        x: 0.5,
        y: (element.scrollTop + element.clientHeight / 2) / element.scrollHeight,
      };
    }
    setZoomByKind(previous => ({ ...previous, [kind]: Math.max(25, Math.min(200, next)) }));
  };

  const fit = () => {
    pendingCenter.current = null;
    setZoomByKind(previous => ({ ...previous, [kind]: null }));
    viewport.current?.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  };

  const step = (direction: -1 | 1) => {
    const actual = fitting && stage.current?.firstElementChild
      ? stage.current.firstElementChild.getBoundingClientRect().width / baseWidth * 100
      : effectiveZoom;
    const next = direction > 0
      ? ZOOM_LEVELS.find(level => level > actual + 0.5) ?? 200
      : [...ZOOM_LEVELS].reverse().find(level => level < actual - 0.5) ?? 25;
    changeZoom(next);
  };

  const style = zoom === null ? undefined : { '--canvas-preview-width': `${baseWidth * zoom / 100}px` } as CSSProperties;

  return (
    <div className={`canvas-viewport canvas-viewport-${kind} ${fitting ? 'is-fit' : 'is-zoomed'}`} style={style}>
      <div
        className="canvas-scrollport"
        ref={viewport}
        role="region"
        aria-label={`${kind === 'page' ? 'Цветочник А4' : 'Заполнение формы'}: предпросмотр${fitting ? '' : `, масштаб ${zoom}%, доступна прокрутка`}`}
        tabIndex={0}
      >
        <div className="canvas-scroll-content">
          <div className="canvas-zoom-controls" role="group" aria-label="Масштаб холста">
            <button type="button" onClick={() => step(-1)} disabled={effectiveZoom <= 25} aria-label="Уменьшить" title="Уменьшить">−</button>
            <select
              aria-label="Масштаб"
              value={zoom === null ? 'fit' : String(zoom)}
              onChange={event => event.target.value === 'fit' ? fit() : changeZoom(Number(event.target.value))}
            >
              <option value="fit">{fitPercent}%</option>
              {ZOOM_LEVELS.map(level => <option value={level} key={level}>{level}%</option>)}
            </select>
            <button type="button" onClick={() => step(1)} disabled={effectiveZoom >= 200} aria-label="Увеличить" title="Увеличить">+</button>
          </div>
          <div className="canvas-stage-host" ref={stage}>{children}</div>
        </div>
      </div>
    </div>
  );
}
