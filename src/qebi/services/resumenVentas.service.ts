/**
 * DEMO: resumen de ventas hardcodeado (sin bi-back). Mantiene firmas.
 */
import type { FiltrosResumen, Kpi, ResumenVentas, VentaCatorcena, VentaMensualComparada, VentaSemana, VentaVsPpto } from '../types/bi';

const MES_ET = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const MARCAS = ['Lumé', 'Véora', 'Nimbus', 'Solaria', 'Kairós', 'Marenna'];
const ASESORES = ['Ana Rivas', 'Beto Lomas', 'Carla Fenn', 'Diego Serna'];

const kpis: Kpi[] = [
  { id: 'venta', titulo: 'Venta del año', valor: 9_480_000, objetivo: 11_000_000, tendencia: [6, 6.8, 7.2, 8, 8.4, 9, 9.48] },
  { id: 'caras', titulo: 'Caras vendidas', valor: 1_280, objetivo: 1_500, tendencia: [820, 920, 1010, 1120, 1200, 1280] },
  { id: 'ticket', titulo: 'Ticket promedio', valor: 175_500, objetivo: 180_000, tendencia: [150, 158, 162, 170, 175.5] },
  { id: 'ocup', titulo: 'Ocupación', valor: 72, objetivo: 85, tendencia: [58, 62, 66, 69, 72] },
];

const ventasVsPpto: VentaVsPpto[] = MES_ET.map((etiqueta, i) => ({
  mes: i + 1, etiqueta, ppto: 800_000 + (i % 4) * 120_000, aps: 650_000 + Math.round(Math.sin(i / 2) * 180_000) + i * 15_000,
}));

const ventasMensuales: VentaMensualComparada[] = MES_ET.map((etiqueta, i) => ({
  mes: i + 1, etiqueta, aps: ventasVsPpto[i].aps, anioAnterior: Math.round(ventasVsPpto[i].aps * 0.85),
}));

const ventasPorCatorcena: VentaCatorcena[] = Array.from({ length: 26 }, (_, i) => ({
  catorcena: i + 1, mes: Math.floor(i / 2) + 1, etiqueta: `CATORCENA ${String(i + 1).padStart(2, '0')}`,
  aps: 330_000 + Math.round(Math.cos(i / 3) * 90_000) + i * 6_000, anioAnterior: 300_000 + i * 4_000,
}));

const ventasPorSemana: VentaSemana[] = Array.from({ length: 20 }, (_, i) => ({
  semana: i + 1, anio: 2026, etiqueta: `Semana ${i + 1}-2026`, monto: 160_000 + Math.round(Math.sin(i / 2) * 50_000) + i * 3_000,
}));

export function getResumenVentas(_filtros: FiltrosResumen): Promise<ResumenVentas> {
  return Promise.resolve<ResumenVentas>({
    actualizadoEn: new Date().toISOString(),
    promedioVentaSemanal: 182_000,
    kpis, ventasVsPpto, ventasPorSemana, ventasPorCatorcena, ventasMensuales,
  });
}

export function getAsesores(): Promise<string[]> {
  return Promise.resolve(ASESORES);
}

export function getClientes(): Promise<string[]> {
  return Promise.resolve(MARCAS);
}
