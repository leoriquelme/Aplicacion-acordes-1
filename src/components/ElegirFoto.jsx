import { useRef, useState } from 'react';
import { achicarFoto } from '../lib/foto.js';

/**
 * Botón que abre la cámara o la galería, achica la imagen y la entrega a onFoto(texto).
 * `modo`: 'cubrir' (foto de perfil, recorta al centro) o 'contener' (logo completo).
 */
export default function ElegirFoto({ onFoto, modo = 'cubrir', className = 'btn', label, children }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const elegir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await onFoto(await achicarFoto(file, { modo, lado: modo === 'contener' ? 256 : 192 }));
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
    }
    setBusy(false);
  };
  return (
    <>
      <button type="button" className={className} disabled={busy} aria-label={label} title={label} onClick={() => ref.current?.click()}>
        {busy ? '…' : children}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={elegir} />
      {error && <span className="error small">{error}</span>}
    </>
  );
}
