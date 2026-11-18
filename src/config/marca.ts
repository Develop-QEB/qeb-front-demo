/**
 * Marca del demo: la que ven los clientes en las vistas de compartir propuesta,
 * en los PDFs y en las exportaciones. Para personalizar el demo a un prospecto
 * basta con cambiar este archivo (y poner sus logos en /public).
 */
export const MARCA = {
  nombre: 'QEB',
  lema: 'OOH Management',
  /** Logo para fondos claros. */
  logoUrl: '/images/logo-ooh.png',
  /** Logo para fondos oscuros. */
  logoBlancoUrl: '/images/logo-bco.png',
  /** Correo de contacto para pies de documentos; vacío = no se muestra. */
  correoContacto: '',
  colores: {
    primario: '#4338CA',
    oscuro: '#1E1B4B',
    acento: '#0D9488',
    claro: '#EEF2FF',
  },
} as const;

/** "#RRGGBB" → [r, g, b], el formato que piden los setColor de jsPDF. */
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Carga un logo como dataURL PNG junto con su proporción ancho/alto, para
 * dibujarlo en un PDF sin deformarlo sin importar qué logo se configure.
 */
export function cargarLogo(url: string): Promise<{ dataUrl: string; ratio: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx || !canvas.width || !canvas.height) {
        reject(new Error('No se pudo leer el logo'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), ratio: canvas.width / canvas.height });
    };
    img.onerror = reject;
    img.src = url;
  });
}
