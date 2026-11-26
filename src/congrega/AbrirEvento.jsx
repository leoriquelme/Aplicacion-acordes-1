// Abrir un evento de asistencia eligiendo su tipo y nombre (Culto dominical, Día de oración, Jóvenes…).
import { useState } from 'react';
import { todayISO } from '../lib/dates.js';
import { TIPOS_EVENTO, eventoNuevo, nombrePorDefecto, tipoEvento, tipoSugerido } from './eventos.js';

/** Formulario de tipo + nombre. Si no se toca el nombre, sigue al tipo elegido. */
function CamposEvento({ v, setV, conFecha }) {
  const elegirTipo = (k) => setV({ ...v, tipo: k, nombre: v.tocado ? v.nombre : nombrePorDefecto(k) });
  return (
    <>
      <div className="cg-tipos-evento" role="group" aria-label="Tipo de evento">
        {TIPOS_EVENTO.map((t) => <button key={t.k} type="button" aria-pressed={v.tipo === t.k} onClick={() => elegirTipo(t.k)}>{t.l}</button>)}
      </div>
      <label className="cg-campo">Nombre del evento
        <input value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value, tocado: true })} placeholder="Ej.: Vigilia de oración" maxLength={80} />
      </label>
      {conFecha && (
        <div className="cg-row">
          <label className="cg-campo cg-grow">Fecha<input type="date" value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} /></label>
          <label className="cg-campo cg-grow">Hora (opcional)<input type="time" value={v.hora} onChange={(e) => setV({ ...v, hora: e.target.value })} /></label>
        </div>
      )}
    </>
  );
}

/** Botón "+ Abrir evento" que despliega el formulario. onCreado recibe el id del evento nuevo. */
export function AbrirEvento({ saveEvent, onCreado, principal, texto = '+ Abrir evento' }) {
  const inicial = () => { const fecha = todayISO(); const tipo = tipoSugerido(fecha); return { tipo, nombre: nombrePorDefecto(tipo), fecha, hora: '', tocado: false }; };
  const [v, setV] = useState(null);
  if (!v) return <button type="button" className={`btn${principal ? ' primary' : ''}`} onClick={() => setV(inicial())}>{texto}</button>;
  return (
    <form className="card cg-stack cg-abrir-evento" onSubmit={(e) => {
      e.preventDefault();
      if (!v.fecha) return;
      const id = saveEvent(eventoNuevo(v));
      setV(null);
      if (id) onCreado?.(id);
    }}>
      <strong>Abrir evento</strong>
      <CamposEvento v={v} setV={setV} conFecha />
      <div className="cg-row">
        <button className="btn primary" type="submit">Abrir y registrar asistencia</button>
        <button className="btn ghost" type="button" onClick={() => setV(null)}>Cancelar</button>
      </div>
    </form>
  );
}

/** Cambiar tipo y nombre de un evento ya abierto. */
export function EditarEvento({ ev, saveEvent, onListo }) {
  const [v, setV] = useState({ tipo: tipoEvento(ev), nombre: ev.name || '', tocado: true });
  return (
    <form className="cg-stack cg-abrir-evento" onSubmit={(e) => {
      e.preventDefault();
      saveEvent({ ...ev, tipo: v.tipo, name: v.nombre.trim() || nombrePorDefecto(v.tipo) || 'Evento' });
      onListo();
    }}>
      <CamposEvento v={v} setV={setV} />
      <div className="cg-row">
        <button className="btn primary small" type="submit">Guardar</button>
        <button className="btn ghost small" type="button" onClick={onListo}>Cancelar</button>
      </div>
    </form>
  );
}
