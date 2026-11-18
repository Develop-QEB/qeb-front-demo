import api from '../lib/api';
import { ApiResponse } from '../types';
import { inventariosService } from './inventarios.service';
import {
  ColumnaPeriodo,
  PeriodoAnalisis,
  fechaISO,
  generarColumnas,
  indicesTraslapados,
  normalizarPeriodo,
} from '../lib/analisisPeriodos';

/**
 * Referencia a una catorcena del FORMATO ANTERIOR de los análisis guardados.
 * Ya no se usa para construir la matriz (ahora es por fechas); se conserva para
 * reconocer y avisar de análisis viejos, y porque la auditoría de conflictos la
 * sigue importando.
 */
export interface CatorcenaRef {
  numero: number;
  anio: number;
}

export interface InventarioResumen {
  id: number;
  codigo_unico: string | null;
  ubicacion?: string | null;
  mueble?: string | null;
  plaza?: string | null;
  estado?: string | null;
  tipo_de_cara?: string | null;
  tradicional_digital?: string | null;
}

export interface AnalisisOcupacion {
  id: number;
  usuario_id: number;
  nombre: string;
  inventarios: InventarioResumen[];
  /** Periodo(s) por fechas. Vacío si el análisis se guardó con el formato anterior. */
  periodos: PeriodoAnalisis[];
  /** Catorcenas del formato anterior (solo para avisar al abrir un análisis viejo). */
  catorcenasLegado: CatorcenaRef[];
  codigosNoEncontrados: string[];
  fecha_creacion: string;
  fecha_actualizacion: string | null;
  is_owner?: boolean;
}

export interface AnalisisOcupacionInput {
  nombre: string;
  inventarios: InventarioResumen[];
  /** Se guarda en la columna `catorcenas_data` como [{ inicio, fin, granularidad }]. */
  periodos: PeriodoAnalisis[];
  codigosNoEncontrados: string[];
}

/** Forma cruda que devuelve el back (`periodos` es nuevo; `catorcenas` = formato anterior). */
type AnalisisOcupacionApi = Omit<AnalisisOcupacion, 'periodos' | 'catorcenasLegado' | 'inventarios' | 'codigosNoEncontrados'> & {
  inventarios?: InventarioResumen[];
  codigosNoEncontrados?: string[];
  periodos?: unknown;
  catorcenas?: unknown;
};

export interface CampanaEnCelda {
  reserva_id: number;
  reserva_estatus: string;
  campana_id: number;
  campana_nombre: string;
  cliente_nombre: string;
  propuesta_id: number;
  /** Fechas de la reserva, 'YYYY-MM-DD'. */
  inicio_periodo: string;
  fin_periodo: string;
  articulo: string | null;
  aps: number | null;
  grupo_completo_id: number | null;
  posted: boolean;
}

export interface CeldaOcupacion {
  ocupado: boolean;
  campanas: CampanaEnCelda[];
}

export interface MatrizOcupacion {
  inventarios: InventarioResumen[];
  periodo: PeriodoAnalisis;
  columnas: ColumnaPeriodo[];
  // celdas[inventarioId][columna.key] = CeldaOcupacion. Una reserva aparece en
  // TODAS las columnas que se traslapan con sus fechas (el mismo objeto).
  celdas: Record<number, Record<string, CeldaOcupacion>>;
  /** Inventarios cuyo historial no se pudo cargar (se ven sin reservas). */
  inventariosConError: number[];
}

const esCatorcenaLegado = (v: unknown): v is CatorcenaRef => {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return Number.isFinite(r.numero) && Number.isFinite(r.anio);
};

/**
 * Deja el análisis en el formato nuevo sin importar qué versión del back lo
 * mandó: `periodos` (back nuevo) o el arreglo crudo en `catorcenas`, que puede
 * traer periodos por fechas o catorcenas del formato anterior.
 */
function normalizarAnalisis(raw: AnalisisOcupacionApi): AnalisisOcupacion {
  const { periodos: periodosRaw, catorcenas: catorcenasRaw, inventarios, codigosNoEncontrados, ...resto } = raw;
  const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  // Back nuevo: `periodos`. Back anterior: el arreglo venía crudo en `catorcenas`.
  const fuentePeriodos = Array.isArray(periodosRaw) ? periodosRaw : catorcenasRaw;
  return {
    ...resto,
    inventarios: Array.isArray(inventarios) ? inventarios : [],
    codigosNoEncontrados: Array.isArray(codigosNoEncontrados) ? codigosNoEncontrados : [],
    periodos: lista(fuentePeriodos)
      .map(normalizarPeriodo)
      .filter((p): p is PeriodoAnalisis => p !== null),
    catorcenasLegado: lista(catorcenasRaw).filter(esCatorcenaLegado),
  };
}

