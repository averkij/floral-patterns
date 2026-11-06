import { useEffect, useState } from 'react';
import { Actions, Icon } from './components/Controls';
import PageInspector from './components/PageInspector';
import ShapeInspector from './components/ShapeInspector';
import { PageSpecimen, ShapeSpecimen } from './components/Specimen';
import FieldNotes from './components/FieldNotes';
import { loadState, serializeState, type PageConfig, type ShapeConfig } from './state';
import { useGeneration } from './useGeneration';

export default function App() {
  const [state, setState] = useState(loadState),
    [notes, setNotes] = useState(false),
    [drawing, setDrawing] = useState(false),
    [dragging, setDragging] = useState(false),
    [shareLabel, setShareLabel] = useState('Copy link');
  const { output, busy, status, error, current } = useGeneration(
    state,
    dragging || (state.tab === 'shape' && drawing),
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
    const seed = ((page ? state.page.seed : state.shape.seed) % 2147483645) + 1;
    if (page) updatePage({ seed });
    else updateShape({ seed });
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
        <a href={import.meta.env.BASE_URL} className="wordmark" aria-label="Floralia home">
          Floralia
        </a>
        <p>A study in growing ornament</p>
        <button className="notes-trigger" onClick={() => setNotes(true)}>
          Field notes <Icon name="external" size={18} />
        </button>
      </header>
      <nav className="workspace-tabs" aria-label="Experiments">
        <button
          className={page ? 'active' : ''}
          aria-current={page ? 'page' : undefined}
          onClick={() => {
            setDrawing(false);
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
          <div className="workspace-heading">
            <h1>{page ? 'Room to grow.' : 'An outline. A thousand possibilities.'}</h1>
            <p>
              {page
                ? 'Floral borders, composed around your words.'
                : 'Let a shape become a garden.'}
            </p>
          </div>
          <div className="canvas-area">
            {page ? (
              <PageSpecimen
                settings={state.page}
                svg={output.svg}
                update={updatePage}
                onDragging={setDragging}
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
          </div>
          <div
            className={`generation-status ${error ? 'has-error' : ''}`}
            role="status"
            aria-live="polite"
          >
            {busy && <span className="activity" />}
            {error ? (
              <>
                <span>{error}</span>
                <button onClick={grow}>Try another seed</button>
              </>
            ) : busy ? (
              status
            ) : drawing ? (
              'Drawing a new region'
            ) : output.svg ? (
              output.detail
            ) : (
              status
            )}
            <span className="method-name">
              {page ? 'Space-seeking growth' : 'Cell-based composition'}
            </span>
          </div>
        </section>
        <aside className="inspector" aria-label="Pattern settings">
          <div className="inspector-fields">
            {page ? (
              <PageInspector settings={state.page} update={updatePage} />
            ) : (
              <ShapeInspector
                settings={state.shape}
                update={updateShape}
                drawing={drawing}
                onDraw={() => setDrawing(true)}
              />
            )}
          </div>
          <Actions
            busy={busy}
            hasOutput={Boolean(output.svg) && current}
            onGrow={grow}
            onExport={download}
            onShare={share}
            shareLabel={shareLabel}
          />
        </aside>
      </main>
      <footer className="studio-footer">
        <span>Floral patterns / Experiment {page ? '01' : '02'}</span>
        <span>Made of rules. Grown by chance.</span>
      </footer>
      {notes && <FieldNotes onClose={() => setNotes(false)} />}
    </div>
  );
}
