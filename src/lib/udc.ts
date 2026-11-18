import type { InventarioDisponible } from '../services/inventarios.service';

// UDC (unidad de pantallas de aeropuerto) — DESHABILITADA en el demo.
//
// El sistema base soporta una unidad de negocio de pantallas de aeropuerto con
// su propio catálogo (ficha técnica, mapeo artículo → pantalla, contratos,
// planos). En el demo esa unidad no existe: los catálogos están vacíos, nadie
// tiene el permiso `canVerUDC` y las funciones de abajo devuelven null o listas
// vacías. Se conservan las firmas para no tocar a los componentes que las usan.

export const UDC_PLAZA_LABEL = 'Ciudad de México / AM';
export const UDC_CIUDAD_BASE = 'AICM';

// Formato (= inventarios.mueble) del inventario UDC.
export const UDC_FORMATO = 'PANTALLA DIGITAL';

// Prefijos reales de artículo (operación).
const PREFIJOS_REALES = new Set(['RT', 'BF', 'CF', 'CT', 'IN', 'IM', 'ES']);

export type FamiliaUDC = 'BLT' | 'VWL' | 'PAQ' | 'BLOQ' | 'CIRC' | 'OTRA';

export interface ArticuloUDCInfo {
  familia: FamiliaUDC;
  familiaLabel: string;    // formato de display (BACK LIGHT / VIDEO WALL / ...)
  terminal: 'T1' | 'T2' | null;
  plazaLabel: string;      // → campo `estados` (plaza)
  ciudad: string;          // → campo `ciudad`
  tipo: 'Digital';         // UDC siempre digital
}

const FAMILIA_LABEL: Record<FamiliaUDC, string> = {
  BLT: 'BACK LIGHT',
  VWL: 'VIDEO WALL',
  PAQ: 'PAQUETE',
  BLOQ: 'BLOQUE',
  CIRC: 'CIRCUITO',
  OTRA: '',
};

// Normaliza en-dash/em-dash a guion ASCII y pasa a MAYÚSCULAS para comparar.
const normCode = (s?: string | null): string =>
  (s || '').normalize('NFKC').replace(/[‒-―]/g, '-').trim().toUpperCase();

// ¿El artículo NO tiene un prefijo de operación válido?
export function esArticuloUDCBasura(itemCode?: string | null): boolean {
  const c = normCode(itemCode);
  if (!c) return true;
  const pref = c.split('-')[0];
  return !PREFIJOS_REALES.has(pref);
}

// ¿El artículo parece de UDC? Respaldo por patrón de código/nombre.
export function esArticuloUDC(itemCode?: string | null, itemName?: string | null): boolean {
  const c = normCode(itemCode);
  if (!c) return false;
  const toks = c.split('-');
  if (toks.includes('UDC') || toks.includes('AICM')) return true;
  const seg2 = toks[1] || '';
  if (seg2 === 'VWL' || seg2 === 'PAQ' || /^BLOQ/.test(seg2) || /^CIRC/.test(seg2)) return true;
  const n = (itemName || '').toUpperCase();
  if (n.includes('AICM') || n.includes('UDCVW')) return true;
  return false;
}

// Parsea un ItemCode UDC → info de autorrelleno. null si el código viene vacío.
export function parseArticuloUDC(itemCode?: string | null, _itemName?: string | null): ArticuloUDCInfo | null {
  const c = normCode(itemCode);
  if (!c) return null;
  const toks = c.split('-');
  const seg2 = toks[1] || '';

  let familia: FamiliaUDC = 'OTRA';
  if (toks.includes('BLT')) familia = 'BLT';
  else if (seg2 === 'VWL' || toks.includes('VWL')) familia = 'VWL';
  else if (seg2 === 'PAQ' || toks.includes('PAQ')) familia = 'PAQ';
  else if (/^BLOQ/.test(seg2)) familia = 'BLOQ';
  else if (/^CIRC/.test(seg2)) familia = 'CIRC';

  const terminal: ArticuloUDCInfo['terminal'] =
    /-T1(-|$)/.test(c) ? 'T1' : /-T2(-|$)/.test(c) ? 'T2' : null;
  const ciudad = terminal ? `${UDC_CIUDAD_BASE} ${terminal}` : UDC_CIUDAD_BASE;

  return {
    familia,
    familiaLabel: FAMILIA_LABEL[familia],
    terminal,
    plazaLabel: UDC_PLAZA_LABEL,
    ciudad,
    tipo: 'Digital',
  };
}

