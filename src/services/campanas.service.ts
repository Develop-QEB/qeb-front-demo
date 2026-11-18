import api from '../lib/api';
import { Campana, CampanaStats, PaginatedResponse, ApiResponse, ComentarioTarea, CampanaWithComments } from '../types';
import type { ReservaHistorialItem } from './propuestas.service';

export type { CampanaWithComments };

/** Pieza que el backend NO pudo reservar, con su motivo. Permite decirle al
 *  usuario exactamente qué falló en vez de solo un contador. */
export interface ReservaOmitida {
  inventario_id: number;
  codigo_unico: string | null;
  motivo: string;
}

export interface ImagenDigital {
  id: number;
  idReserva: number;
  archivo: string;
  archivoData?: string; // URL de Cloudinary o Base64 data URL
  comentario: string;
  estado: string;
  respuesta: string;
  spot: number;
  tipo: 'image' | 'video';
  nombre_arte?: string | null; // Nombre manual capturado en la carga (reemplaza al slug del archivo)
  estatus_operaciones?: string | null; // Texto manual de Estatus Operaciones (ficha)
  nombre_generico?: string | null; // Valor único compartido por todos los artes del batch (modo Genérico)
}

export interface DigitalFileSummary {
  idReserva: number;
  totalArchivos: number;
  countImagenes: number;
  countVideos: number;
}

export interface ArteTradicional {
  id: number;
  idReserva: number;
  archivo: string;
  nota: string;
  spot: number;
  createdAt: string | null;
  nombre_arte?: string | null; // Nombre manual capturado en la carga (reemplaza al slug del archivo)
  estatus_operaciones?: string | null; // Texto manual de Estatus Operaciones (ficha)
  nombre_generico?: string | null; // Valor único compartido por todos los artes del batch (modo Genérico)
}

export interface TradicionalFileSummary {
  idReserva: number;
  totalArchivos: number;
  firstNota: string;
}

export interface FichasTecnicasNode {
  name: string;
  type: 'folder' | 'file';
  path?: string;
  ext?: string;
  children?: FichasTecnicasNode[];
}

export interface InventarioReservado {
  rsv_ids: string;
  id: number;
  codigo_unico: string;
  solicitud_caras_id: number | null;
  mueble: string | null;
  tipo_de_mueble: string | null;
  estado: string | null;
  tipo_de_cara: string | null;
  caras_totales: number;
  caras_bonificadas: number;
  caras_renta: number;
  latitud: number;
  longitud: number;
  plaza: string | null;
  estatus_reserva: string | null;
  estatus_inventario: string | null;
  articulo: string | null;
  tipo_medio: string | null;
  inicio_periodo: string | null;
  fin_periodo: string | null;
  // Horario diario del circuito digital (feature Horario inicio/fin). null si no aplica.
  hora_inicio?: string | null;
  hora_fin?: string | null;
  tradicional_digital: string | null;
  grupo_completo_id: number | null;
  numero_catorcena?: number | null;
  anio_catorcena?: number | null;
  tarifa_publica?: number | null;
  tarifa_publica_sc?: number | null;
  tarifa_bruta_sc?: number | null; // tarifa publica SIN descuento (costo/caras) — para inversion
  formato?: string | null;
  bonificacion_sc?: number | null;
  renta?: number | null;
  ancho?: number | null;
  alto?: number | null;
  cortesia?: number | null; // 1 = cortesía (de solicitudCaras.cortesia), 0 = normal
}

export interface InventarioConAPS extends InventarioReservado {
  aps: number;
  arte_aprobado?: string | null;
  instalado?: boolean | null;
  estatus_arte?: 'Carga Artes' | 'Revision Artes' | 'Artes Aprobados' | 'En Impresion' | 'Artes Recibidos' | 'Instalado' | null;
  formato?: string | null;
  tarifa_publica_sc?: number | null;
  bonificacion_sc?: number | null;
  renta?: number | null;
  indicaciones_programacion?: string | null;
  indicaciones_instalacion?: string | null;
  archivo?: string | null;
  // true si el APS de este item ya se posteó a SAP (campaña posteada o APS en posted_aps).
  posted?: boolean;
}

export interface InventarioConArte {
  rsv_id: string;
  rsv_ids: string;
  id: number;
  codigo_unico: string;
  codigo_unico_display: string;
  ubicacion: string | null;
  tipo_de_cara: string | null;
  tipo_de_cara_display: string | null;
  cara: string | null;
  mueble: string | null;
  latitud: number;
  longitud: number;
  plaza: string | null;
  estado: string | null;
  municipio: string | null;
  tipo_de_mueble: string | null;
  ancho: number;
  alto: number;
  nivel_socioeconomico: string | null;
  tarifa_publica: number | null;
  tradicional_digital: string | null;
  archivo: string | null;
  epInId: string | null;
  estatus: string | null;
  rsvId: string | null;
  arte_aprobado: string | null;
  APS: number | null;
  inicio_periodo: string | null;
  fin_periodo: string | null;
  comentario_rechazo: string | null;
  instalado: boolean | null;
  rsvAPS: number | null;
  tarea: string | null;
  status_mostrar: string | null;
  caras_totales: number;
  IMU: number | null;
  articulo: string | null;
  tipo_medio: string | null;
  numero_catorcena: number | null;
  anio_catorcena: number | null;
  grupo_completo_id: number | null;
  grupo: number | null;
  artes_multiples: string | null;
  // JSON string con [{archivo, nota, spot}] por reserva. Permite mostrar
  // varios artes (spots) por reserva con sus notas en la galería del Versionario.
  artes_detalle?: string | null;
}

