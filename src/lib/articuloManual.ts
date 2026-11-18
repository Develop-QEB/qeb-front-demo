/**
 * Artículo de captura manual (el demo no tiene catálogo de artículos).
 *
 * El campo `articulo` se sigue guardando como texto "PREFIJO-CLAVE" porque el
 * sistema interpreta el prefijo de operación en muchos lugares (cortesía,
 * intercambio, impresión, pareja de bonificación BF, autorizaciones, KPIs).
 * La operación se elige de una lista y la clave es texto libre normalizado.
 */
export type OperacionArticulo = 'RT' | 'CT' | 'IN' | 'IM' | 'ES';

export const OPERACIONES_ARTICULO: { value: OperacionArticulo; label: string; ayuda: string }[] = [
  { value: 'RT', label: 'Renta', ayuda: 'Venta normal de espacios' },
  { value: 'CT', label: 'Cortesía', ayuda: 'Caras sin costo para el cliente' },
  { value: 'IN', label: 'Intercambio', ayuda: 'Pago en especie (sin bonificación)' },
  { value: 'IM', label: 'Impresión', ayuda: 'Solo impresión del material (sin bonificación)' },
  { value: 'ES', label: 'Ejecución especial', ayuda: 'Montajes o servicios especiales (sin bonificación)' },
];

export const ARTICULO_CLAVE_MAX = 40;

/** Artículo con la misma forma que usaban los selectores ({ItemCode, ItemName}). */
export interface ArticuloManual {
  ItemCode: string;
  ItemName: string;
}

/** Normaliza la clave: mayúsculas, sin acentos, cualquier separador → guion. */
export function sanitizarClave(texto: string): string {
  return (texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, ARTICULO_CLAVE_MAX)
    .replace(/-+$/g, '');
}

/**
 * Valida una clave ya normalizada. Algunas formas activarían lógica especial
 * del sistema base (circuitos digitales, unidad UDC, plaza QR), así que no se
 * permiten. Devuelve el mensaje de error o null si es válida.
 */
export function validarClave(clave: string): string | null {
  if (!clave) return 'Captura la clave del artículo';
  if (/^DIG-\d+-[A-Z]+$/.test(clave)) return 'Esa forma de clave está reservada; usa otra';
  const tokens = clave.split('-');
  if (tokens.includes('UDC') || tokens.includes('AICM')) return 'La clave contiene una palabra reservada; usa otra';
  if (clave.endsWith('-QR')) return 'La clave no puede terminar en -QR';
  return null;
}

export function etiquetaOperacion(op: OperacionArticulo): string {
  return OPERACIONES_ARTICULO.find(o => o.value === op)?.label ?? op;
}

/** Arma el artículo guardable: "RT-PARABUS-NORTE". */
export function componerArticulo(op: OperacionArticulo, clave: string): ArticuloManual {
  return { ItemCode: `${op}-${clave}`, ItemName: `${etiquetaOperacion(op)} · ${clave}` };
}

/** Pareja de bonificación del artículo de renta: "BF-PARABUS-NORTE". */
export function componerBf(clave: string): ArticuloManual {
  return { ItemCode: `BF-${clave}`, ItemName: `Bonificación · ${clave}` };
}

/**
 * Separa un artículo guardado en operación + clave (para precargar en edición).
 * Si el prefijo no es una operación conocida, se toma como Renta con la clave
 * completa.
 */
export function parsearArticulo(itemCode: string | null | undefined): { operacion: OperacionArticulo; clave: string } {
  const code = (itemCode || '').trim().toUpperCase();
  const guion = code.indexOf('-');
  const pref = guion > 0 ? code.slice(0, guion) : '';
  const op = OPERACIONES_ARTICULO.find(o => o.value === pref)?.value;
  if (op) return { operacion: op, clave: sanitizarClave(code.slice(guion + 1)) };
  if (pref === 'BF') return { operacion: 'RT', clave: sanitizarClave(code.slice(guion + 1)) };
  return { operacion: 'RT', clave: sanitizarClave(code) };
}

/** Artículo a partir del string guardado en BD (con nombre legible). */
export function articuloDesdeCodigo(itemCode: string | null | undefined): ArticuloManual | null {
  if (!itemCode) return null;
  const code = itemCode.trim().toUpperCase();
  if (code.startsWith('BF-')) {
    return { ItemCode: code, ItemName: `Bonificación · ${code.slice(3)}` };
  }
  const { operacion, clave } = parsearArticulo(code);
  return { ItemCode: code, ItemName: `${etiquetaOperacion(operacion)} · ${clave || code}` };
}
