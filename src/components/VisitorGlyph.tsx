import type { Visitor } from '../state';

/** Small original vector illustrations, sharing the flower selectors' visual scale. */
export default function VisitorGlyph({ visitor }: { visitor: Visitor }) {
  return <svg className="flower-glyph" viewBox="0 0 64 64" aria-hidden="true">
    {visitor === 'butterfly' && <g stroke="#755746" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M31 28C8-3 2 20 12 33C-1 50 23 57 31 36M33 28C56-3 62 20 52 33C65 50 41 57 33 36" fill="#df9968" />
      <path d="M28 28C16 9 9 17 17 28M36 28C48 9 55 17 47 28M26 37C13 36 15 48 25 43M38 37C51 36 49 48 39 43" fill="#f7d399" />
      <path d="M30 23Q24 11 22 16M34 23Q40 11 42 16" fill="none" />
      <ellipse cx="32" cy="33" rx="3" ry="14" fill="#675344" />
    </g>}
    {visitor === 'bee' && <g stroke="#665744" strokeWidth="1.2">
      <ellipse cx="26" cy="20" rx="8" ry="12" transform="rotate(-30 26 20)" fill="#e8eff0" />
      <ellipse cx="40" cy="20" rx="8" ry="12" transform="rotate(30 40 20)" fill="#e8eff0" />
      <path d="M28 42L23 49M39 42L44 49M19 29L12 23M20 34L11 37" fill="none" />
      <ellipse cx="35" cy="33" rx="17" ry="12" fill="#e8bc4f" />
      <path d="M29 22Q24 33 29 44M39 22Q35 33 39 44" fill="none" strokeWidth="5" />
      <circle cx="17" cy="31" r="8" fill="#665744" /><circle cx="14" cy="29" r="1.5" fill="#fff" />
      <path d="M52 31L58 33L52 35" fill="#665744" />
    </g>}
    {visitor === 'bird' && <g stroke="#687f89" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M12 34L4 21L21 27C32 9 45 13 48 25L57 29L48 32C43 49 19 48 12 34Z" fill="#8ca8b4" />
      <path d="M16 31Q30 18 38 30Q31 44 16 31Z" fill="#b4c9cc" />
      <path d="M25 44L22 52M34 44L35 52M18 53H26M32 53H40" fill="none" stroke="#8b7454" />
      <path d="M48 25L58 29L48 32" fill="#d6ab59" stroke="#ad8b4a" />
      <circle cx="42" cy="24" r="2" fill="#354750" />
    </g>}
    {visitor === 'snail' && <g stroke="#797855" strokeWidth="1.2" strokeLinecap="round">
      <path d="M7 48Q20 42 40 44Q48 42 50 32Q56 31 56 39Q55 52 42 53H12Z" fill="#b3b893" />
      <circle cx="27" cy="32" r="17" fill="#c3a07b" stroke="#94765a" />
      <path d="M39 33C39 18 16 18 16 32C16 45 35 44 35 33C35 24 23 25 23 32C23 37 30 37 30 32" fill="none" stroke="#94765a" strokeWidth="2" />
      <path d="M51 34L48 24M55 34L59 26" fill="none" />
      <circle cx="48" cy="24" r="2" fill="#797855" /><circle cx="59" cy="26" r="2" fill="#797855" />
    </g>}
  </svg>;
}
