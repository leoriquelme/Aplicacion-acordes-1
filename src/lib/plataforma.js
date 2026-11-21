// Saber en qué teléfono y navegador está abierta la app, para explicar cómo instalarla.

const OTRO_EN_IPHONE = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|WhatsApp|Line\//i;
const DENTRO_DE_APP_ANDROID = /; wv\)|FBAN|FBAV|Instagram|Line\//i;

/**
 * 'iphone-safari' | 'iphone-otro' (Chrome, WhatsApp u otro en iPhone) | 'android' | 'android-app'
 * (navegador dentro de otra app) | 'pc'
 */
export function plataforma(ua = '', { platform = '', touch = 0 } = {}) {
  const ios = /iphone|ipad|ipod/i.test(ua) || (platform === 'MacIntel' && touch > 1);
  if (ios) return OTRO_EN_IPHONE.test(ua) ? 'iphone-otro' : 'iphone-safari';
  if (/android/i.test(ua)) return DENTRO_DE_APP_ANDROID.test(ua) ? 'android-app' : 'android';
  return 'pc';
}

export const plataformaActual = () => plataforma(navigator.userAgent, { platform: navigator.platform, touch: navigator.maxTouchPoints });
