import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/** Botón cuadrado "+" que despliega las formas de agregar una canción. */
export default function AddMenu({ cloud }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="add-menu" ref={ref}>
      <button
        className="btn primary square"
        aria-label="Agregar canción"
        aria-expanded={open}
        title="Agregar canción"
        onClick={() => setOpen(!open)}
      >
        {open ? '✕' : '+'}
      </button>
      {open && (
        <div className="add-menu-panel" role="menu">
          <Link role="menuitem" to="/canciones/nueva">✏️ Nueva canción<span>Escribir desde cero</span></Link>
          <Link role="menuitem" to="/canciones/importar">⤓ Importar<span>Pegar letra y acordes de una página web</span></Link>
          {cloud && <Link role="menuitem" to="/canciones/biblioteca">🌐 De otras iglesias<span>Buscar y copiar a tu iglesia</span></Link>}
        </div>
      )}
    </div>
  );
}
