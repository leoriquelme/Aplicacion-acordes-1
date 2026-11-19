import { useEffect, useState } from 'react';

/**
 * Botón ✕ que pide dos clics: el primero lo pone en rojo ("¿Quitar?"),
 * el segundo confirma. Si no se confirma en 3 segundos, vuelve a la normalidad.
 */
export default function ConfirmX({ label, onConfirm, disabled = false, className = 'mini x', text = '✕', armedText = '¿Quitar?' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      className={`${className} ${armed ? 'armed' : ''}`}
      aria-label={armed ? `Confirmar: ${label}` : label}
      title={armed ? 'Haz clic otra vez para confirmar' : label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? armedText : text}
    </button>
  );
}
