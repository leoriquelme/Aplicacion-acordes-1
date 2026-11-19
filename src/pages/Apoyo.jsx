import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { descargarOracion } from '../lib/recordatorio.js';

const STATS_KEY = 'cancionero-oracion';
const leer = () => { try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { veces: 0, minutos: 0 }; } catch { return { veces: 0, minutos: 0 }; } };
const guardar = (s) => { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* sin espacio */ } };
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Apoyo: un contador para orar y (más adelante) donar. */
export default function Apoyo() {
  const [minutos, setMinutos] = useState(5);
  const [restante, setRestante] = useState(null); // segundos; null = detenido
  const [pausa, setPausa] = useState(false);
  const [stats, setStats] = useState(leer);
  const [hora, setHora] = useState('07:00');
  const [fin, setFin] = useState(false);
  const tick = useRef(null);

  useEffect(() => {
    if (restante === null || pausa) return undefined;
    if (restante <= 0) {
      const s = { veces: stats.veces + 1, minutos: stats.minutos + minutos };
      setStats(s);
      guardar(s);
      setRestante(null);
      setFin(true);
      navigator.vibrate?.([200, 100, 200]);
      return undefined;
    }
    tick.current = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(tick.current);
  }, [restante, pausa]); // eslint-disable-line react-hooks/exhaustive-deps

  const corriendo = restante !== null;
  const total = minutos * 60;
  const progreso = corriendo ? 1 - restante / total : fin ? 1 : 0;

  return (
    <div className="page apoyo">
      <Link to="/ajustes" className="back">← Ajustes</Link>
      <h1>🙏 Apoyo</h1>

      <section className="card oracion">
        <h2>Tiempo de oración</h2>
        <p className="muted small">Elige cuánto tiempo quieres orar. El contador te avisa al terminar.</p>
        <div className="reloj" style={{ '--p': progreso }}>
          <div className="reloj-num" aria-live="polite">{corriendo ? mmss(restante) : fin ? 'Amén 🙏' : mmss(total)}</div>
        </div>
        {!corriendo ? (
          <>
            <div className="row gap wrap center">
              {[1, 5, 10, 15, 30].map((m) => (
                <button key={m} className={`btn small ${minutos === m ? 'primary' : ''}`} onClick={() => { setMinutos(m); setFin(false); }}>{m} min</button>
              ))}
            </div>
            <button className="btn primary big-inline" onClick={() => { setFin(false); setPausa(false); setRestante(minutos * 60); }}>▶ Comenzar a orar</button>
          </>
        ) : (
          <div className="row gap center">
            <button className="btn" onClick={() => setPausa(!pausa)}>{pausa ? '▶ Seguir' : '⏸ Pausa'}</button>
            <button className="btn ghost" onClick={() => { setRestante(null); setPausa(false); }}>Detener</button>
          </div>
        )}
        <p className="muted small center">Has orado {stats.veces} {stats.veces === 1 ? 'vez' : 'veces'} con el contador · {stats.minutos} minutos en total (en este equipo).</p>
      </section>

      <section className="card">
        <h2>Recordatorio diario para orar</h2>
        <p className="muted small">Se agrega a tu calendario y te avisa todos los días a esa hora.</p>
        <div className="row gap wrap">
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn" disabled={!hora} onClick={() => descargarOracion(hora)}>📅 Recordarme cada día</button>
        </div>
      </section>

      <section className="card donar">
        <h2>Donar</h2>
        <p className="muted small">Tu apoyo ayudará a mantener el Cancionero gratis para todas las iglesias.</p>
        <button className="btn big-inline" disabled aria-disabled="true">💝 Donar</button>
        <p className="muted small">Todavía no disponible. Muy pronto.</p>
      </section>
    </div>
  );
}
