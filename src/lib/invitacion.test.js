import { describe, expect, it } from 'vitest';
import { codigoDelLink, linkDeInvitacion } from './invitacion.js';

const BASE = 'https://leoriquelme.github.io/aplicacion-iglesia/';

describe('link de invitación', () => {
  it('arma el link con el código', () => {
    expect(linkDeInvitacion('kxm-prt', BASE)).toBe(`${BASE}?unirse=KXMPRT`);
  });
  it('lee el código del link', () => {
    expect(codigoDelLink(`${BASE}?unirse=kxmprt`)).toBe('KXMPRT');
    expect(codigoDelLink(`${BASE}?unirse=KXMPRT#/`)).toBe('KXMPRT');
    expect(codigoDelLink(`${BASE}#/unirse/KXMPRT`)).toBe('KXMPRT');
    expect(codigoDelLink(BASE)).toBe('');
    expect(codigoDelLink(`${BASE}#/canciones`)).toBe('');
  });
  it('ida y vuelta', () => {
    expect(codigoDelLink(linkDeInvitacion('ABCD23', BASE))).toBe('ABCD23');
  });
});
