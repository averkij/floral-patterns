import { useEffect, useState } from 'react';

/** Keep generated SVG outside React's DOM tree and release superseded image data. */
export function useSvgUrl(svg: string) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!svg) {
      setUrl('');
      return;
    }
    const next = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [svg]);
  return url;
}