export interface SolicitudCara {
  id: number;
  idquote: number;
  ciudad: string | null;
  estados: string | null;
  tipo: string | null;
  flujo: string | null;
  bonificacion: number | null;
  caras: number | null;
  nivel_socioeconomico: string | null;
  formato: string | null;
  costo: number | null;
  tarifa_publica: number | null;
  inicio_periodo: string | null;
  fin_periodo: string | null;
  caras_flujo: number | null;
  caras_contraflujo: number | null;
  articulo: string | null;
  descuento: number | null;
  autorizacion_dg?: string | null;
  autorizacion_dcm?: string | null;
  // true si la cara tiene una tarea de eliminación abierta (Filtro GC o DG).
  pendiente_eliminacion?: boolean;
  // true si hay una tarea 'Filtro Autorización DG' abierta (gerente comercial
  // revisando antes de escalar a DG). Pinta embudo ambar junto al "Pend. DG".
  en_filtro_dg?: boolean;
  grupo_rt_bf?: number | null;
  cortesia?: number | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
}

export interface CampanaUpdateData {
  nombre?: string;
  status?: string;
  descripcion?: string;
  notas?: string;
  catorcenaInicioNum?: number;
  catorcenaInicioAnio?: number;
  catorcenaFinNum?: number;
  catorcenaFinAnio?: number;
  asignados?: string;
  id_asignado?: string;
  IMU?: boolean;
  cliente_id?: number;
  cuic?: number;
  razon_social?: string;
  marca_nombre?: string;
  asesor?: string;
  sap_database?: string;
}

export interface HistorialItem {
  id: number;
  tipo: string;
  ref_id: number;
  accion: string;
  fecha_hora: string;
  detalles: string | null;
}

// Interface para tareas de campaña
export interface TareaCampana {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  contenido: string | null;
  tipo: string | null;
  estatus: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  responsable: string | null;
  id_responsable: number;
  responsable_nombre: string | null;
  responsable_foto: string | null;
  correo_electronico: string | null;
  asignado: string | null;
  id_asignado: string | null;
  archivo: string | null;
  evidencia: string | null;
  ids_reservas: string | null;
  listado_inventario: string | null;
  proveedores_id: number | null;
  nombre_proveedores: string | null;
  num_impresiones: number | null;
  archivo_testigo: string | null;
  // Campos adicionales de la query con JOINs
  inventario_id?: string | null;
  APS?: string | null;
  tarea_reserva?: string | null;
  Archivo_reserva?: string | null;
}

export interface CreateTareaData {
  titulo: string;
  descripcion?: string;
  tipo?: string;
  fecha_fin?: string;
  id_responsable?: number;
  responsable?: string;
  asignado?: string;
  id_asignado?: string;
  ids_reservas?: string;
  proveedores_id?: number;
  nombre_proveedores?: string;
  evidencia?: string;
  // Campos para Impresión y Revisión de artes
  catorcena_entrega?: string;
  contenido?: string;
  listado_inventario?: string;
  impresiones?: Record<number, number>;
  num_impresiones?: number;
}

export interface ArteExistente {
  id: string;
  nombre: string;     // nombre del archivo (slug del URL)
  url: string;
  usos: number;
  // Campos opcionales para artes ya usados en el flujo (artes_tradicionales / imagenes_digitales).
  // Para artes recien subidos via addedArtes (sin guardar aun), vienen null/undefined.
  nombre_arte?: string | null; // nombre manual capturado en el modal de carga
  nota?: string | null;        // nota asociada (artes_tradicionales.nota o imagenes_digitales.comentario)
  estatus_operaciones?: string | null; // texto manual de Estatus Operaciones (ficha)
  nombre_generico?: string | null;     // valor único compartido por el batch (modo Genérico)
  estatus?: string | null;     // estatus del arte (Aprobado / Rechazado / Pendiente / etc.)
  tiene_instalado?: boolean;   // true si alguna reserva que usa este arte ya esta instalada
  // Jos 2026-10-12: marca ADICIONAL. Si true, el arte proviene de una prueba
  // de color aprobada; se muestra un badge extra en la biblioteca sin
  // reemplazar las etiquetas del flujo (Instalado, Pendiente, etc.).
  origen_prueba_color?: boolean;
  prueba_color_version?: number | null;
  prueba_color_enlace_externo?: string | null;
  // Jos 2026-10-23: 'prueba_color' | 'revision_anticipada'. Define el prefijo
  // del badge (PC vN vs RA vN) en la biblioteca de artes.
  prueba_color_tipo?: 'prueba_color' | 'revision_anticipada' | null;
}

// Órdenes de Montaje
export interface OrdenMontajeCAT {
  plaza: string | null;
  tipo: string | null; // formato
  asesor: string | null;
  aps_especifico: string | null;
  aps_global: number | null;
  tipo_periodo?: string | null;
  sap_database?: string | null;
  bd_sap_post?: string | null; // BD SAP congelada del POST (por circuito); null si sin post
  cuic: number | null;
  fecha_inicio_periodo: string | null;
  fecha_fin_periodo: string | null;
  // Horario diario del circuito digital (feature Horario inicio/fin). null si no aplica.
  hora_inicio?: string | null;
  hora_fin?: string | null;
  cliente: string | null;
  marca: string | null;
  unidad_negocio: string | null;
  campania: string | null;
  numero_articulo: string | null;
  negociacion: 'BONIFICACION' | 'RENTA' | 'CORTESIA' | 'INTERCAMBIO' | 'IMPRESION' | 'RESERVADO' | 'DISPONIBLE';
  caras: number;
  tarifa: number | null;
  monto_total: number | null;
  delta_caras: number;
  campania_id: number | null;
  grupo_id: number | null;
  tipo_fila: string | null;
  catorcena_numero: number | null;
  catorcena_year: number | null;
  tradicional_digital: string | null;
  posted?: boolean;
  // Ocupación de la pieza en el período: 'vendido' (fila de campaña), 'reservado'
  // (hold de propuesta) o 'disponible' (libre). Presente en modos disponible/todo.
  ocupacion_estado?: 'vendido' | 'reservado' | 'disponible' | null;
}

