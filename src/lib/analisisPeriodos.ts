/**
 * Periodos del Análisis de Ocupación por FECHAS (sin catorcenas).
 *
 * El demo ya no vende por catorcenas: el análisis de ocupación (y el bloqueo
 * masivo, que usa la misma matriz) trabaja con un rango libre de fechas que se
 * parte en columnas de días, semanas o meses. Aquí viven los tipos y los helpers
 * puros para armar esas columnas y saber qué columnas toca una reserva.
 *
 * Todas las fechas son strings 'YYYY-MM-DD' (fecha de calendario, sin hora). La
 * aritmética se hace en UTC para no sufrir corrimientos por zona horaria ni por
 * horario de verano: '2026-11-16' siempre es el 16 de noviembre.
 */

export type Granularidad = 'dia' | 'semana' | 'mes';

/** Periodo de un análisis. Es lo que se guarda en BD (columna `catorcenas_data`). */
export interface PeriodoAnalisis {
  /** Fecha inicial, inclusiva ('YYYY-MM-DD'). */
  inicio: string;
  /** Fecha final, inclusiva ('YYYY-MM-DD'). */
  fin: string;
  /** Cómo se parte el rango en columnas. */
  granularidad: Granularidad;
}

/** Una columna de la matriz: un día, una semana o un mes del rango (recortado al rango). */
export interface ColumnaPeriodo {
  /** Clave única y ordenable de la columna (= su fecha inicial). */
  key: string;
  /** Primer día que cubre la columna (inclusivo). */
  inicio: string;
  /** Último día que cubre la columna (inclusivo). */
  fin: string;
  /** Texto principal del encabezado: "16" (día), "16–22" (semana), "Nov" (mes). */
  etiqueta: string;
  /** Texto secundario del encabezado: inicial del día ("Lu") o días de un mes parcial ("18–30"). */
  detalle: string;
  /** Agrupador del encabezado: "Nov 2026" (día y semana) o "2026" (mes). */
  grupo: string;
  /** Descripción completa, para tooltips y CSV: "Lun 16 nov 2026", "Semana del 16 al 22 nov 2026"... */
  titulo: string;
  /** Sábado o domingo (solo aplica a la vista por día). */
  finDeSemana: boolean;
}

export interface GrupoColumnas {
  key: string;
  etiqueta: string;
  span: number;
}

export const GRANULARIDADES: Granularidad[] = ['dia', 'semana', 'mes'];

export const GRANULARIDAD_LABEL: Record<Granularidad, string> = {
  dia: 'Día',
  semana: 'Semana',
  mes: 'Mes',
};

/** Unidad de la granularidad en singular y plural, para textos tipo "30 columnas por día". */
export const GRANULARIDAD_UNIDAD: Record<Granularidad, { uno: string; varios: string }> = {
  dia: { uno: 'día', varios: 'días' },
  semana: { uno: 'semana', varios: 'semanas' },
  mes: { uno: 'mes', varios: 'meses' },
};

/** Granularidad automática: hasta 90 días se ve por día... */
export const DIAS_MAX_POR_DIA = 90;
/** ...hasta ~1 año por semana, y más largo por mes. */
export const DIAS_MAX_POR_SEMANA = 366;
/** Tope de columnas para que la matriz siga siendo usable (≈ un año por día). */
export const MAX_COLUMNAS = 370;
/** Rango máximo permitido (≈ 5 años). */
export const MAX_DIAS_RANGO = 1830;

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
// Índice = getUTCDay() (0 = domingo).
const DIAS_INICIAL = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const DIA_MS = 86_400_000;

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 'YYYY-MM-DD' → milisegundos UTC de esa medianoche. NaN si no es una fecha real. */
function aMs(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return NaN;
  const y = Number(m[1]);
  const mes = Number(m[2]) - 1;
  const d = Number(m[3]);
  const ms = Date.UTC(y, mes, d);
  const fecha = new Date(ms);
  // Date "corrige" fechas imposibles (2026-02-30 → 2 mar); las rechazamos.
  if (fecha.getUTCFullYear() !== y || fecha.getUTCMonth() !== mes || fecha.getUTCDate() !== d) return NaN;
  return ms;
}

function deMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Partes numéricas de una fecha ISO ya validada (mes base 0). */
function partes(iso: string): { y: number; m: number; d: number; dow: number } {
  const fecha = new Date(aMs(iso));
  return { y: fecha.getUTCFullYear(), m: fecha.getUTCMonth(), d: fecha.getUTCDate(), dow: fecha.getUTCDay() };
}

/** ¿Es un string 'YYYY-MM-DD' con una fecha real? */
export function esFechaISO(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(aMs(v));
}

