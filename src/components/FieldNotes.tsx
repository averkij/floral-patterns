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
          Lua engine grows plants into free space. Our framing adapter grows one garden around
          your rectangle on an A4 page. Visitors are permitted individually; their arrival depends
          on the seed. Disabling one can leave the space it would have occupied.
        </p>
        <p>
          Watch growth follows Florilegium’s timed stems, opening flowers and arriving visitors.
          Replay grows the same seed again; turn Watch growth off for a quicker finished proof.
        </p>
        <h3>02 / Shape & letter</h3>
        <p>
          A TypeScript port of{' '}
          <a
            href="https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/orntxt.dh"
            target="_blank"
            rel="noreferrer"
          >
            Lingdong Huang’s orntxt program
          </a>
          : place weighted points, relax the cells, route winding vines, then construct curved
          leaves, buds and fan-shaped flowers. The letter becomes contours, so the exported SVG does
          not depend on its font.
        </p>
        <p>
          Whole motifs are fitted before drawing, keeping their petal and leaf edges intact. Very
          narrow regions can leave gaps. Browser geometry and sampling differ from the source; fine
          stems can still touch.
        </p>
        <h3>A few useful habits</h3>
        <p>
          Drag or resize the page frame, or use its dimensions. In Draw mode, trace a closed region
          with your pointer. Press “Grow pattern” when your settings are ready; moving the frame
          does not restart growth. Change the seed for a new variation. Zoom enlarges the preview;
          Fit brings the whole sheet back into view. Export includes the artwork and paper at its
          original size, without editing guides.
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