export interface OrdenMontajeINVIAN {
  Campania: string | null;
  Anunciante: string | null;
  Operacion: string | null;
  CodigoContrato: number | null;
  // idquote (APS Global) y campania_id — no se renderizan en la tabla, pero
  // entran al haystack del buscador para poder filtrar por id de campania.
  idquote?: number | null;
  campania_id?: number | null;
  PrecioPorCara: number | null;
  Vendedor: string | null;
  Descripcion: string | null;
  InicioPeriodo: string | null;
  FinSegmento: string | null;
  Arte: string | null;
  CodigoArte: number | null;
  ArteUrl: string | null;
  ArteFileName: string | null;
  OrigenArte: string | null;
  Unidad: string | null;
  Cara: string | null;
  Ciudad: string | null;
  TipoDistribucion: string | null;
  Reproducciones: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  status_campania: string | null;
  catorcena_numero: number | null;
  catorcena_year: number | null;
  rsv_id?: number | null;
  tradicional_digital?: string | null;
  indicaciones?: string | null;
  num_artes_digitales?: number | null;
  nombres_artes_digitales?: string | null;
  nombres_archivo_data?: string | null;
  // Orden de Montaje: nombre_arte MANUAL, notas y URL de DO (separados por coma
  // cuando hay varios artes). Aplica a digital y tradicional.
  nombre_arte_manual?: string | null;
  notas_artes?: string | null;
  urls_artes_do?: string | null;
  cortesia?: number | null;
  numero_articulo?: string | null;
  cto?: string | null;
  sap_database?: string | null;
  bd_sap_post?: string | null; // BD SAP congelada del POST (por circuito); null si sin post
  posted?: boolean;
  // Para "Inventario UN+": formato (mueble) y tipo de periodo (mensual/catorcena).
  formato?: string | null;
  tipo_periodo?: string | null;
  // Ocupación de la pieza en el período: 'vendido' (fila de campaña), 'reservado'
  // (hold de propuesta) o 'disponible' (libre). Presente en modos disponible/todo.
  ocupacion_estado?: 'vendido' | 'reservado' | 'disponible' | null;
}

export interface ComentarioRevisionArte {
  id: number;
  tarea_id: number;
  autor_id: number;
  autor_nombre: string;
  contenido: string;
  fecha: string;
}

// Detectar si es campaña migrada desde INVIAN
export function isMigratedCampaign(campana: CampanaWithComments): boolean {
  return campana.comentario_cambio_status === 'Migrado desde INVIAN';
}

export interface CampanasParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  yearInicio?: number;
  yearFin?: number;
  catorcenaInicio?: number;
  catorcenaFin?: number;
  tipoPeriodo?: string;
  cambioEstatusDesde?: string;
  cambioEstatusHasta?: string;
  creacionDesde?: string;
  creacionHasta?: string;
  // Nuevo filtro unificado (HistorialFilterPopover)
  modo?: 'creacion' | 'cambio_estatus';
  fechaDesde?: string;
  fechaHasta?: string;
  estatusValor?: string;
  excludeRechazadas?: boolean;
  // Filtro por autorización de circuitos (claves CSV: pend_dg,rechazado,...)
  // y fechas de último cambio por fila para el orden "Último cambio".
  // Ver lib/autorizacionFiltro.
  autorizacion?: string;
  includeCambios?: boolean;
}