/**
 * Normaliza una fecha que viene del back a 'YYYY-MM-DD'. Las columnas DATE
 * llegan como Date serializada ('2026-11-16T00:00:00.000Z'); se toma solo la
 * parte de fecha (nunca `new Date(...)` + hora local, que en CDMX la corre un día).
 */
export function fechaISO(v: unknown): string {
  if (!v) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  const corta = s.slice(0, 10);
  return esFechaISO(corta) ? corta : '';
}

export function sumarDias(iso: string, dias: number): string {
  return deMs(aMs(iso) + dias * DIA_MS);
}

/** Diferencia en días entre dos fechas (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((aMs(b) - aMs(a)) / DIA_MS);
}

/** Días que abarca un rango, contando ambos extremos. */
export function diasDelRango(inicio: string, fin: string): number {
  return diasEntre(inicio, fin) + 1;
}

/** Fecha de hoy en la zona horaria del usuario, como 'YYYY-MM-DD'. */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lunes de la semana de la fecha (semanas de lunes a domingo). */
export function inicioSemana(iso: string): string {
  const { dow } = partes(iso);
  return sumarDias(iso, -((dow + 6) % 7));
}

/** Último día del mes de la fecha. */
export function finDeMes(iso: string): string {
  const { y, m } = partes(iso);
  return deMs(Date.UTC(y, m + 1, 0));
}

export function esGranularidad(v: unknown): v is Granularidad {
  return v === 'dia' || v === 'semana' || v === 'mes';
}

/** ¿El rango tiene ambas fechas válidas y en orden? */
export function rangoEnOrden(inicio: string, fin: string): boolean {
  return esFechaISO(inicio) && esFechaISO(fin) && inicio <= fin;
}

/** Granularidad que corresponde al largo del rango: ≤ 90 días → día; ≤ ~1 año → semana; más → mes. */
export function granularidadAutomatica(inicio: string, fin: string): Granularidad {
  if (!rangoEnOrden(inicio, fin)) return 'dia';
  const dias = diasDelRango(inicio, fin);
  if (dias <= DIAS_MAX_POR_DIA) return 'dia';
  if (dias <= DIAS_MAX_POR_SEMANA) return 'semana';
  return 'mes';
}

/** Cuántas columnas tendría la matriz con ese rango y granularidad (sin generarlas). */
export function contarColumnas(inicio: string, fin: string, granularidad: Granularidad): number {
  if (!rangoEnOrden(inicio, fin)) return 0;
  if (granularidad === 'dia') return diasDelRango(inicio, fin);
  if (granularidad === 'semana') return diasEntre(inicioSemana(inicio), inicioSemana(fin)) / 7 + 1;
  const a = partes(inicio);
  const b = partes(fin);
  return (b.y - a.y) * 12 + (b.m - a.m) + 1;
}

/** ¿Esa granularidad deja la matriz dentro del tope de columnas? */
export function granularidadPermitida(inicio: string, fin: string, granularidad: Granularidad): boolean {
  const n = contarColumnas(inicio, fin, granularidad);
  return n > 0 && n <= MAX_COLUMNAS;
}

/** Valida un periodo. Devuelve el mensaje de error para el usuario, o null si es válido. */
export function validarPeriodo(p: PeriodoAnalisis): string | null {
  if (!esFechaISO(p.inicio) || !esFechaISO(p.fin)) return 'Elige la fecha inicial y la final.';
  if (p.fin < p.inicio) return 'La fecha final debe ser igual o posterior a la inicial.';
  if (diasDelRango(p.inicio, p.fin) > MAX_DIAS_RANGO) return 'El rango máximo es de 5 años.';
  if (!esGranularidad(p.granularidad)) return 'Elige si quieres ver la matriz por día, semana o mes.';
  const n = contarColumnas(p.inicio, p.fin, p.granularidad);
  if (n > MAX_COLUMNAS) {
    return `Son demasiadas columnas (${n}) para ver por ${GRANULARIDAD_UNIDAD[p.granularidad].uno}; elige una vista más amplia.`;
  }
  return null;
}

/**
 * Lee un periodo guardado (o recibido) y lo deja válido, o devuelve null si no
 * se puede. Si la granularidad falta o ya no cabe, se usa la automática.
 */
export function normalizarPeriodo(raw: unknown): PeriodoAnalisis | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const inicio = fechaISO(r.inicio);
  const fin = fechaISO(r.fin);
  if (!rangoEnOrden(inicio, fin)) return null;
  const auto: PeriodoAnalisis = { inicio, fin, granularidad: granularidadAutomatica(inicio, fin) };
  if (esGranularidad(r.granularidad)) {
    const guardado: PeriodoAnalisis = { inicio, fin, granularidad: r.granularidad };
    if (!validarPeriodo(guardado)) return guardado;
  }
  return validarPeriodo(auto) ? null : auto;
}

