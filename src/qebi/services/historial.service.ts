/**
 * DEMO: datos hardcodeados (sin bi-back ni WebSocket). Mantiene firmas.
 */
import type { ContextoHistorial, EventoHistorial, FiltrosHistorial, ResumenHistorial } from '../types/historial';
import type { Impacto } from '../types/reportes';

const d = <T,>(v: T): Promise<T> => Promise.resolve(v);

const MARCAS = ['Lumé', 'Véora', 'Nimbus', 'Solaria', 'Kairós', 'Marenna'];
const ASESORES = ['Ana Rivas', 'Beto Lomas', 'Carla Fenn', 'Diego Serna'];

function ev(id: number): EventoHistorial {
  const caras = (id % 5) - 2; // -2..2
  const monto = caras * 18_500;
  return {
    id,
    fecha: new Date(2026, (id % 11), 1 + (id % 26), 9 + (id % 8)).toISOString(),
    tipo: 'propuesta',
    accion: caras >= 0 ? 'Agregó caras' : 'Quitó caras',
    categoria: 'cambio_estado',
    usuario: ASESORES[id % ASESORES.length],
    refId: 1000 + id,
    campania: `Campaña ${MARCAS[id % MARCAS.length]} 2026`,
    caras,
    monto,
    estadoAntes: 'Abierto',
    estadoDespues: 'Atendido',
    carasAntes: 40,
    carasDespues: 40 + caras,
    invAntes: 740_000,
    invDespues: 740_000 + monto,
    descripcion: `Ajuste de inventario en Campaña ${MARCAS[id % MARCAS.length]}`,
    cliente: MARCAS[id % MARCAS.length],
    asesor: ASESORES[id % ASESORES.length],
    marca: MARCAS[id % MARCAS.length],
    status: 'Atendido',
    unidad: 'caras',
  };
}

const EVENTOS: EventoHistorial[] = Array.from({ length: 24 }, (_, i) => ev(i + 1));

export function getEventos(_f: Partial<FiltrosHistorial>): Promise<EventoHistorial[]> {
  return d(EVENTOS);
}

export function getResumenHistorial(_f: Partial<FiltrosHistorial> = {}): Promise<ResumenHistorial> {
  return d<ResumenHistorial>({
    actualizadoEn: new Date().toISOString(),
    desde: '2026-01-01',
    hasta: '2026-12-31',
    totalEventos: EVENTOS.length,
    carasAgregadas: 180,
    carasQuitadas: 64,
    netoCaras: 116,
    autorizaciones: { total: 32, dg: 12, dcm: 9, rechazos: 4, carasAprobadas: 420 },
    porDia: Array.from({ length: 14 }, (_, i) => ({
      fecha: `2026-11-${String(i + 1).padStart(2, '0')}`,
      eventos: 2 + (i % 5), carasAgregadas: 8 + (i % 6), carasQuitadas: i % 4, neto: 8 + (i % 6) - (i % 4),
    })),
    porCategoria: [
      { nombre: 'Cambio de estado', valor: 14, eventos: 14 },
      { nombre: 'Creación', valor: 9, eventos: 9 },
      { nombre: 'Autorización', valor: 7, eventos: 7 },
      { nombre: 'Eliminación', valor: 3, eventos: 3 },
    ],
    topUsuarios: ASESORES.map((n, i) => ({ nombre: n, valor: 40 - i * 7, eventos: 40 - i * 7 })),
    topQuitadores: ASESORES.map((n, i) => ({ nombre: n, valor: 12 - i * 2, eventos: 12 - i * 2 })),
    topCampanias: MARCAS.map((n, i) => ({ id: i + 1, nombre: `Campaña ${n}`, valor: 20 - i * 2, eventos: 20 - i * 2 })),
    variacionPorUsuario: ASESORES.map((n, i) => ({ nombre: n, alzas: 30 - i * 4, bajas: 8 + i * 2, neto: 22 - i * 6 })),
  });
}

export function getContexto(refId: number): Promise<ContextoHistorial> {
  return d<ContextoHistorial>({
    refId,
    campania: `Campaña ${MARCAS[refId % MARCAS.length]} 2026`,
    cliente: MARCAS[refId % MARCAS.length],
    asesor: ASESORES[refId % ASESORES.length],
    marca: MARCAS[refId % MARCAS.length],
    status: 'Atendido',
    descripcion: 'Contexto de demostración.',
    inversion: 740_000,
    eventos: EVENTOS.slice(0, 6),
  });
}

export function getImpacto(_anio?: number): Promise<Impacto> {
  const ediciones = EVENTOS.filter((e) => e.monto && e.monto !== 0);
  const total = ediciones.reduce((s, e) => s + (e.monto || 0), 0);
  const mayor = ediciones.reduce((a, b) => ((a?.monto || 0) > (b.monto || 0) ? a : b), ediciones[0] ?? null);
  return d<Impacto>({
    total,
    promedio: ediciones.length ? Math.round(total / ediciones.length) : 0,
    count: ediciones.length,
    mayor,
    puntos: ediciones.map((e) => ({ monto: e.monto || 0, caras: e.caras, campania: e.campania, usuario: e.usuario, fecha: e.fecha })),
    ediciones,
  });
}

export type EstadoWS = 'conectado' | 'desconectado';

/** DEMO: sin WebSocket. Reporta desconectado y no dispara recargas. */
export function suscribirEventos(
  _onEventos: (eventos: EventoHistorial[]) => void,
  onEstado: (estado: EstadoWS) => void
): () => void {
  onEstado('desconectado');
  return () => {};
}
