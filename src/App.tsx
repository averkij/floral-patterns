import { useEffect, useState } from 'react';
import { Actions } from './components/Controls';
import PageInspector from './components/PageInspector';
import ShapeInspector from './components/ShapeInspector';
import { PageSpecimen, ShapeSpecimen } from './components/Specimen';
import CanvasViewport from './components/CanvasViewport';
import { loadState, serializeState, type PageConfig, type ShapeConfig } from './state';
import { useGeneration } from './useGeneration';

export default function App() {
  const [state, setState] = useState(loadState),
    [drawing, setDrawing] = useState(false),
    [dragging, setDragging] = useState(false),
    [watchGrowth, setWatchGrowth] = useState(
      () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
    [shareLabel, setShareLabel] = useState('Copy link');
  const { output, timeline, finishPlayback, playbackProgress, busy, status, error, current, generate, replay } = useGeneration(
    state,
    dragging || (state.tab === 'shape' && drawing),
    watchGrowth,
  );
  const page = state.tab === 'page';
  const updatePage = (patch: Partial<PageConfig>) =>
    setState((previous) => ({ ...previous, page: { ...previous.page, ...patch } }));
  const updateShape = (patch: Partial<ShapeConfig>) => {
    if (patch.kind && patch.kind !== 'custom') setDrawing(false);
    setState((previous) => ({ ...previous, shape: { ...previous.shape, ...patch } }));
  };
  useEffect(() => {
    const listener = () => {
      setState(loadState());
      setDrawing(false);
      setDragging(false);
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    if (shareLabel === 'Copy link') return;
    const timer = setTimeout(() => setShareLabel('Copy link'), 3000);
    return () => clearTimeout(timer);
  }, [shareLabel]);
  const grow = () => {
    setDrawing(false);
    generate();
  };
  const share = async () => {
    const hash = serializeState(state),
      url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.history.replaceState(null, '', hash);
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel('Link copied');
    } catch {
      setShareLabel('Link in address bar');
    }
  };
  const download = () => {
    if (!output.svg || busy || !current) return;
    const blob = URL.createObjectURL(new Blob([output.svg], { type: 'image/svg+xml' }));
    const anchor = document.createElement('a');
    anchor.href = blob;
    anchor.download = `floralia-${page ? 'page' : 'shape'}-${page ? state.page.seed : state.shape.seed}.svg`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(blob), 1000);
  };
  return (
    <div className="studio-shell">
      <header className="masthead">
        <h1 className="wordmark">Algo Floral Patterns</h1>
      </header>
      <nav className="workspace-tabs" aria-label="Experiments">
        <button
          className={page ? 'active' : ''}
          aria-current={page ? 'page' : undefined}
          onClick={() => {
            setDrawing(false);
            setDragging(false);
            setState((previous) => ({ ...previous, tab: 'page' }));
          }}
        >
          <span>01</span> Page garden
        </button>
        <button
          className={!page ? 'active' : ''}
          aria-current={!page ? 'page' : undefined}
          onClick={() => {
            setDrawing(false);
            setDragging(false);
            setState((previous) => ({ ...previous, tab: 'shape' }));
          }}
        >
          <span>02</span> Shape & letter
        </button>
      </nav>
      <main className="studio-main">
        <section
          className={`workspace ${page ? 'page-workspace' : 'shape-workspace'}`}
          aria-label={page ? 'Page garden workspace' : 'Shape and letter workspace'}
        >
          <CanvasViewport kind={page ? 'page' : 'shape'}>
            {page ? (
              <PageSpecimen
                settings={state.page}
                svg={output.svg}
                update={updatePage}
                onDragging={setDragging}
                timeline={timeline}
                onPlaybackComplete={finishPlayback}
                onPlaybackProgress={playbackProgress}
              />
            ) : (
              <ShapeSpecimen
                settings={state.shape}
                svg={output.svg}
                outline={output.outline}
                drawing={drawing}
                onFinish={(points) => {
                  updateShape({ points, kind: 'custom' });
                  setDrawing(false);
                }}
              />
            )}
          </CanvasViewport>
        </section>
        <aside className="inspector" aria-label="Pattern settings">
          <div className="inspector-fields">
            {page ? (
              <PageInspector
                settings={state.page}
                update={updatePage}
                watchGrowth={watchGrowth}
                onWatchGrowth={setWatchGrowth}
                onReplay={replay}
                replayDisabled={busy || !watchGrowth || dragging || !current}
              />
            ) : (
              <ShapeInspector
                settings={state.shape}
                update={updateShape}
                drawing={drawing}
                onDraw={() => setDrawing(true)}
              />
            )}
          </div>
          <span className="sr-only" role="status">{busy ? status : ''}</span>
          {error && <p className="generation-error" role="alert">{error}</p>}
          <Actions
            busy={busy}
            growDisabled={dragging}
            hasOutput={Boolean(output.svg) && current}
            onGrow={grow}
            onExport={download}
            onShare={share}
            shareLabel={shareLabel}
          />
        </aside>
      </main>
    </div>
  );
}