/**
 * Arma el periodo para un rango nuevo. La granularidad se ajusta sola al largo
 * del rango, salvo que el usuario la haya cambiado a mano (la anterior no era la
 * automática) y siga cabiendo en el rango nuevo: entonces se respeta.
 */
export function periodoConRango(inicio: string, fin: string, previo?: PeriodoAnalisis): PeriodoAnalisis {
  if (!rangoEnOrden(inicio, fin)) {
    // Rango incompleto mientras el usuario edita: conservamos la granularidad.
    return { inicio, fin, granularidad: previo?.granularidad ?? 'dia' };
  }
  const auto = granularidadAutomatica(inicio, fin);
  if (previo && rangoEnOrden(previo.inicio, previo.fin)) {
    const eraManual = previo.granularidad !== granularidadAutomatica(previo.inicio, previo.fin);
    if (eraManual && granularidadPermitida(inicio, fin, previo.granularidad)) {
      return { inicio, fin, granularidad: previo.granularidad };
    }
  }
  return { inicio, fin, granularidad: auto };
}

/** Periodo "próximos N días" contando hoy, con granularidad automática. */
export function periodoProximosDias(dias: number, hoy: string = hoyISO()): PeriodoAnalisis {
  const fin = sumarDias(hoy, dias - 1);
  return { inicio: hoy, fin, granularidad: granularidadAutomatica(hoy, fin) };
}

export interface AtajoPeriodo {
  id: string;
  label: string;
  inicio: string;
  fin: string;
}

/** Atajos del paso de periodo: este mes y los próximos 30, 60 y 90 días. */
export function atajosPeriodo(hoy: string = hoyISO()): AtajoPeriodo[] {
  const { y, m } = partes(hoy);
  const primeroDelMes = deMs(Date.UTC(y, m, 1));
  return [
    { id: 'este-mes', label: 'Este mes', inicio: primeroDelMes, fin: finDeMes(hoy) },
    { id: 'prox-30', label: 'Próximos 30 días', inicio: hoy, fin: sumarDias(hoy, 29) },
    { id: 'prox-60', label: 'Próximos 60 días', inicio: hoy, fin: sumarDias(hoy, 59) },
    { id: 'prox-90', label: 'Próximos 90 días', inicio: hoy, fin: sumarDias(hoy, 89) },
  ];
}

// ── Formato de fechas (sin zona horaria) ──────────────────────────────────────

/** "16 nov" */
export function fechaCorta(v: unknown): string {
  const iso = fechaISO(v);
  if (!iso) return '';
  const { m, d } = partes(iso);
  return `${d} ${MESES_CORTO[m]}`;
}

/** "16 nov 2026" */
export function fechaLarga(v: unknown): string {
  const iso = fechaISO(v);
  if (!iso) return '';
  const { y, m, d } = partes(iso);
  return `${d} ${MESES_CORTO[m]} ${y}`;
}

/** "16 nov – 30 nov" (rango de una reserva, como en las tarjetas). */
export function rangoCorto(inicio: unknown, fin: unknown): string {
  const a = fechaCorta(inicio);
  const b = fechaCorta(fin);
  if (!a || !b) return a || b || '';
  return a === b ? a : `${a} – ${b}`;
}

/** Rango legible con año: "16–30 nov 2026", "16 nov – 5 dic 2026", "28 dic 2026 – 3 ene 2027". */
export function rangoLegible(inicio: unknown, fin: unknown): string {
  const a = fechaISO(inicio);
  const b = fechaISO(fin);
  if (!a || !b) return fechaLarga(a || b);
  if (a === b) return fechaLarga(a);
  const pa = partes(a);
  const pb = partes(b);
  if (pa.y !== pb.y) return `${fechaLarga(a)} – ${fechaLarga(b)}`;
  if (pa.m !== pb.m) return `${pa.d} ${MESES_CORTO[pa.m]} – ${pb.d} ${MESES_CORTO[pb.m]} ${pb.y}`;
  return `${pa.d}–${pb.d} ${MESES_CORTO[pa.m]} ${pa.y}`;
}

/** "16 nov – 15 dic 2026 · por día" */
export function etiquetaPeriodo(p: PeriodoAnalisis): string {
  return `${rangoLegible(p.inicio, p.fin)} · por ${GRANULARIDAD_UNIDAD[p.granularidad].uno}`;
}

// ── Columnas de la matriz ─────────────────────────────────────────────────────

