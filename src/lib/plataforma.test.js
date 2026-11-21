import { describe, expect, it } from 'vitest';
import { plataforma } from './plataforma.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
describe('plataforma', () => {
  it('iPhone con Safari', () => expect(plataforma(`${IPHONE} Version/18.1 Mobile/15E148 Safari/604.1`)).toBe('iphone-safari'));
  it('iPhone con Chrome', () => expect(plataforma(`${IPHONE} CriOS/131.0 Mobile/15E148 Safari/604.1`)).toBe('iphone-otro'));
  it('iPad que dice ser Mac', () => expect(plataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605', { platform: 'MacIntel', touch: 5 })).toBe('iphone-safari'));
  it('Android con Chrome', () => expect(plataforma('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36')).toBe('android'));
  it('Android dentro de Facebook', () => expect(plataforma('Mozilla/5.0 (Linux; Android 14; wv) Chrome/131 Mobile [FBAN/FB4A;FBAV/1]')).toBe('android-app'));
  it('PC', () => expect(plataforma('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131 Safari/537.36')).toBe('pc'));
});
