/**
 * DEMO: datos hardcodeados (sin bi-back). Universo ficticio, nada de IMU/QEB real.
 * Mantiene las mismas firmas que el servicio original para no tocar las vistas.
 */
import type {
  CampaniaDetalle, Ciclo, CicloTendenciaMes, ConteoMonto, ConteoPeriodo,
  Dimension, Embudo, FiltrosReporte, OpcionesReporte, Periodo, PropuestasAutMes,
} from '../types/reportes';

const d = <T,>(v: T): Promise<T> => Promise.resolve(v);
const MES_ET = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const PLAZAS = ['NÓVARA', 'PUERTO SELENE', 'VALLE AURORA', 'SAN TELMO'];
const MARCAS = ['Lumé', 'Véora', 'Nimbus', 'Solaria', 'Kairós', 'Marenna'];
const ASESORES = ['Ana Rivas', 'Beto Lomas', 'Carla Fenn', 'Diego Serna'];
const MUEBLES = ['Espectacular', 'Valla', 'Parabús', 'Mupi', 'Pantalla LED'];
const CATEGORIAS = ['Bebidas', 'Telecomunicaciones', 'Seguros', 'Retail', 'Automotriz'];

export function getEmbudo(_f: Partial<FiltrosReporte> = {}): Promise<Embudo> {
  return d<Embudo>({
    etapas: [
      { nombre: 'Solicitudes', valor: 142, pct: 100 },
      { nombre: 'Propuestas', valor: 98, pct: 69 },
      { nombre: 'Campañas', valor: 54, pct: 38 },
    ],
    solicitud: MARCAS.map((m, i) => ({ nombre: m, valor: 30 - i * 3, eventos: 30 - i * 3 })),
    propuesta: MARCAS.map((m, i) => ({ nombre: m, valor: 22 - i * 2, eventos: 22 - i * 2 })),
    campania: MARCAS.map((m, i) => ({ id: i + 1, nombre: m, valor: 12 - i, eventos: 12 - i })),
    totales: { solicitudes: 142, propuestas: 98, campanias: 54 },
  });
}

export function getDistribucion(dim: Dimension, _f: Partial<FiltrosReporte> = {}): Promise<ConteoMonto[]> {
  const base =
    dim === 'plaza' ? PLAZAS :
    dim === 'asesor' ? ASESORES :
    dim === 'mueble' ? MUEBLES :
    dim === 'categoria' ? CATEGORIAS :
    dim === 'digital' ? ['Tradicional', 'Digital'] :
    MARCAS;
  return d<ConteoMonto[]>(base.map((nombre, i) => ({
    nombre,
    monto: 1_800_000 - i * 220_000 + (i % 2) * 90_000,
    caras: 320 - i * 36,
    n: 48 - i * 5,
  })));
}

export function getVentasPeriodo(periodo: Periodo, _f: Partial<FiltrosReporte> = {}): Promise<ConteoPeriodo[]> {
  const n = periodo === 'mes' ? 12 : periodo === 'catorcena' ? 26 : 52;
  return d<ConteoPeriodo[]>(Array.from({ length: n }, (_, i) => ({
    periodo: i + 1,
    monto: 650_000 + Math.round(Math.sin(i / 2) * 180_000) + i * 12_000,
    caras: 120 + Math.round(Math.cos(i / 3) * 40) + i,
  })));
}

export function getCiclo(_f: Partial<FiltrosReporte> = {}): Promise<Ciclo> {
  return d<Ciclo>({
    etapas: [
      { de: 'Solicitud', a: 'Propuesta', dias: 3.4 },
      { de: 'Propuesta', a: 'Aprobación', dias: 5.1 },
      { de: 'Aprobación', a: 'Campaña', dias: 2.2 },
    ],
    cicloTotalDias: 10.7,
    conversionGlobalPct: 38,
    total: 54,
  });
}

export function getCicloTendencia(_f: Partial<FiltrosReporte> = {}): Promise<CicloTendenciaMes[]> {
  return d<CicloTendenciaMes[]>(MES_ET.map((_, i) => ({
    mes: i + 1,
    solProp: +(2.5 + Math.sin(i / 2)).toFixed(1),
    propAprob: +(4.2 + Math.cos(i / 3)).toFixed(1),
    total: +(9 + Math.sin(i / 4) * 2).toFixed(1),
    n: 8 + (i % 4),
    nAprob: 5 + (i % 3),
  })));
}

export function getCampanias(limit = 120, _f: Partial<FiltrosReporte> = {}): Promise<CampaniaDetalle[]> {
  const STATUS = ['en curso', 'Aprobada', 'finalizada', 'por iniciar', 'Pausada'];
  const rows: CampaniaDetalle[] = Array.from({ length: Math.min(limit, 24) }, (_, i) => ({
    id: i + 1,
    nombre: `Campaña ${MARCAS[i % MARCAS.length]} ${2026} · ${PLAZAS[i % PLAZAS.length]}`,
    status: STATUS[i % STATUS.length],
    totalCaras: 40 + (i % 7) * 12,
    monto: 420_000 + (i % 9) * 85_000,
    fechaInicio: `2026-${String((i % 12) + 1).padStart(2, '0')}-05`,
    fechaFin: `2026-${String((i % 12) + 1).padStart(2, '0')}-28`,
    fechaCreacion: `2026-${String((i % 12) + 1).padStart(2, '0')}-01`,
    cliente: MARCAS[i % MARCAS.length],
    asesor: ASESORES[i % ASESORES.length],
  }));
  return d(rows);
}

export function getPropuestasAutorizacion(_f: Partial<FiltrosReporte> = {}): Promise<PropuestasAutMes[]> {
  return d<PropuestasAutMes[]>(MES_ET.map((etiqueta, i) => {
    const propuestas = 6 + (i % 5) * 2;
    const conDG = Math.round(propuestas * (0.2 + (i % 3) * 0.1));
    return { mes: i + 1, etiqueta, propuestas, conDG, pctDG: Math.round((conDG / propuestas) * 100) };
  }));
}

export function getOpciones(_anio = 2026): Promise<OpcionesReporte> {
  return d<OpcionesReporte>({
    plaza: PLAZAS,
    formato: MUEBLES,
    mueble: MUEBLES,
    cliente: MARCAS,
    asesor: ASESORES,
  });
}

export function getVentaTotal(_f: Partial<FiltrosReporte>): Promise<number> {
  return d(9_480_000);
}

export interface CatorcenaCal { catorcena: number; ini: string | null; fin: string | null; etiqueta: string }
export function getCatorcenas(_anio = 2026): Promise<CatorcenaCal[]> {
  return d<CatorcenaCal[]>(Array.from({ length: 26 }, (_, i) => {
    const ini = new Date(2026, 0, 1 + i * 14);
    const fin = new Date(2026, 0, 14 + i * 14);
    const iso = (x: Date) => x.toISOString().slice(0, 10);
    return { catorcena: i + 1, ini: iso(ini), fin: iso(fin), etiqueta: `CATORCENA ${String(i + 1).padStart(2, '0')}` };
  }));
}

export interface Tarifas { efectiva: number; publica: number; descuentoPct: number; caras: number; monto: number }
export function getTarifas(_f: Partial<FiltrosReporte>): Promise<Tarifas> {
  return d<Tarifas>({ efectiva: 14_200, publica: 18_900, descuentoPct: 25, caras: 1_280, monto: 9_480_000 });
}