/** Reservas distintas de un inventario dentro de la matriz, en orden de aparición. */
export function reservasDeInventario(matriz: MatrizOcupacion, inventarioId: number): CampanaEnCelda[] {
  const invCeldas = matriz.celdas[inventarioId];
  if (!invCeldas) return [];
  const vistas = new Set<number>();
  const out: CampanaEnCelda[] = [];
  for (const col of matriz.columnas) {
    for (const c of invCeldas[col.key]?.campanas || []) {
      if (vistas.has(c.reserva_id)) continue;
      vistas.add(c.reserva_id);
      out.push(c);
    }
  }
  return out;
}

// Historiales que se piden en paralelo al construir la matriz. Con cientos de
// inventarios, dispararlos todos a la vez satura al back y provoca timeouts.
const CONCURRENCIA_HISTORIAL = 8;

export const analisisOcupacionService = {
  async list(): Promise<AnalisisOcupacion[]> {
    const response = await api.get<ApiResponse<AnalisisOcupacionApi[]>>('/analisis-ocupacion');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener análisis');
    }
    return response.data.data.map(normalizarAnalisis);
  },

  async get(id: number): Promise<AnalisisOcupacion> {
    const response = await api.get<ApiResponse<AnalisisOcupacionApi>>(`/analisis-ocupacion/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener análisis');
    }
    return normalizarAnalisis(response.data.data);
  },

  async create(input: AnalisisOcupacionInput): Promise<AnalisisOcupacion> {
    const response = await api.post<ApiResponse<AnalisisOcupacionApi>>('/analisis-ocupacion', input);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al crear análisis');
    }
    return normalizarAnalisis(response.data.data);
  },

  async update(id: number, input: Partial<AnalisisOcupacionInput>): Promise<AnalisisOcupacion> {
    const response = await api.put<ApiResponse<AnalisisOcupacionApi>>(`/analisis-ocupacion/${id}`, input);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al actualizar análisis');
    }
    return normalizarAnalisis(response.data.data);
  },

  async delete(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<unknown>>(`/analisis-ocupacion/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al eliminar análisis');
    }
  },

  /**
   * Construye la matriz inventario × columna (día/semana/mes) del periodo. Cada
   * reserva se coloca en TODAS las columnas que se traslapan con su
   * [inicio_periodo, fin_periodo], no solo en la de su fecha de inicio.
   */
  async buildMatriz(inventarios: InventarioResumen[], periodo: PeriodoAnalisis): Promise<MatrizOcupacion> {
    const columnas = generarColumnas(periodo);
    const celdas: Record<number, Record<string, CeldaOcupacion>> = {};
    const inventariosConError: number[] = [];

    for (const inv of inventarios) {
      const fila: Record<string, CeldaOcupacion> = {};
      for (const col of columnas) fila[col.key] = { ocupado: false, campanas: [] };
      celdas[inv.id] = fila;
    }

    const cargarInventario = async (inv: InventarioResumen) => {
      const fila = celdas[inv.id];
      try {
        const data = await inventariosService.getHistorial(inv.id);
        for (const h of data.historial) {
          const inicio = fechaISO(h.inicio_periodo);
          if (!inicio) continue;
          const finReserva = fechaISO(h.fin_periodo);
          const fin = finReserva && finReserva >= inicio ? finReserva : inicio;
          const [desde, hasta] = indicesTraslapados(columnas, inicio, fin);
          if (desde > hasta) continue;
          const card: CampanaEnCelda = {
            reserva_id: h.reserva_id,
            reserva_estatus: h.reserva_estatus,
            campana_id: h.campana_id,
            campana_nombre: h.campana_nombre,
            cliente_nombre: h.cliente_nombre,
            propuesta_id: h.propuesta_id,
            inicio_periodo: inicio,
            fin_periodo: fin,
            articulo: h.articulo ?? null,
            aps: h.APS ?? null,
            grupo_completo_id: h.grupo_completo_id ?? null,
            posted: Boolean(h.posted),
          };
          for (let i = desde; i <= hasta; i++) {
            const celda = fila[columnas[i].key];
            celda.ocupado = true;
            celda.campanas.push(card);
          }
        }
      } catch {
        // La fila queda sin reservas; la vista avisa que no se pudo cargar.
        inventariosConError.push(inv.id);
      }
    };

    // Pool simple: N "trabajadores" van tomando inventarios de la cola.
    let siguiente = 0;
    const trabajador = async () => {
      while (siguiente < inventarios.length) {
        const inv = inventarios[siguiente++];
        await cargarInventario(inv);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCIA_HISTORIAL, inventarios.length) }, trabajador)
    );

    return { inventarios, periodo, columnas, celdas, inventariosConError };
  },
};
