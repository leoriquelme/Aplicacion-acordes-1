import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

/** Botón "+ Nueva canción" (igual a "+ Nuevo evento") que despliega las formas de agregar una canción. */
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
        className="btn primary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        + Nueva canción
      </button>
      {open && (
        <div className="add-menu-panel" role="menu">
          <Link role="menuitem" to="/canciones/nueva"><span className="menu-t"><Icon name="edit" /> Nueva canción</span><span>Escribir desde cero</span></Link>
          <Link role="menuitem" to="/canciones/importar">⤓ Importar<span>Desde un link de LaCuerda o pegando el texto</span></Link>
          {cloud && <Link role="menuitem" to="/canciones/biblioteca"><span className="menu-t"><Icon name="globe" /> De otras iglesias</span><span>Buscar y copiar a tu iglesia</span></Link>}
        </div>
      )}
    </div>
  );
}
