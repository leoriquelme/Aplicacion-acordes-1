import { versiculoDelDia } from '../data/versiculos.js';

/** Versículo del día (Reina-Valera 1909, sin internet). */
export default function VersiculoDelDia() {
  const verso = versiculoDelDia();
  return (
    <section className="card versiculo">
      <p className="muted small">Versículo del día</p>
      <blockquote>{verso.texto}</blockquote>
      <cite>{verso.cita}</cite> <span className="muted small">· RV 1909</span>
    </section>
  );
}
