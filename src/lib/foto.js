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

// ---------- Encuadrar (zoom y arrastre) antes de guardar ----------

/**
 * Escala con que se ve la imagen (w×h) dentro del visor de V px, según el zoom.
 * 'cubrir' llena el visor (foto de perfil); 'contener' la deja entrar completa (logo).
 */
export function escalaVisor(w, h, V, zoom = 1, modo = 'cubrir') {
  const base = modo === 'cubrir' ? Math.max(V / w, V / h) : Math.min(V / w, V / h);
  return base * zoom;
}

/** Mueve la imagen sin dejar huecos: en 'cubrir' la imagen siempre tapa todo el visor. */
export function limitarDesplazamiento({ x, y }, w, h, s, V, modo = 'cubrir') {
  const mx = Math.abs(w * s - V) / 2;
  const my = Math.abs(h * s - V) / 2;
  if (modo !== 'cubrir') return { x: Math.max(-V / 2, Math.min(V / 2, x)), y: Math.max(-V / 2, Math.min(V / 2, y)) };
  return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
}

/** Dónde dibujar la imagen en el cuadrado final de `lado` px, igual a como se ve en el visor. */
export function destinoRecorte(w, h, s, { x, y }, V, lado) {
  const k = lado / V;
  const dw = w * s * k;
  const dh = h * s * k;
  return { dx: lado / 2 + x * k - dw / 2, dy: lado / 2 + y * k - dh / 2, dw, dh };
}

/** Abre el archivo elegido como imagen (para el visor). */
export async function abrirImagen(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Elige una imagen.');
  // Como texto (data URL) para que el visor pueda seguir mostrándola mientras se encuadra.
  const url = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('No se pudo abrir la imagen.'));
    r.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo abrir la imagen.'));
    img.src = url;
  });
}

/** Dibuja el encuadre elegido y lo devuelve como texto JPEG pequeño. */
export function exportarRecorte(img, s, desplazamiento, V, lado = 192) {
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, lado, lado);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const { dx, dy, dw, dh } = destinoRecorte(w, h, s, desplazamiento, V, lado);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, dw, dh);
  for (const calidad of [0.85, 0.7, 0.55, 0.4]) {
    const data = canvas.toDataURL('image/jpeg', calidad);
    if (fotoValida(data)) return data;
  }
  throw new Error('La imagen es demasiado pesada.');
}
