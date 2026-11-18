/**
 * Feature flags de la app. Permiten desactivar funcionalidad nueva sin quitar el
 * código, para poder mergear a main mientras se prueba en una rama.
 */

/**
 * Selección masiva de circuitos (checkboxes + barra "Eliminar seleccionados") en
 * los modales de solicitudes, propuestas y campañas.
 *
 * Ponlo en `true` para habilitarlo. Mientras esté en `false` se ocultan los
 * checkboxes y la barra de acciones masivas; el borrado individual (bote de
 * basura) sigue funcionando normal.
 */
export const BULK_DELETE_ENABLED = false;

/**
 * Autorizaciones de Dirección (DG/DCM) por circuito. En el demo están apagadas
 * (el back aprueba todo): no se pide Nota de Dirección al guardar ni se muestran
 * filtros, bitácoras ni preferencias de autorización.
 */
export const AUTORIZACIONES_DIRECCION_ENABLED = false;

/**
 * Autorización para eliminar circuitos de una campaña. En el demo está apagada:
 * el circuito se elimina directo, sin pedir motivo para Gerencia.
 */
export const AUTORIZACION_ELIMINACION_ENABLED = false;
