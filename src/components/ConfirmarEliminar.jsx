import { useEffect, useRef, useState } from 'react';

/**
 * Botón "Eliminar…" que pide confirmación dentro de la misma página
 * (sin la ventanita del navegador, que algunos teléfonos y apps instaladas bloquean).
 * onConfirm borra (puede devolver una promesa): si falla, se muestra el error aquí mismo.
 * onDone se llama después (p. ej. para volver a la lista). Sin internet, Firebase guarda
 * el borrado para cuando vuelva la conexión, así que no se espera más de unos segundos.
 */
export default function ConfirmarEliminar({ text, question, onConfirm, onDone }) {
  const [abierto, setAbierto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const caja = useRef(null);
  // Que la pregunta quede a la vista (en el teléfono, sobre la barra de abajo).
  useEffect(() => { if (abierto) caja.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); }, [abierto]);

  const confirmar = async () => {
    setBusy(true);
    setError('');
    try {
      await Promise.race([onConfirm(), new Promise((r) => { setTimeout(r, 4000); })]);
      onDone?.();
    } catch (e) {
      setError(e?.code === 'permission-denied'
        ? 'Tu perfil en esta iglesia no tiene permiso para eliminar esto.'
        : `No se pudo eliminar: ${e?.message || e}`);
      setBusy(false);
    }
  };

  return (
    <div className="danger-zone" ref={caja}>
      {!abierto ? (
        <button type="button" className="btn danger ghost" onClick={() => setAbierto(true)}>{text}</button>
      ) : (
        <div className="stack">
          <span>{question} Esta acción no se puede deshacer.</span>
          <div className="row gap wrap">
            <button type="button" className="btn danger-solid" disabled={busy} onClick={confirmar}>{busy ? 'Eliminando…' : 'Sí, eliminar'}</button>
            <button type="button" className="btn ghost" disabled={busy} onClick={() => { setAbierto(false); setError(''); }}>Cancelar</button>
          </div>
        </div>
      )}
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}