export const campanasService = {
  async getAll(params: CampanasParams = {}): Promise<PaginatedResponse<Campana>> {
    const response = await api.get<PaginatedResponse<Campana>>('/campanas', { params });
    return response.data;
  },

  async getExportLayout(params: Omit<CampanasParams, 'page' | 'limit'> = {}): Promise<{
    inventarios: any[];
    campaignInfo: any[];
    campaignsWithInventory: number[];
  }> {
    const response = await api.get<ApiResponse<any>>('/campanas/export-layout', { params, timeout: 120000 });
    return response.data.data;
  },

  async getBatchInversiones(ids: number[]): Promise<Record<number, Record<string, { inversion: number; circuitos: number; bonificadas: number; carasNetas: number }>>> {
    const response = await api.post<ApiResponse<Record<number, Record<string, { inversion: number; circuitos: number; bonificadas: number; carasNetas: number }>>>>('/campanas/batch-inversiones', { ids });
    return response.data.data || {};
  },

  async getBatchInversionesCostoPorCatorcena(ids: number[]): Promise<Record<number, Record<string, { inversion: number }>>> {
    const response = await api.post<ApiResponse<Record<number, Record<string, { inversion: number }>>>>('/campanas/batch-inversiones-costo', { ids });
    return response.data.data || {};
  },

  async getById(id: number): Promise<CampanaWithComments> {
    const response = await api.get<ApiResponse<CampanaWithComments>>(`/campanas/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener campana');
    }
    return response.data.data;
  },

  async updateStatus(id: number, status: string): Promise<Campana> {
    const response = await api.patch<ApiResponse<Campana>>(`/campanas/${id}/status`, { status });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al actualizar status');
    }
    return response.data.data;
  },

  // `ids`: universo explícito de campañas (cuando la página filtra en
  // cliente). Va por POST en el body para no reventar el límite de URL.
  async getStats(params?: Omit<CampanasParams, 'page' | 'limit'> & { ids?: number[] }): Promise<CampanaStats> {
    const { ids, ...query } = params || {};
    const response = ids
      ? await api.post<ApiResponse<CampanaStats>>('/campanas/stats', { ids }, { params: query })
      : await api.get<ApiResponse<CampanaStats>>('/campanas/stats', { params: query });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener estadisticas');
    }
    return response.data.data;
  },

  async addComment(id: number, contenido: string): Promise<ComentarioTarea> {
    const response = await api.post<ApiResponse<ComentarioTarea>>(`/campanas/${id}/comentarios`, { contenido });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al agregar comentario');
    }
    return response.data.data;
  },

  async getInventarioReservado(id: number): Promise<InventarioReservado[]> {
    const response = await api.get<ApiResponse<InventarioReservado[]>>(`/campanas/${id}/inventario`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener inventario reservado');
    }
    return response.data.data;
  },

  async getInventarioConAPS(id: number): Promise<InventarioConAPS[]> {
    const response = await api.get<ApiResponse<InventarioConAPS[]>>(`/campanas/${id}/inventario-aps`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener inventario con APS');
    }
    return response.data.data;
  },

  async getBatchInventarios(ids: number[]): Promise<Record<number, InventarioConAPS[]>> {
    const response = await api.get<ApiResponse<Record<number, InventarioConAPS[]>>>(`/campanas/batch-inventarios`, {
      params: { ids: ids.join(',') },
      timeout: 120000,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener inventarios batch');
    }
    return response.data.data;
  },

  async assignAPS(id: number, inventarioIds: number[], solicitudCarasIds?: number[], rsvIds?: number[]): Promise<{ aps: number; message: string }> {
    const response = await api.post<ApiResponse<{ aps: number; message: string }>>(`/campanas/${id}/assign-aps`, { inventarioIds, campanaId: id, solicitudCarasIds, rsvIds });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al asignar APS');
    }
    return response.data.data;
  },

  async sendAuthorizationPIN(codigo: string, solicitante: string, campana: string): Promise<void> {
    const response = await api.post<{ success: boolean; message: string }>('/correos/send-pin', {
      codigo,
      solicitante,
      campana,
    });
    if (!response.data.success) {
      throw new Error('Error al enviar código de autorización');
    }
  },

  async removeAPS(id: number, reservaIds: number[], solicitudCarasIds: number[] = []): Promise<{ message: string; affected: number }> {
    const response = await api.post<ApiResponse<{ message: string; affected: number }>>(`/campanas/${id}/remove-aps`, { reservaIds, solicitudCarasIds });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al quitar APS');
    }
    return response.data.data;
  },

  async getCaras(id: number): Promise<SolicitudCara[]> {
    const response = await api.get<ApiResponse<SolicitudCara[]>>(`/campanas/${id}/caras`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener caras');
    }
    return response.data.data;
  },

  async update(id: number, data: CampanaUpdateData): Promise<Campana> {
    const response = await api.patch<ApiResponse<Campana>>(`/campanas/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al actualizar campaña');
    }
    return response.data.data;
  },

  async getHistorial(id: number): Promise<HistorialItem[]> {
    const response = await api.get<ApiResponse<HistorialItem[]>>(`/campanas/${id}/historial`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener historial');
    }
    return response.data.data;
  },

  async getInventarioConArte(id: number): Promise<InventarioConArte[]> {
    const response = await api.get<ApiResponse<InventarioConArte[]>>(`/campanas/${id}/inventario-arte`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener inventario con arte');
    }
    return response.data.data;
  },

  // ============================================================================
  // NUEVOS ENDPOINTS PARA GESTION DE ARTES
  // ============================================================================

  // includeWithoutAps=true incluye tambien items que aun no tienen APS asignado
  // (usado por el preview de Versionario Artes para que se vean circuitos pendientes).
  async getInventarioSinArte(id: number, opts?: { includeWithoutAps?: boolean; grouped?: boolean }): Promise<InventarioConArte[]> {
    const params: Record<string, string> = {};
    if (opts?.includeWithoutAps) params.includeWithoutAps = 'true';
    if (opts?.grouped) params.grouped = 'true';
    const response = await api.get<ApiResponse<InventarioConArte[]>>(`/campanas/${id}/inventario-sin-arte`, { params: Object.keys(params).length ? params : undefined });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener inventario sin arte');
    }
    return response.data.data;
  },

  // BULK: inventario (con+sin arte) de varias campañas en 1 request. Para el
  // Versionario de Artes (evita 2 llamadas por campaña).
  // Acepta `signal` (AbortController) y `timeout` para que el orquestador del
  // Versionario pueda cancelar requests en vuelo y rendirse en chunks colgados
  // en lugar de bloquear el wave completo con Promise.all.
  async getInventarioVersionarioBulk(
    ids: number[],
    opts?: { includeWithoutAps?: boolean; signal?: AbortSignal; timeout?: number }
  ): Promise<Record<string, { conArte: InventarioConArte[]; sinArte: InventarioConArte[] }>> {
    const params: Record<string, string> = { ids: ids.join(',') };
    if (opts?.includeWithoutAps) params.includeWithoutAps = 'true';
    const response = await api.get<ApiResponse<Record<string, { conArte: InventarioConArte[]; sinArte: InventarioConArte[] }>>>(
      `/campanas/inventario-versionario-bulk`,
      { params, signal: opts?.signal, timeout: opts?.timeout },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener inventario bulk');
    }
    return response.data.data;
  },

  async getInventarioTestigos(id: number): Promise<InventarioConArte[]> {
    const response = await api.get<ApiResponse<InventarioConArte[]>>(`/campanas/${id}/inventario-testigos`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener inventario para testigos');
    }
    return response.data.data;
  },

  async assignArte(id: number, reservaIds: number[], archivo: string, markInstalado: boolean = false, instalacionMode?: 'instalado' | 'rotacion', operacionesAsignados?: { ids: number[]; nombres: string[] } | null): Promise<{ message: string; affected: number; marked_instalado?: boolean }> {
    const opsPayload = (markInstalado && operacionesAsignados && operacionesAsignados.ids.length > 0)
      ? {
          idAsignadoOperaciones: operacionesAsignados.ids.join(','),
          asignadoOperaciones: operacionesAsignados.nombres.join(','),
        }
      : {};
    const response = await api.post<ApiResponse<{ message: string; affected: number; marked_instalado?: boolean }>>(`/campanas/${id}/assign-arte`, {
      reservaIds,
      archivo,
      ...(markInstalado ? { markInstalado: true, instalacionMode: instalacionMode || 'instalado' } : {}),
      ...opsPayload,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al asignar arte');
    }
    return response.data.data;
  },

  async assignArteDigital(
    id: number,
    reservaIds: number[],
    archivos: { archivo: string; spot: number; nombre: string; tipo: string; nota?: string; nombre_arte?: string | null; estatus_operaciones?: string | null; nombre_generico?: string | null; cantidad_inicial?: number | null }[],
    markInstalado: boolean = false,
    instalacionMode?: 'instalado' | 'rotacion',
    operacionesAsignados?: { ids: number[]; nombres: string[] } | null
  ): Promise<{ message: string; affected: number; marked_instalado?: boolean }> {
    const opsPayload = (markInstalado && operacionesAsignados && operacionesAsignados.ids.length > 0)
      ? {
          idAsignadoOperaciones: operacionesAsignados.ids.join(','),
          asignadoOperaciones: operacionesAsignados.nombres.join(','),
        }
      : {};
    const response = await api.post<ApiResponse<{ message: string; affected: number; marked_instalado?: boolean }>>(`/campanas/${id}/assign-arte-digital`, {
      reservaIds,
      archivos,
      ...(markInstalado ? { markInstalado: true, instalacionMode: instalacionMode || 'instalado' } : {}),
      ...opsPayload,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al asignar arte digital');
    }
    return response.data.data;
  },

  async getImagenesDigitales(campanaId: number, reservaId: number | string): Promise<ImagenDigital[]> {
    const response = await api.get<ApiResponse<ImagenDigital[]>>(`/campanas/${campanaId}/imagenes-digitales/${reservaId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener imágenes digitales');
    }
    return response.data.data;
  },

  // BULK: todas las imágenes digitales de la campaña en 1 request, con el
  // id_reserva REAL de cada archivo. Usado por el Versionario al descargar Excel.
  async getImagenesDigitalesBulk(
    campanaId: number,
    opts?: { signal?: AbortSignal; timeout?: number }
  ): Promise<ImagenDigital[]> {
    const response = await api.get<ApiResponse<ImagenDigital[]>>(
      `/campanas/${campanaId}/imagenes-digitales-bulk`,
      { signal: opts?.signal, timeout: opts?.timeout },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener imágenes digitales bulk');
    }
    return response.data.data;
  },

  async getReservaArchivo(campanaId: number, reservaId: number): Promise<string | null> {
    const response = await api.get<ApiResponse<{ archivo: string | null }>>(`/campanas/${campanaId}/reserva-archivo/${reservaId}`);
    if (!response.data.success || !response.data.data) {
      return null;
    }
    return response.data.data.archivo;
  },

  async getDigitalFileSummaries(campanaId: number): Promise<DigitalFileSummary[]> {
    const response = await api.get<ApiResponse<DigitalFileSummary[]>>(`/campanas/${campanaId}/digital-file-summaries`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener resumen de archivos digitales');
    }
    return response.data.data;
  },

  /**
   * Eliminar archivos digitales
   * Modo 1: Por imageIds (elimina registros específicos)
   * Modo 2: Por archivos + reservaIds (elimina de múltiples reservas a la vez)
   */
  async deleteImagenesDigitales(
    campanaId: number,
    imageIds?: number[],
    archivos?: string[],
    reservaIds?: number[]
  ): Promise<void> {
    const data: { imageIds?: number[]; archivos?: string[]; reservaIds?: number[] } = {};

    if (archivos && archivos.length > 0 && reservaIds && reservaIds.length > 0) {
      // Modo 2: Eliminar por archivos + reservaIds
      data.archivos = archivos;
      data.reservaIds = reservaIds;
    } else if (imageIds && imageIds.length > 0) {
      // Modo 1: Eliminar por imageIds
      data.imageIds = imageIds;
    } else {
      throw new Error('Se requiere imageIds o (archivos + reservaIds)');
    }

    const response = await api.delete<ApiResponse<{ message: string }>>(`/campanas/${campanaId}/imagenes-digitales`, {
      data,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al eliminar archivos digitales');
    }
  },

  async addArteDigital(
    campanaId: number,
    reservaIds: number[],
    archivos: Array<{ archivo: string; spot: number; nombre: string; tipo: string }>
  ): Promise<{ message: string; affected: number; files: string[] }> {
    const response = await api.post<ApiResponse<{ message: string; affected: number; files: string[] }>>(
      `/campanas/${campanaId}/add-arte-digital`,
      { reservaIds, archivos }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al agregar arte digital');
    }
    return response.data.data;
  },

  async assignArteTradicional(
    id: number,
    reservaIds: number[],
    archivos: { archivo: string; nota: string; spot: number; nombre_arte?: string | null; estatus_operaciones?: string | null; nombre_generico?: string | null; cantidad_inicial?: number | null }[],
    markInstalado: boolean = false,
    instalacionMode?: 'instalado' | 'rotacion',
    operacionesAsignados?: { ids: number[]; nombres: string[] } | null
  ): Promise<{ message: string; affected: number; marked_instalado?: boolean }> {
    const opsPayload = (markInstalado && operacionesAsignados && operacionesAsignados.ids.length > 0)
      ? {
          idAsignadoOperaciones: operacionesAsignados.ids.join(','),
          asignadoOperaciones: operacionesAsignados.nombres.join(','),
        }
      : {};
    const response = await api.post<ApiResponse<{ message: string; affected: number; marked_instalado?: boolean }>>(`/campanas/${id}/assign-arte-tradicional`, {
      reservaIds,
      archivos,
      ...(markInstalado ? { markInstalado: true, instalacionMode: instalacionMode || 'instalado' } : {}),
      ...opsPayload,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al asignar arte tradicional');
    }
    return response.data.data;
  },

  async getArtesTradicionales(campanaId: number, reservaId: number | string): Promise<ArteTradicional[]> {
    const response = await api.get<ApiResponse<ArteTradicional[]>>(`/campanas/${campanaId}/artes-tradicionales/${reservaId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener artes tradicionales');
    }
    return response.data.data;
  },

  async getTradicionalFileSummaries(campanaId: number): Promise<TradicionalFileSummary[]> {
    const response = await api.get<ApiResponse<TradicionalFileSummary[]>>(`/campanas/${campanaId}/tradicional-file-summaries`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener resumen de artes tradicionales');
    }
    return response.data.data;
  },

  async checkReservasTareas(id: number, reservaIds: number[]): Promise<{
    hasTareas: boolean;
    tareas: Array<{ id: number; titulo: string | null; tipo: string | null; estatus: string | null; responsable: string | null }>;
  }> {
    const response = await api.post<ApiResponse<{
      hasTareas: boolean;
      tareas: Array<{ id: number; titulo: string | null; tipo: string | null; estatus: string | null; responsable: string | null }>;
    }>>(`/campanas/${id}/check-reservas-tareas`, { reservaIds });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al verificar tareas');
    }
    return response.data.data;
  },

  async uploadArteFile(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>>('/uploads/arte', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al subir archivo');
    }
    return response.data.data;
  },

  async uploadTestigoFile(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    // Forzar filename para que multer no lo pierda. Antes al hacer append(file, file)
    // sin nombre explicito, en algunos entornos el mimetype/nombre no llegaba y
    // multer terminaba pasando 96 bytes de basura en vez del binario real.
    formData.append('file', file, file.name || `foto-${Date.now()}.jpg`);

    // NO setear Content-Type manualmente. Axios/browser lo pone con boundary=
    // ----XXX que multer necesita para parsear el multipart. Si lo hardcodeas
    // como "multipart/form-data" sin boundary el body se corrompe.
    const response = await api.post<ApiResponse<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>>('/uploads/testigo', formData);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al subir archivo de testigo');
    }
    return response.data.data;
  },

  async getFichasTecnicasTree(): Promise<FichasTecnicasNode[]> {
    const response = await api.get<ApiResponse<FichasTecnicasNode[]>>('/fichas-tecnicas/tree');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener fichas técnicas');
    }
    return response.data.data;
  },

  async openFichaTecnica(filePath: string): Promise<void> {
    const response = await api.get<ApiResponse<{ url: string }>>(`/fichas-tecnicas/file`, {
      params: { path: filePath },
    });
    if (!response.data.success || !response.data.data?.url) {
      throw new Error('Error al obtener URL del archivo');
    }
    window.open(response.data.data.url, '_blank');
  },

  async updateArteStatus(
    id: number,
    reservaIds: number[],
    status: 'Aprobado' | 'Rechazado' | 'Pendiente',
    comentarioRechazo?: string
  ): Promise<{ message: string; affected: number }> {
    const response = await api.post<ApiResponse<{ message: string; affected: number }>>(`/campanas/${id}/arte-status`, {
      reservaIds,
      status,
      comentarioRechazo,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al actualizar estado de arte');
    }
    return response.data.data;
  },

  async completarCorreccionEnviarRevision(
    id: number,
    payload: {
      correccionId: number;
      reservaIds: number[];
      asignadoNombres: string;
      asignadoIds?: string;
    }
  ): Promise<{ message: string; nuevaRevisionId?: number; affected: number; alreadyDone?: boolean }> {
    const response = await api.post<ApiResponse<{ message: string; nuevaRevisionId?: number; affected: number; alreadyDone?: boolean }>>(
      `/campanas/${id}/completar-correccion`,
      payload
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al completar la corrección');
    }
    return response.data.data;
  },

  async updateArteEstatusOperaciones(
    campanaId: number,
    archivo: string,
    estatus_operaciones: string | null
  ): Promise<{ affected: number; tradicional: number; digital: number; archivo: string; estatus_operaciones: string | null }> {
    const response = await api.patch<ApiResponse<{ affected: number; tradicional: number; digital: number; archivo: string; estatus_operaciones: string | null }>>(
      `/campanas/${campanaId}/artes/estatus-operaciones`,
      { archivo, estatus_operaciones }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al actualizar estatus de operaciones');
    }
    return response.data.data;
  },

  async updateInstalado(
    id: number,
    reservaIds: number[],
    instalado: boolean,
    imagenTestigo?: string,
    fechaTestigo?: string
  ): Promise<{ message: string; affected: number }> {
    const response = await api.post<ApiResponse<{ message: string; affected: number }>>(`/campanas/${id}/instalado`, {
      reservaIds,
      instalado,
      imagenTestigo,
      fechaTestigo,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al actualizar estado de instalación');
    }
    return response.data.data;
  },

  // ============================================================================
  // TAREAS
  // ============================================================================

  async getTareas(id: number, options?: { estatus?: string; activas?: boolean }): Promise<TareaCampana[]> {
    const params: Record<string, string | boolean> = {};
    if (options?.estatus) params.estatus = options.estatus;
    if (options?.activas) params.activas = 'true';

    const response = await api.get<ApiResponse<TareaCampana[]>>(`/campanas/${id}/tareas`, {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener tareas');
    }
    return response.data.data;
  },

  async createTarea(id: number, data: CreateTareaData): Promise<TareaCampana> {
    const response = await api.post<ApiResponse<TareaCampana>>(`/campanas/${id}/tareas`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al crear tarea');
    }
    return response.data.data;
  },

  async updateTarea(id: number, tareaId: number, data: Partial<TareaCampana>): Promise<TareaCampana> {
    const response = await api.patch<ApiResponse<TareaCampana>>(`/campanas/${id}/tareas/${tareaId}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al actualizar tarea');
    }
    return response.data.data;
  },

  async enviarOrdenProgramacion(campanaId: number, tareaId: number): Promise<{
    orden: { id: number; estatus: string };
    programacion: { id: number; estatus: string };
  }> {
    const response = await api.post<ApiResponse<{
      orden: { id: number; estatus: string };
      programacion: { id: number; estatus: string };
    }>>(`/campanas/${campanaId}/tareas/${tareaId}/enviar-orden-programacion`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al enviar orden de programación');
    }
    return response.data.data;
  },

  async activarOrdenInstalacion(campanaId: number, tareaId: number): Promise<{
    orden: { id: number; estatus: string };
    instalacion: { id: number; estatus: string };
  }> {
    const response = await api.post<ApiResponse<{
      orden: { id: number; estatus: string };
      instalacion: { id: number; estatus: string };
    }>>(`/campanas/${campanaId}/tareas/${tareaId}/activar-orden-instalacion`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al activar orden de instalación');
    }
    return response.data.data;
  },

  async deleteTarea(id: number, tareaId: number): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/campanas/${id}/tareas/${tareaId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al eliminar tarea');
    }
  },

  async getUsuariosOperaciones(): Promise<{ id: number; nombre: string; area: string; puesto: string; user_role: string }[]> {
    const response = await api.get<ApiResponse<{ id: number; nombre: string; area: string; puesto: string; user_role: string }[]>>(`/campanas/usuarios/operaciones`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener usuarios de Operaciones');
    }
    return response.data.data;
  },

  async getArtesExistentes(id: number): Promise<ArteExistente[]> {
    const response = await api.get<ApiResponse<ArteExistente[]>>(`/campanas/${id}/artes-existentes`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener artes existentes');
    }
    return response.data.data;
  },

  // Akary 2026-11-13: persistir arte en biblioteca_artes DESDE que se sube
  // (antes solo entraba al completar assignArte*). Idempotente por
  // (campania_id, archivo). Si el POST falla el front debe seguir funcionando
  // con addedArtes (fallback), por eso el caller lo maneja con try/catch.
  async addToBibliotecaArtes(
    id: number,
    payload: {
      archivo: string;
      tipo: 'tradicional' | 'digital';
      nombre_arte?: string | null;
      nota?: string | null;
      estatus_operaciones?: string | null;
      nombre_generico?: string | null;
    },
  ): Promise<void> {
    const response = await api.post<ApiResponse<{ archivo: string; tipo: string }>>(
      `/campanas/${id}/biblioteca-artes`,
      payload,
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al persistir arte en biblioteca');
    }
  },

  async verificarArteExistente(id: number, params: { nombre?: string; url?: string }): Promise<{ existe: boolean; nombre: string; usos: number; url: string | null }> {
    const response = await api.post<ApiResponse<{ existe: boolean; nombre: string; usos: number; url: string | null }>>(
      `/campanas/${id}/verificar-arte`,
      params
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al verificar arte');
    }
    return response.data.data;
  },

async getUsuarios(): Promise<{ id: number; nombre: string }[]> {
    const response = await api.get<ApiResponse<{ id: number; nombre: string }[]>>('/campanas/usuarios/lista');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener usuarios');
    }
    return response.data.data;
  },

  // ============================================================================
  // ÓRDENES DE MONTAJE
  // ============================================================================

  async getOrdenMontajeCAT(params: {
    status?: string;
    catorcenaInicio?: number;
    catorcenaFin?: number;
    yearInicio?: number;
    yearFin?: number;
    ocupacion?: 'vendido' | 'disponible' | 'todo';
  } = {}): Promise<OrdenMontajeCAT[]> {
    const response = await api.get<ApiResponse<OrdenMontajeCAT[]>>('/campanas/ordenes-montaje/cat', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener orden de montaje CAT');
    }
    return response.data.data;
  },

  async getOrdenMontajeINVIAN(params: {
    status?: string;
    catorcenaInicio?: number;
    catorcenaFin?: number;
    yearInicio?: number;
    yearFin?: number;
    ocupacion?: 'vendido' | 'disponible' | 'todo';
  } = {}): Promise<OrdenMontajeINVIAN[]> {
    const response = await api.get<ApiResponse<OrdenMontajeINVIAN[]>>('/campanas/ordenes-montaje/invian', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener orden de montaje INVIAN');
    }
    return response.data.data;
  },

  // Comentarios de Revisión de Artes
  async getComentariosRevisionArte(campanaId: number, tareaId: string): Promise<ComentarioRevisionArte[]> {
    const response = await api.get<ApiResponse<ComentarioRevisionArte[]>>(`/campanas/${campanaId}/tareas/${tareaId}/comentarios-arte`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al obtener comentarios');
    }
    return response.data.data || [];
  },

  async addComentarioRevisionArte(campanaId: number, tareaId: string, contenido: string): Promise<ComentarioRevisionArte> {
    const response = await api.post<ApiResponse<ComentarioRevisionArte>>(`/campanas/${campanaId}/tareas/${tareaId}/comentarios-arte`, { contenido });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al agregar comentario');
    }
    return response.data.data;
  },

  async deleteComentarioRevisionArte(campanaId: number, comentarioId: number): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/campanas/${campanaId}/comentarios-arte/${comentarioId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al eliminar comentario');
    }
  },

  // ============================================================================
  // MÉTODOS PARA GESTIÓN DE RESERVAS (copiados de propuestas)
  // ============================================================================

  async getReservasForModal(campanaId: number): Promise<ReservaModalItem[]> {
    const response = await api.get<ApiResponse<ReservaModalItem[]>>(`/campanas/${campanaId}/reservas-modal`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener reservas');
    }
    return response.data.data;
  },

  async getReservasHistorial(campanaId: number): Promise<ReservaHistorialItem[]> {
    const response = await api.get<ApiResponse<ReservaHistorialItem[]>>(`/campanas/${campanaId}/reservas-historial`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al obtener historial');
    }
    return response.data.data;
  },

  async createReservas(
    campanaId: number,
    data: {
      reservas: Array<{
        inventario_id: number;
        tipo: string;
        latitud: number;
        longitud: number;
      }>;
      solicitudCaraId: number;
      clienteId: number;
      fechaInicio: string;
      fechaFin: string;
      agruparComoCompleto?: boolean;
    }
  ): Promise<{ calendarioId: number; reservasCreadas: number; reservasOmitidas?: number; omitidos?: ReservaOmitida[] }> {
    const response = await api.post<ApiResponse<{ calendarioId: number; reservasCreadas: number; reservasOmitidas?: number; omitidos?: ReservaOmitida[] }>>(
      `/campanas/${campanaId}/reservas`,
      data
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al crear reservas');
    }
    return response.data.data;
  },

  async deleteReservas(campanaId: number, reservaIds: number[]): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`/campanas/${campanaId}/reservas`, {
      data: { reservaIds },
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al eliminar reservas');
    }
  },

  async updateCara(campanaId: number, caraId: number, data: CaraUpdateData): Promise<SolicitudCara> {
    const response = await api.patch<ApiResponse<SolicitudCara>>(`/campanas/${campanaId}/caras/${caraId}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al actualizar cara');
    }
    return response.data.data;
  },

  async bulkUpdateCaras(campanaId: number, caras: { caraId: number; data: CaraUpdateData }[]): Promise<{ updated: SolicitudCara[]; message: string }> {
    const response = await api.patch<ApiResponse<SolicitudCara[]> & { message?: string }>(`/campanas/${campanaId}/caras/bulk`, { caras });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al actualizar caras en lote');
    }
    return { updated: response.data.data || [], message: response.data.message || '' };
  },

  async createCara(campanaId: number, data: CaraUpdateData): Promise<SolicitudCara> {
    const response = await api.post<ApiResponse<SolicitudCara>>(`/campanas/${campanaId}/caras`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Error al crear cara');
    }
    return response.data.data;
  },

  // En CAMPAÑAS, eliminar caras crea una solicitud de autorización (Filtro GC → DG)
  // en vez de borrar; la respuesta trae requiereAutorizacion + message. Se pueden
  // pasar cara-ids adicionales (ej. la pareja RT/BF) para que UNA sola solicitud
  // cubra todas y no se generen tareas separadas.
  async deleteCara(campanaId: number, caraId: number, eliminarGrupo?: boolean, caraIdsAdicionales?: number[], sinAutorizacion?: boolean, motivoEliminacion?: string): Promise<{ requiereAutorizacion?: boolean; message?: string; caras?: number }> {
    // sinAutorizacion=true: borra al momento (uso INTERNO: reemplazo de par BF en
    // edición). El borrado normal del usuario NO lo pasa → va por autorización.
    // motivoEliminacion: la "nota de eliminación" (por qué se borra) → viaja en la tarea.
    const qs = new URLSearchParams();
    if (eliminarGrupo) qs.set('eliminarGrupo', 'true');
    if (sinAutorizacion) qs.set('sinAutorizacion', 'true');
    const url = `/campanas/${campanaId}/caras/${caraId}${qs.toString() ? `?${qs.toString()}` : ''}`;
    const body: Record<string, unknown> = {};
    if (caraIdsAdicionales && caraIdsAdicionales.length > 0) body.caraIdsAdicionales = caraIdsAdicionales;
    if (motivoEliminacion && motivoEliminacion.trim()) body.motivoEliminacion = motivoEliminacion.trim();
    const hasBody = Object.keys(body).length > 0;
    const response = await api.delete<ApiResponse<void> & { requiereAutorizacion?: boolean; message?: string; caras?: number }>(url, hasBody ? { data: body } : undefined);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error al eliminar cara');
    }
    return (response.data as unknown) as { requiereAutorizacion?: boolean; message?: string; caras?: number };
  },
};

// Interfaces adicionales para reservas
export interface ReservaModalItem {
  reserva_id: number;
  espacio_id: number;
  inventario_id: number;
  codigo_unico: string;
  tipo_de_cara: string;
  latitud: number;
  longitud: number;
  plaza: string;
  formato: string;
  ubicacion: string | null;
  estatus: string;
  estatus_inventario: string | null;
  grupo_completo_id: number | null;
  solicitud_cara_id: number;
  aps: number | null;
  isla?: string | null;
  articulo?: string;
}

export interface CaraUpdateData {
  ciudad?: string;
  estados?: string;
  tipo?: string;
  flujo?: string;
  bonificacion?: number;
  caras?: number;
  nivel_socioeconomico?: string;
  formato?: string;
  costo?: number;
  tarifa_publica?: number;
  inicio_periodo?: string;
  fin_periodo?: string;
  caras_flujo?: number;
  caras_contraflujo?: number;
  articulo?: string;
  descuento?: number;
  grupo_rt_bf?: number | null;
  // Horario diario (solo circuitos DIGITALES): franja "HH:MM" para todo el rango.
  hora_inicio?: string;
  hora_fin?: string;
}
