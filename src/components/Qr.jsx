import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

/** Código QR (SVG) de un texto o link. Se dibuja en el teléfono, sin internet. */
export default function Qr({ texto, size = 220, className = '', titulo = 'Código QR' }) {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(texto || '');
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { d, n: n + 8 };
  }, [texto]);
  return (
    <svg className={`qr ${className}`} viewBox={`0 0 ${path.n} ${path.n}`} width={size} height={size} role="img" aria-label={titulo} shapeRendering="crispEdges">
      <rect width={path.n} height={path.n} fill="#fff" />
      <path d={path.d} fill="#000" />
    </svg>
  );
}
