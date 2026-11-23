// Qué app eligió la persona la última vez (Adora o Congrega), en este teléfono o computador.
const KEY = 'app-elegida';
export const appElegida = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const elegirApp = (id) => { try { localStorage.setItem(KEY, id); } catch { /* sin espacio */ } };
