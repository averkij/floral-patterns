import type { Flower } from '../flowers';

/** Code-native previews of the eight illustrated blooms; inherit the chosen color. */
export default function FlowerGlyph({ flower, color }: { flower: Flower; color: string }) {
  const petals = (count: number, length: number, width: number, offset = 0, base = 0) =>
    Array.from({ length: count }, (_, i) => (
      <path key={`${count}-${i}`} transform={`rotate(${i * 360 / count + offset}) translate(0 ${-base})`}
        d={`M0 0 C${-width} ${-length * .3} ${-width} ${-length * .85} 0 ${-length} C${width} ${-length * .85} ${width} ${-length * .3} 0 0`}
        fill="currentColor" stroke="currentColor" strokeWidth=".5" opacity={.72 + (i % 3) * .12} />
    ));
  let bloom;
  if (flower === 'rose') bloom = <>
    {petals(7, 25, 16)}<g fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.2">
      <path d="M-17-8C-21 8-8 18 6 14C22 10 19-9 6-15C-6-21-15-7-10 3C-6 11 7 11 10 2C13-7 0-12-5-5C-9 3 3 8 5 1" />
    </g><circle r="5" fill="currentColor" /><circle r="4" fill="#301020" opacity=".2" />
  </>;
  else if (flower === 'tiger-lily') bloom = <>
    {petals(6, 26, 7)}{Array.from({ length: 6 }, (_, i) => <g key={i} transform={`rotate(${i * 60})`}>
      <path d="M0-5L2-16" stroke="#76502b" strokeWidth=".8" />
      <circle cx="2" cy="-16" r="1.5" fill="#5b3424" />
      <circle cx="-2" cy="-20" r=".8" fill="#5b3424" /><circle cx="2" cy="-23" r=".7" fill="#5b3424" />
    </g>)}
  </>;
  else if (flower === 'tulip') bloom = <>
    <path d="M0 6V29M0 24Q-15 19-14 9Q0 14 0 24M0 28Q14 20 13 13" fill="#789576" stroke="#789576" strokeWidth="2" />
    <path d="M0 13C-22 9-22-13-18-24L-6-15L0-27L7-15L19-24C23-6 17 10 0 13Z" fill="currentColor" />
    <path d="M0 12C-9 1-11-14 0-26C11-14 10 1 0 12" fill="#fff" opacity=".22" />
  </>;
  else if (flower === 'snowdrop') bloom = <>
    <path d="M-9 28C-6 5-11-22 5-24C19-25 18-12 13-8M-9 28Q-21 17-17 5M-9 28Q5 14 5 3" fill="none" stroke="#789576" strokeWidth="2" />
    <g transform="translate(11 -9) rotate(170)">
      <path d="M0 0C-17 8-15 23-10 29C-4 25 1 12 0 0M0 0C17 8 15 23 10 29C4 25-1 12 0 0M0 0C-9 12-6 23 0 26C6 23 9 12 0 0" fill="currentColor" stroke="#aab5a5" strokeWidth=".7" />
      <path d="M-3 8L0 13L3 8" fill="none" stroke="#7b976b" strokeWidth="2" />
    </g>
  </>;
  else if (flower === 'pansy') bloom = <>
    {[-40, 40, -105, 105, 180].map((angle, i) => <g key={angle} transform={`rotate(${angle})`}>
      <ellipse cy="-12" rx="12" ry="15" fill="currentColor" />
      <ellipse cy="-12" rx="12" ry="15" fill="#fff" opacity={i > 1 ? .2 : 0} />
      {i > 1 && <path d="M0 0Q-10-17 0-14Q10-17 0 0" fill="#302238" opacity=".75" />}
    </g>)}<circle r="3" fill="#edcb58" />
  </>;
  else bloom = <>
    {petals(flower === 'aster' ? 27 : flower === 'sunflower' ? 21 : 16, 21, flower === 'aster' ? 2 : 4, 0, 5)}
    {flower === 'bachelors-button' && petals(15, 18, 3, 12)}
    <circle r={flower === 'sunflower' ? 11 : 5} fill={flower === 'bachelors-button' ? 'currentColor' : flower === 'sunflower' ? '#654627' : '#dcaf39'} />
    {flower === 'sunflower' && Array.from({ length: 35 }, (_, i) => <circle key={i}
      cx={Math.cos(i * 2.4) * Math.sqrt(i / 35) * 9} cy={Math.sin(i * 2.4) * Math.sqrt(i / 35) * 9}
      r=".8" fill="#bc9652" />)}
  </>;
  return <svg className="flower-glyph" viewBox="0 0 64 64" aria-hidden="true" style={{ color }}><g transform="translate(32 32)">{bloom}</g></svg>;
}
