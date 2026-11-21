// Fotos sin costo: se achican en el teléfono y se guardan como texto en la base de datos
// (sin Firebase Storage, que pide registrar una tarjeta).

/** Tamaño máximo del texto de una foto (debe coincidir con las reglas de Firestore). */
export const MAX_FOTO = 60000;

/**
 * Cómo dibujar una imagen de ancho w y alto h en un cuadrado de `lado` px.
 * 'cubrir': recorta al centro (fotos de perfil). 'contener': entra completa (logos).
 */
export function encuadre(w, h, lado, modo = 'cubrir') {
  const escala = modo === 'cubrir' ? Math.max(lado / w, lado / h) : Math.min(lado / w, lado / h);
  const dw = Math.round(w * escala);
  const dh = Math.round(h * escala);
  return { dx: Math.round((lado - dw) / 2), dy: Math.round((lado - dh) / 2), dw, dh };
}

/** ¿Es un texto de foto válido para guardar? */
export function fotoValida(x) {
  return typeof x === 'string' && x.length <= MAX_FOTO && /^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x);
}

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir la imagen.')); };
    img.src = url;
  });
}

/**
 * Achica una imagen elegida por la persona a un cuadrado pequeño (JPEG).
 * Devuelve un texto "data:image/jpeg;base64,…" de menos de MAX_FOTO letras.
 */
export async function achicarFoto(file, { lado = 192, modo = 'cubrir' } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('Elige una imagen.');
  const img = await cargarImagen(file);
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // los logos con fondo transparente quedan sobre blanco
  ctx.fillRect(0, 0, lado, lado);
  const { dx, dy, dw, dh } = encuadre(img.naturalWidth || img.width, img.naturalHeight || img.height, lado, modo);
  ctx.drawImage(img, dx, dy, dw, dh);
  for (const calidad of [0.85, 0.7, 0.55, 0.4]) {
    const data = canvas.toDataURL('image/jpeg', calidad);
    if (fotoValida(data)) return data;
  }
  throw new Error('La imagen es demasiado pesada.');
}
