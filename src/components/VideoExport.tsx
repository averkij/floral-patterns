import { useEffect, useRef, useState } from 'react';
import type { PageTimeline } from '../engines/page-types';
import type { VideoFormat } from '../video-export';

const save = (url: string, filename: string) => {
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
};

export default function VideoExport({ timeline, disabled, seed }: {
  timeline?: PageTimeline; disabled: boolean; seed: number;
}) {
  const [format, setFormat] = useState<VideoFormat | null>();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState({ percent: 0, stage: '' });
  const [error, setError] = useState('');
  const [ready, setReady] = useState<{ url: string; filename: string } | null>(null);
  const operation = useRef<AbortController | null>(null);
  const savedUrl = useRef('');

  useEffect(() => {
    if (!timeline || disabled || format !== undefined) return;
    let active = true;
    // The encoding library is a separate chunk, loaded only after a page exists.
    void import('../video-export').then(module => module.findVideoFormat()).then(result => {
      if (active) setFormat(result);
    }).catch(() => { if (active) setFormat(null); });
    return () => { active = false; };
  }, [timeline, disabled, format]);

  useEffect(() => {
    setReady(null); setRunning(false); setStatus({ percent: 0, stage: '' }); setError('');
    return () => {
      operation.current?.abort(); operation.current = null;
      if (savedUrl.current) URL.revokeObjectURL(savedUrl.current);
      savedUrl.current = '';
    };
  }, [timeline, disabled]);

  const start = async () => {
    if (disabled || !timeline || !format || operation.current) return;
    if (ready) { save(ready.url, ready.filename); return; }
    const controller = new AbortController();
    operation.current = controller;
    setRunning(true); setError(''); setStatus({ percent: 0, stage: 'Подготавливаем видео' });
    try {
      const { exportGardenVideo } = await import('../video-export');
      controller.signal.throwIfAborted();
      const blob = await exportGardenVideo(timeline, format, controller.signal, (percent, stage) => {
        if (!controller.signal.aborted) setStatus(previous => previous.percent === percent && previous.stage === stage
          ? previous : { percent, stage });
      });
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const filename = `flower-power-${seed}.${format.extension}`;
      savedUrl.current = url;
      setReady({ url, filename }); setStatus({ percent: 100, stage: 'Видео готово' });
      save(url, filename);
    } catch (cause) {
      if (!controller.signal.aborted) {
        console.error('Video export failed.', cause);
        setError('Не удалось создать видео. Попробуйте ещё раз или используйте другой браузер.');
      } else if (operation.current === controller) setStatus({ percent: 0, stage: 'Экспорт отменён' });
    } finally {
      if (operation.current === controller) { operation.current = null; setRunning(false); }
    }
  };
  const label = format ? `Скачать ${format.extension.toUpperCase()}` : 'Скачать видео';
  return <div className="video-export">
    <div className={running ? 'action-pair' : undefined}>
      <button className="video-download" disabled={disabled || !timeline || !format || running} onClick={() => { void start(); }}>
        {running ? `${status.percent}%` : label}
      </button>
      {running && <button onClick={() => operation.current?.abort()}>Отменить</button>}
    </div>
    {running && <progress aria-label="Экспорт видео" max={100} value={status.percent} />}
    {status.stage && <span className="video-status" role="status">{status.stage}</span>}
    {timeline && !disabled && format === null && <span className="video-status">Этот браузер не поддерживает экспорт видео.</span>}
    {timeline && !disabled && format?.extension === 'webm' && <span className="video-status">В этом браузере доступен WebM.</span>}
    {error && <p className="generation-error" role="alert">{error}</p>}
  </div>;
}