function columnaDia(iso: string): ColumnaPeriodo {
  const { y, m, d, dow } = partes(iso);
  return {
    key: iso,
    inicio: iso,
    fin: iso,
    etiqueta: String(d),
    detalle: DIAS_INICIAL[dow],
    grupo: `${capitalizar(MESES_CORTO[m])} ${y}`,
    titulo: `${DIAS_CORTO[dow]} ${d} ${MESES_CORTO[m]} ${y}`,
    finDeSemana: dow === 0 || dow === 6,
  };
}

function columnaSemana(inicio: string, fin: string): ColumnaPeriodo {
  const a = partes(inicio);
  const b = partes(fin);
  let titulo: string;
  if (inicio === fin) titulo = `Semana: ${fechaLarga(inicio)}`;
  else if (a.y !== b.y) titulo = `Semana del ${fechaLarga(inicio)} al ${fechaLarga(fin)}`;
  else if (a.m !== b.m) titulo = `Semana del ${a.d} ${MESES_CORTO[a.m]} al ${b.d} ${MESES_CORTO[b.m]} ${b.y}`;
  else titulo = `Semana del ${a.d} al ${b.d} ${MESES_CORTO[a.m]} ${a.y}`;
  return {
    key: inicio,
    inicio,
    fin,
    etiqueta: inicio === fin ? String(a.d) : `${a.d}–${b.d}`,
    detalle: '',
    grupo: `${capitalizar(MESES_CORTO[a.m])} ${a.y}`,
    titulo,
    finDeSemana: false,
  };
}

function columnaMes(inicio: string, fin: string): ColumnaPeriodo {
  const a = partes(inicio);
  const b = partes(fin);
  const completo = a.d === 1 && fin === finDeMes(inicio);
  const dias = a.d === b.d ? `${a.d}` : `${a.d}–${b.d}`;
  return {
    key: inicio,
    inicio,
    fin,
    etiqueta: capitalizar(MESES_CORTO[a.m]),
    detalle: completo ? '' : dias,
    grupo: String(a.y),
    titulo: completo ? `${MESES_LARGO[a.m]} ${a.y}` : `${MESES_LARGO[a.m]} ${a.y} (del ${dias.replace('–', ' al ')})`,
    finDeSemana: false,
  };
}

/**
 * Parte el rango en columnas. Las semanas van de lunes a domingo y los meses
 * son de calendario; la primera y la última se recortan al rango elegido.
 */
export function generarColumnas(p: PeriodoAnalisis): ColumnaPeriodo[] {
  if (validarPeriodo(p)) return [];
  const out: ColumnaPeriodo[] = [];
  let actual = p.inicio;
  // El tope de iteraciones es solo un seguro: validarPeriodo ya limita columnas.
  while (actual <= p.fin && out.length <= MAX_COLUMNAS) {
    if (p.granularidad === 'dia') {
      out.push(columnaDia(actual));
      actual = sumarDias(actual, 1);
      continue;
    }
    const finNatural = p.granularidad === 'semana' ? sumarDias(inicioSemana(actual), 6) : finDeMes(actual);
    const fin = finNatural < p.fin ? finNatural : p.fin;
    out.push(p.granularidad === 'semana' ? columnaSemana(actual, fin) : columnaMes(actual, fin));
    actual = sumarDias(fin, 1);
  }
  return out;
}

/**
 * Índices [desde, hasta] de las columnas que se traslapan con [inicio, fin].
 * Si no toca ninguna, desde > hasta. Las columnas vienen ordenadas y sin huecos,
 * así que basta una búsqueda binaria por cada extremo.
 */
export function indicesTraslapados(columnas: ColumnaPeriodo[], inicio: string, fin: string): [number, number] {
  // Primera columna que termina en o después del inicio.
  let lo = 0;
  let hi = columnas.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (columnas[mid].fin < inicio) lo = mid + 1;
    else hi = mid;
  }
  const desde = lo;
  // Primera columna que empieza después del fin; la anterior es la última que toca.
  hi = columnas.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (columnas[mid].inicio <= fin) lo = mid + 1;
    else hi = mid;
  }
  return [desde, lo - 1];
}

/** Columnas consecutivas con el mismo agrupador (mes o año), para la primera fila del encabezado. */
export function agruparColumnas(columnas: ColumnaPeriodo[]): GrupoColumnas[] {
  const out: GrupoColumnas[] = [];
  for (const c of columnas) {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.etiqueta === c.grupo) ultimo.span += 1;
    else out.push({ key: c.key, etiqueta: c.grupo, span: 1 });
  }
  return out;
}

/** ¿La columna incluye la fecha? (para marcar la columna de hoy). */
export function columnaIncluye(c: ColumnaPeriodo, iso: string): boolean {
  return c.inicio <= iso && iso <= c.fin;
}
