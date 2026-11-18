/**
 * Texto VISIBLE de los estatus. El valor que se guarda en BD y que compara el
 * código no cambia (p.ej. 'Pase a ventas'); solo cambia lo que se muestra.
 * Usar en todo lugar que pinte un estatus (badges, selects, filtros, historial).
 */
export const ESTATUS_PROPUESTA_LABEL: Record<string, string> = {
  'Pase a ventas': 'Confirmar venta',
};

export function etiquetaEstatusPropuesta(status: string | null | undefined): string {
  if (!status) return '';
  return ESTATUS_PROPUESTA_LABEL[status] ?? status;
}

/**
 * Reemplaza los valores internos por su etiqueta dentro de un texto libre
 * (p.ej. "Atendido → Pase a ventas" en historial y notificaciones guardadas).
 */
export function etiquetarEstatusEnTexto(texto: string | null | undefined): string {
  if (!texto) return '';
  let out = texto;
  for (const [valor, etiqueta] of Object.entries(ESTATUS_PROPUESTA_LABEL)) {
    out = out.split(valor).join(etiqueta);
  }
  return out;
}
