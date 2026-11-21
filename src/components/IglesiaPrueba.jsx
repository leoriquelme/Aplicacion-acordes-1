import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { FilaAbre } from './Comunicacion.jsx';
import Icon from './Icon.jsx';

/** Solo en la iglesia PRUEBA y solo para el Administrador: llenar con datos inventados o reiniciar. */
export default function IglesiaPrueba() {
  const { isTest, can, fillTestData, resetTestChurch } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  if (!isTest || !can.users) return null;

  const run = async (fn, ok) => {
    setBusy(true);
    setMsg('Trabajando…');
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(`No se pudo: ${e.message}`);
    }
    setBusy(false);
    setConfirmar(false);
  };

  return (
    <FilaAbre label={<><Icon name="sparkle" /> Iglesia de prueba</>}>
      <div className="row gap wrap">
        <button className="btn primary" disabled={busy} onClick={() => run(fillTestData, '✓ Listo: 15 hermanos, 20 canciones y 13 cultos con voluntarios.')}>
          Llenar con datos
        </button>
        {!confirmar ? (
          <button className="btn danger ghost" disabled={busy} onClick={() => setConfirmar(true)}>Reiniciar</button>
        ) : (
          <>
            <span className="small">¿Borrar todo?</span>
            <button className="btn danger-solid small" disabled={busy} onClick={() => run(resetTestChurch, '✓ Reiniciada: la iglesia de prueba quedó vacía.')}>Sí, borrar</button>
            <button className="btn ghost small" onClick={() => setConfirmar(false)}>Cancelar</button>
          </>
        )}
      </div>
      {msg && <p className="small" style={{ marginTop: '0.5rem' }}>{msg}</p>}
    </FilaAbre>
  );
}
