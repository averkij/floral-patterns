import { useEffect, useRef } from 'react';
import { Icon } from './Controls';

export default function FieldNotes({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="notes-dialog"
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="notes-body">
        <button
          className="notes-close icon-button"
          aria-label="Close field notes"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <h2>Notes from the garden.</h2>
        <p>
          Two ways of finding order in a little wildness. Every specimen is generated from its seed;
          a saved link lets you return to it.
        </p>
        <h3>01 / Page garden</h3>
        <p>
          The actual{' '}
          <a href="https://github.com/kevinraymond/florilegium" target="_blank" rel="noreferrer">
            Florilegium
          </a>{' '}
          Lua engine grows plants into free space. Our framing adapter composes four margins around
          your rectangle on an A4 page. Visitors are permitted individually; their arrival depends
          on the seed. Disabling one can leave the space it would have occupied.
        </p>
        <h3>02 / Shape & letter</h3>
        <p>
          An independent implementation inspired by{' '}
          <a
            href="https://www.media.mit.edu/projects/non-overlapping-floral-patterns/overview/"
            target="_blank"
            rel="noreferrer"
          >
            Lingdong Huang’s method
          </a>
          : distribute points, divide space into cells, route vines along their edges, then fit
          flowers and leaves. The letter is converted to contours, so its font is preserved in your
          SVG.
        </p>
        <p>
          Our method is an experiment, not a reproduction of the Dither program. Cell allocation
          limits overlap; fine stems and strokes can still touch. Outline clipping preserves the
          selected region.
        </p>
        <h3>A few useful habits</h3>
        <p>
          Drag or resize the page frame, or use its dimensions. In Draw mode, trace a closed region
          with your pointer. Color and setting changes grow a new proof automatically. “Grow a new
          variation” changes the seed. Export includes the artwork and paper, without editing
          guides.
        </p>
        <div className="notes-links">
          <a
            href="https://github.com/averkij/floral-patterns/tree/main/docs/knowledge"
            target="_blank"
            rel="noreferrer"
          >
            Research & references <Icon name="external" size={14} />
          </a>
          <a
            href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.md`}
            target="_blank"
            rel="noreferrer"
          >
            Credits & licenses <Icon name="external" size={14} />
          </a>
        </div>
      </div>
    </dialog>
  );
}
