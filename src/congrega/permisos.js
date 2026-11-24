// Perfiles de acceso de Congrega (y su relación con Adora).
//
// Cada persona con cuenta tiene un perfil principal (members.role, el mismo de Adora):
//   admin (Administrador) · director (Director musical) · colaborador · miembro
// y puede sumar perfiles extra (members.perfiles):
//   pastor · asisAdmin (Administrativo de asistencia)
// El Encargado de asistencia es quien está en el equipo de estación (equipoEstacion/{uid}, invitado y aceptado).
// Quien creó la iglesia (church.ownerUid) es el Súper admin: nadie le cambia el perfil.
// Las reglas de Firebase (firestore.rules) aplican lo mismo; esto solo decide qué mostrar.

export const PERFIL_PRINCIPAL = [
  ['admin', 'Administrador'],
  ['director', 'Director musical'],
  ['colaborador', 'Colaborador'],
  ['miembro', 'Miembro'],
];
export const PERFILES_EXTRA = [
  ['pastor', 'Pastor'],
  ['asisAdmin', 'Administrativo de asistencia'],
];
export const MAX_EQUIPO_ESTACION = 8;

/** Qué hace cada perfil, en palabras simples (se muestra en Ajustes). */
export const QUE_HACE = {
  dueno: 'Todo. Nombra o quita Administradores y ve el registro de cambios. Nadie le puede quitar el perfil.',
  admin: 'Todo, menos nombrar Administradores: personas, familias, unir perfiles, asistencia y perfiles de los demás.',
  pastor: 'Ve todas las fichas, con notas pastorales y de salud. Edita datos de contacto y notas. Ve asistencia y reportes.',
  director: 'Adora completo (servicios, canciones, equipos). En Congrega ve solo nombres y fotos.',
  asisAdmin: 'Crea eventos, marca y corrige asistencias pasadas, cambia el tipo (visita, regular) y ve los reportes.',
  asistencia: 'Equipo de estación (hasta 8). Se ofrece para un evento y, si se aprueba, marca la asistencia de ese día y agrega visitas. No ve teléfonos ni direcciones.',
  colaborador: 'Ve sus servicios en Adora y los nombres de su equipo. En Congrega, solo su ficha.',
  miembro: 'Ve y actualiza solo su propia ficha (datos, foto, consentimiento) y ve a su familia.',
};

export const nombrePerfil = (rol) => ({ ...Object.fromEntries([...PERFIL_PRINCIPAL, ...PERFILES_EXTRA]), asistencia: 'Encargado de asistencia', dueno: 'Súper admin' })[rol] || 'Colaborador';

/**
 * Permisos de quien usa la app.
 * `role`: perfil principal; `perfiles`: lista de extra; `enEquipo`: aceptó estar en el equipo de estación; `esDueno`: creó la iglesia.
 */
export function permisosDe({ role = 'colaborador', perfiles = [], enEquipo = false, esDueno = false } = {}) {
  const extra = new Set(Array.isArray(perfiles) ? perfiles : []);
  const admin = role === 'admin';
  const pastor = admin || extra.has('pastor');
  const asisAdmin = admin || extra.has('asisAdmin');
  const marca = asisAdmin || enEquipo === true;
  const director = role === 'director';
  return {
    dueno: esDueno && admin,
    admin,
    pastor,
    asisAdmin,
    marca,
    /** Encargado de asistencia: solo el evento del día y con turno aprobado. */
    soloHoy: marca && !asisAdmin,
    director,
    /** Ve la lista de personas de la iglesia. */
    verPersonas: pastor || asisAdmin || director,
    /** Ve contacto, cumpleaños y notas de todos. */
    verPrivado: pastor,
    /** Ve la asistencia (para marcar o en reportes). */
    verAsistencia: marca || pastor,
    /** Edita la ficha privada (contacto y notas) de cualquiera. */
    editarFicha: pastor,
  };
}

/** Pestañas de Congrega según los permisos. */
export function pestanasCongrega(p) {
  const t = [];
  if (p.verPersonas) t.push('inicio');
  if (p.asisAdmin) t.push('asistencia');
  if (p.marca) t.push('estacion');
  if (p.verPersonas) t.push('personas');
  else t.push('mificha');
  if (p.admin) t.push('ajustes');
  return t;
}

/** ¿Quien cambia (`yo`) puede cambiar el perfil de `otro`? */
export function puedeCambiarPerfil(yo, otro) {
  if (!yo.admin) return false;
  if (otro.esDueno) return false;
  if (otro.role === 'admin' && !yo.dueno) return false;
  return true;
}
