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

/** Lado máximo de la imagen que se muestra en el visor (las fotos del teléfono pueden ser enormes). */
const MAX_VISOR = 1280;

function cargarDesde(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo abrir la imagen. Prueba con otra foto.'));
    img.src = url;
  });
}

/** Suelta la memoria de un canvas (en iPhone hay un límite y si no se libera, falla la siguiente foto). */
function soltar(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Abre la imagen elegida y la deja de un tamaño razonable (máx. 1280 px por lado) para encuadrarla.
 * Así una foto de 12 o 48 megapíxeles del iPhone no llena la memoria del teléfono.
 */
export async function abrirImagen(file) {
  if (!file?.type?.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp|gif)$/i.test(file?.name || '')) {
    throw new Error('Elige una imagen.');
  }
  const url = URL.createObjectURL(file);
  try {
    const original = await cargarDesde(url);
    const w = original.naturalWidth || original.width;
    const h = original.naturalHeight || original.height;
    const k = Math.min(1, MAX_VISOR / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * k));
    canvas.height = Math.max(1, Math.round(h * k));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El teléfono no tiene memoria libre. Cierra otras apps e inténtalo otra vez.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.9);
    soltar(canvas);
    // Si el teléfono no pudo copiarla, se usa la original tal cual.
    return data.startsWith('data:image/') ? await cargarDesde(data) : await cargarDesde(await leerComoTexto(file));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function leerComoTexto(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('No se pudo abrir la imagen.'));
    r.readAsDataURL(file);
  });
}

/**
 * Dibuja el encuadre elegido y lo devuelve como texto JPEG pequeño.
 * Nunca rechaza por peso: si no cabe, baja la calidad y luego el tamaño hasta que quepa.
 */
export function exportarRecorte(img, s, desplazamiento, V, lado = 192) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  for (const l of [lado, Math.round(lado * 0.8), Math.round(lado * 0.6), 96]) {
    const canvas = document.createElement('canvas');
    canvas.width = l;
    canvas.height = l;
    const ctx = canvas.getContext('2d');
    if (!ctx) { soltar(canvas); continue; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, l, l);
    const { dx, dy, dw, dh } = destinoRecorte(w, h, s, desplazamiento, V, l);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, dw, dh);
    for (const calidad of [0.85, 0.7, 0.55, 0.4, 0.3]) {
      for (const tipo of ['image/jpeg', 'image/webp']) {
        const data = canvas.toDataURL(tipo, calidad);
        if (fotoValida(data)) { soltar(canvas); return data; }
      }
    }
    soltar(canvas);
  }
  throw new Error('El teléfono no pudo preparar la foto. Cierra otras apps e inténtalo otra vez.');
}
