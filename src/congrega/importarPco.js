// Importar personas desde una exportación CSV de Planning Center People.
// Las ids son estables (pco-<Person ID>, pcoh-<Household ID>): importar de nuevo actualiza, no duplica.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let f = '';
  let q = false;
  text = String(text).replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); rows.push(row); row = []; f = '';
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  const head = (rows.shift() || []).map((k) => k.trim());
  return rows.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(head.map((k, i) => [k, (r[i] || '').trim()])));
}

export const esExportPco = (rows) => rows.length > 0 && 'Person ID' in rows[0] && 'First Name' in rows[0];

// Planning Center a veces deja ";" sobrantes cuando hay varias direcciones o teléfonos.
const partes = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean);
const primero = (s) => partes(s)[0] || '';
const tf = (s) => (s === 'true' ? true : s === 'false' ? false : null);
const ID = (s) => String(s).replace(/[^A-Za-z0-9]/g, '');

const MINISTERIO = { Mutimedia: 'Multimedia', 'Equipo de Diaconos': 'Equipo de Diáconos', Diacono: 'Diácono', Tesoreria: 'Tesorería' };
const MEMBRESIA = { Activo: 'Activo', Regular: 'Regular', Ocacional: 'Ocasional', Ocasional: 'Ocasional', Visita: 'Visita' };
const CIVIL = {
  Married: 'Casado/a', Soltero: 'Soltero/a', Single: 'Soltero/a', 'Viuda / Viudo': 'Viudo/a', Widowed: 'Viudo/a',
  'Separado / Divorciado': 'Separado/a / Divorciado/a', Divorced: 'Separado/a / Divorciado/a',
};
const RANGO = { Bebe: 'Bebé' };
const MOTIVO = { Deceased: 'Fallecido/a' };

/** Una fila del CSV → { key, familia, persona (visible), ficha (privada) }. */
export function filaPco(r, { conNotasMedicas = false } = {}) {
  const key = `pco-${ID(r['Person ID'])}`;
  const familiaId = r['Household ID'] ? `pcoh-${ID(r['Household ID'])}` : null;
  const esNino = r.Child === 'true';
  const nombre = r['First Name'] || '';
  const apellido = r['Last Name'] || '';
  const teams = String(r['Extras PSG :: Ministerios'] || '').split(/[;,]/).map((x) => x.trim()).filter(Boolean).map((x) => MINISTERIO[x] || x);
  const persona = {
    name: `${nombre} ${apellido}`.trim().slice(0, 60) || 'Sin nombre',
    nombre, apellido, apodo: r.Nickname || '', uid: '', role: 'colaborador',
    tipo: MEMBRESIA[r.Membership] || r.Membership || '',
    miembro: tf(r['Extras PSG :: Miembro']),
    rangoEdad: RANGO[r['Extras PSG :: Rango edad']] || r['Extras PSG :: Rango edad'] || '',
    esNino, estado: r.Status === 'inactive' ? 'inactivo' : 'activo',
    familiaId, rolFamilia: r['Household Primary Contact'] === 'TRUE' ? 'Contacto principal' : esNino ? 'Hijo/a' : '',
    teams, pcoId: r['Person ID'], creadoEn: Date.parse(r['Created At']) || Date.now(),
  };
  const nac = r.Birthdate || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(nac)) persona.birthday = nac.slice(5); // "MM-DD", como en Adora
  const estado = r['Home Address State'] || '';
  const ficha = {
    segundoNombre: r['Middle Name'] || '', fechaNacimiento: nac, aniversario: r.Anniversary || '',
    genero: r.Gender === 'Male' ? 'Masculino' : r.Gender === 'Female' ? 'Femenino' : '',
    estadoCivil: CIVIL[r['Marital Status']] || r['Marital Status'] || '',
    telefono: partes(r['Mobile Phone Number']).join(', '),
    email: primero(r['Home Email']) || primero(r['Work Email']),
    direccion: [primero(r['Home Address Street Line 1']), primero(r['Home Address Street Line 2'])].filter(Boolean).join(', '),
    comuna: primero(r['Home Address City']),
    region: /metropolit/i.test(estado) ? 'Región Metropolitana' : primero(estado),
    bautizado: tf(r['Extras PSG :: Bautizado']),
    fechaConversion: r['Extras PSG :: Fecha de conversión'] || '',
    motivoInactivo: MOTIVO[r['Inactive Reason']] || r['Inactive Reason'] || '',
    fechaInactivo: r['Inactive Date'] || '',
  };
  if (conNotasMedicas) ficha.notasMedicas = r['Medical Notes'] || '';
  return { key, familia: familiaId ? { id: familiaId, name: (r['Household Name'] || 'Familia').slice(0, 60) } : null, persona, ficha, tieneNotasMedicas: Boolean(r['Medical Notes']) };
}