// Zona de un artículo UDC a partir de su código (para el Orden de Montaje).
export function udcZonaDeArticulo(itemCode?: string | null): string {
  const c = normCode(itemCode);
  if (!c) return '';
  const zl = c.match(/(?:CIRC|BLOQ)([A-D])(?![A-Z])/);
  if (zl) return `Zona ${zl[1]}`;
  const term = /-T2(-|$)/.test(c) ? '2' : /-T1(-|$)/.test(c) ? '1' : '';
  if (term) return `Terminal ${term}`;
  return '';
}

// ── Ficha técnica del inventario UDC ─────────────────────────────────────────
export interface UdcPantalla {
  nombre: string;        // "DIGITAL 2"
  zona: string;          // grupo/zona
  medida: string;        // "1920 x 720"
  ancho: number | null;  // px
  alto: number | null;   // px
  duracion: number;      // segundos por spot
  reel: number;          // anunciantes en el reel
}

export const UDC_ZONA_A = 'Zona A';
export const UDC_ZONA_C8 = 'Zona C';
export const UDC_ZONA_D = 'Zona D';
export const UDC_ZONA_IND = 'Digital';

// Vacía en el demo.
export const UDC_FICHA_TECNICA: UdcPantalla[] = [];

export const UDC_ZONAS_ORDEN = [UDC_ZONA_A, UDC_ZONA_C8, UDC_ZONA_D, UDC_ZONA_IND];

// Normaliza un código de pantalla a un ID canónico por número
// ("DIGITAL 2"→"2", "DIGITAL 1-A"→"1A", "DIG- 01 T2"→"T2").
export function udcPantallaNum(codigo?: string | null): string {
  let s = String(codigo || '').split('_')[0];
  s = s.toUpperCase().replace(/^(DIGITAL|DIG)-?\s*/, '').trim();
  s = s.replace(/[-\s]/g, '');
  if (s.includes('T2')) return 'T2';
  if (/^\d+$/.test(s)) return String(parseInt(s, 10));
  return s;
}

export function udcFichaDe(_codigo?: string | null): UdcPantalla | undefined {
  return undefined;
}

// Pantallas físicas que cubre un artículo. null = sin mapeo (mostrar todo).
export function articuloUDCPantallas(_itemCode?: string | null): string[] | null {
  return null;
}

// Número de contrato por artículo / pantalla. Sin datos en el demo.
export function contratoDeArticulo(
  _itemCode?: string | null,
): { contrato: string; zona: string } | null {
  return null;
}

export function contratoDePantalla(
  _nombreOrNum?: string | null,
): { contrato: string; zona: string } | null {
  return null;
}

// Posición de cada pantalla sobre los planos (en %). Sin datos en el demo.
export const UDC_MAPA_COORDS: Record<string, { x: number; y: number }> = {};
export const UDC_MAPA_COORDS_PB: Record<string, { x: number; y: number }> = {};

export function udcMapaCoord(codigoUnico?: string | null): { x: number; y: number } | null {
  const n = udcPantallaNum(codigoUnico);
  if (!n) return null;
  return UDC_MAPA_COORDS[n] ?? UDC_MAPA_COORDS_PB[n] ?? null;
}

// URL de la ficha técnica (imagen) de una pantalla. Sin fichas en el demo.
export function udcFichaImg(_codigoUnico?: string | null): string | null {
  return null;
}

// Inventario "sintético" UDC (una fila por pantalla de la ficha técnica).
// Con la ficha vacía, no genera filas.
export function buildUdcInventarioDisponible(): InventarioDisponible[] {
  return UDC_FICHA_TECNICA.map((p, i) => ({
    id: -(1000 + i),
    codigo_unico: p.nombre,
    ubicacion: p.zona,
    tipo_de_cara: 'Flujo',
    cara: 'A',
    mueble: UDC_FORMATO,
    latitud: 0,
    longitud: 0,
    plaza: 'CIUDAD DE MEXICO',
    estado: 'Ciudad de México',
    municipio: UDC_CIUDAD_BASE,
    cp: null,
    tradicional_digital: 'Digital',
    sentido: null,
    tipo_de_mueble: p.zona,
    ancho: p.ancho ?? 0,
    alto: p.alto ?? 0,
    archivos_id: null,
    nivel_socioeconomico: null,
    total_espacios: null,
    tiempo: p.duracion,
    estatus: 'Disponible',
    codigo: null,
    isla: 'NO',
    mueble_isla: null,
    entre_calle_1: null,
    entre_calle_2: null,
    orientacion: null,
    tarifa_piso: null,
    tarifa_publica: null,
    cto: null,
    estatus_real: 'Disponible',
    espacios: [],
    espacios_count: 0,
    ya_reservado_para_cara: false,
    espacio_id: null,
    numero_espacio: null,
  }));
}
