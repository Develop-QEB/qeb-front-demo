/**
 * screenContexts.ts
 *
 * Contextos de UI que se inyectan en el sistema prompt de QEBooh.
 * Clave: "<Pantalla>" o "<Pantalla>:<Modal>"
 * Valor: descripción en texto plano de lo que el usuario está viendo,
 *        sus campos, botones y cómo funciona cada uno.
 *
 * Versión demo: clientes de alta manual con ID Cliente, artículos de captura
 * manual (Operación + Clave), periodos por fechas libres y sin autorizaciones
 * de Dirección.
 */

export const SCREEN_CONTEXTS: Record<string, string> = {

  // ─────────────────────────── DASHBOARD ───────────────────────────
  'Dashboard': `El usuario está en el Dashboard (/dashboard), la pantalla de inicio del sistema. Los roles Director General y Director Comercial aterrizan en /notificaciones (Mis Tareas) al iniciar sesión; desde el menú pueden abrir el Dashboard.
Elementos visibles:
- Encabezado 'Resumen de Inventario' con indicador de periodo: 'Periodo Actual' (por defecto, el mes en curso) o 'Periodo Filtrado' si se eligió otro rango.
- Tarjetas KPI clickeables (filtran tabla, gráficas y mapa): Total (morado), Disponible (verde), Reservado (amarillo), Vendido (cyan), No Disponible (rosa). 'No Disponible' es el inventario bloqueado; también se le dice 'Bloqueado' o 'Inhabilitado'.
- Botón 'Filtros': Estado, Plaza, Formato, Tipo de formato, NSE y Periodo (fechas Inicio y Fin). El periodo arranca en el mes en curso y cuenta lo que se traslapa con el rango.
- Con el KPI Vendido activo aparece el botón 'Reporte ventas confirmadas' (descarga).
- Gráficas: Por Mueble, Por Tipo (Tradicional vs Digital), Por Plaza y Por Nivel Socioeconómico.
- Tabla 'Inventario Detallado' con filtrar, agrupar, ordenar y descarga CSV.
- Mapa de Inventario (Google Maps) con burbujas por plaza que se abren en pines individuales al acercar, y leyenda 'Densidad por Plaza' (clic = zoom a esa plaza).
- Actualización en tiempo real por WebSocket.
Nota: el dashboard es de solo lectura, no tiene acciones de edición ni creación.`,

  // ─────────────────────────── SOLICITUDES ───────────────────────────
  'Solicitudes': `El usuario está en el módulo de Solicitudes, primera etapa del flujo comercial.
Columnas de tabla: ID (morado), Fecha, Cliente (razón social + ID Cliente), Campaña, Marca, Presupuesto (verde MXN), Inicio, Fin (fechas del periodo), Asignado, Status y acciones. Arriba hay una tarjeta resumen 'Pendientes / Ajustar'.
VISTAS DISPONIBLES: selector compacto 'Vista Tabla' / 'Tablero' junto al botón Filtros (en pantallas chicas solo se ven los iconos). La estrella a su derecha FIJA la vista actual: el módulo abrirá siempre en ella para ese usuario (se guarda en localStorage del navegador; clic de nuevo para quitarla).
TABLERO: una columna por estatus (Pendiente, Ajustar, Aprobada, Atendida; Rechazada no tiene columna porque el listado la oculta por default). Cada tarjeta trae ID, cliente, campaña/marca, fecha de creación, periodo (rango de fechas), presupuesto, asesor, creador, formatos, el badge de estatus y la FECHA DE ÚLTIMA EDICIÓN. NO hay drag & drop. Clic en la tarjeta abre el mismo modal de detalle que el ojo de la tabla; el badge abre el modal de estatus. Al pie de cada tarjeta hay una fila de iconos de acción (Ver, Editar, Atender, Estatus, Rechazar): es EXACTAMENTE el mismo componente que la columna de acciones de la tabla, con los mismos permisos y candados. Una solicitud 'Atendida' ya se mandó a Propuestas y aquí no se edita, no cambia de estatus ni se rechaza (botones deshabilitados, modal en solo lectura).
FILTROS: búsqueda, filtros avanzados combinables (AND), chip Status, filtro de Historial (cambios de estatus o creación por fecha) y Agrupar (estatus, marca, asignado, cliente, asesor, creador). No hay filtro por tipo de periodo: todo se maneja por fechas.
MENÚ 'ORDENAR' (aplica a Tabla y Tablero): un botón abre tres criterios, cada uno con switch de sentido: 'Fecha de creación' (Nueva / Vieja), 'Presupuesto' (Alto / Bajo) y 'Último cambio' (Nueva / Vieja; default del tablero; dentro se elige qué cambios cuentan). Creación y presupuesto viajan al backend, así que la tabla sigue paginando; 'Último cambio' ordena en cliente con todo el universo. Además el chip 'Solo incompletos' = solicitudes SIN circuitos cargados.
VISTAS GUARDADAS (botón 'Vistas' junto a 'Filtros', disponible en Tabla y Tablero): una vista guarda con nombre TODO lo configurado: filtros de la barra (estatus, historial, agrupación, filtros avanzados, búsqueda), orden, 'Solo incompletos' y columnas del tablero. Se aplican con un clic (dejan la barra exactamente así), se renombran, actualizan y borran. Una puede marcarse como FIJA (estrella): se aplica sola al entrar al módulo; solo una fija por módulo. Por usuario en localStorage del navegador.
OJO: la fecha de última edición depende de la columna solicitud.updated_at. Si el ambiente todavía no la tiene, las tarjetas muestran '—' y 'Último cambio' no reordena.
Estatus de la solicitud:
- Pendiente: recién creada, esperando revisión.
- Ajustar: se regresó para corregir datos.
- Aprobada: lista para atenderse (convertirse en propuesta).
- Atendida: ya se convirtió en propuesta.
- Rechazada: no procede (se oculta del listado por default).
Botones de acción por fila:
- Ver (ojo, morado): siempre disponible.
- Editar (lápiz): deshabilitado si la solicitud está Aprobada o Atendida.
- Atender (play, fucsia): convierte la solicitud en propuesta. Solo habilitado cuando está Aprobada.
- Estatus (burbuja): abre el modal 'Estado y Comentarios'.
- Rechazar (bote rojo): NO borra la solicitud; la cambia a Rechazada y libera sus reservas. No disponible si está Aprobada o Atendida.
Herramientas: búsqueda, filtros avanzados, exportar CSV, botón 'Nueva Solicitud' (degradado morado-rosa).
Flujo: el asesor crea la solicitud (Pendiente) > se revisa (Ajustar / Aprobada / Rechazada) > una solicitud Aprobada se Atiende y genera la Propuesta (la solicitud queda Atendida). La aprobación final del trato se da en la propuesta.`,

  'Solicitudes:Nueva Solicitud': `El usuario tiene abierto el asistente 'Nueva Solicitud'. Son 4 PASOS (Cliente, Campaña, Asignar Circuitos, Resumen) con guardado automático de borrador si cierra sin terminar. No se puede saltar a un paso sin completar los anteriores.

PASO 1 - Cliente:
- Selector 'Cliente' con búsqueda por Marca, Producto, Razón Social, Cliente o ID Cliente. Cada opción muestra Marca + ID Cliente + Producto. Al elegirlo aparece una ficha con ID Cliente, Categoría, Marca, Producto, Cliente, Razón Social, Asesor y Agencia.
- Asignados: multi-select de usuarios con tags. El creador se agrega automáticamente. Botón 'Limpiar todos'.
- Para avanzar se requiere cliente y al menos un asignado.
BORRADOR: si cierras sin guardar aparece el aviso 'Borrador restaurado' al reabrir, con opción 'Descartar'.

PASO 2 - Campaña:
- Nombre de Campaña (requerido).
- Rango de Fechas: Año Inicio / Mes Inicio y Año Fin / Mes Fin, es decir, los meses de la campaña. Después cada circuito lleva sus propias fechas libres dentro de esos meses.
- Descripción Tráfico (requerido) y Notas Dirección (requerido, texto libre).

PASO 3 - Asignar Circuitos (formulario 'Agregar Circuito'):
- Artículo de captura manual: se elige la Operación (Renta, Cortesía, Intercambio, Impresión o Ejecución especial) y se escribe una Clave libre (ej. 'Parabús Zona Norte'). Se guarda como PREFIJO-CLAVE con RT, CT, IN, IM o ES (ej. RT-PARABUS-ZONA-NORTE). En Renta la bonificación se registra sola como su pareja BF-<clave>.
- Plaza, Ciudad (opcional), Formato (multi-select) y Tipo (Tradicional o Digital), todos a mano.
- Mes (dentro de los meses de la campaña) y Fecha Inicio / Fecha Fin del circuito (fechas libres). Si el tipo es Digital también se piden Hora inicio y Hora fin.
- Caras: la etiqueta cambia según la operación ('Caras', 'Caras en Cortesía', 'Impresiones', 'Intercambio', 'Ejec. Especiales').
- Bonificación: se oculta en Cortesía y se deshabilita en Impresión, Intercambio y Ejecución especial; máximo = caras de renta.
- Tarifa Pública: se captura a mano (deshabilitada en Cortesía).
- Nivel Socioeconómico: multi-toggle.
- Vista previa del cálculo: Inversión (caras × tarifa), caras totales (renta + bonificación) y Tarifa Efectiva. Botones 'Agregar Circuito' / 'Actualizar Circuito' y 'Limpiar Campos'.

PASO 4 - Resumen:
- Cliente (ID Cliente, Marca, Producto), Campaña (nombre, número de circuitos y fechas 'Mes año a Mes año'), totales (Renta, Bonificación, Total Caras, Inversión), 'Desglose por Periodo' con los artículos de cada periodo, y Asignados.
- Archivo (opcional; las imágenes muestran vista previa) y casilla 'Impresión incluida' (indica que la solicitud incluye la impresión del material).
- 'Crear Solicitud' (verde) deshabilitado si falta cliente, circuitos o asignados, o si hay circuitos fuera del rango de la campaña.
No hay autorizaciones por precio ni por descuento: los circuitos quedan aprobados al guardar.

REGLA (recordar al asesor): Caras de renta y Bonificación son CANTIDAD de espacios, NO dinero. Tarifa Pública es precio de lista por cara. Bonificación es espacios sin costo dentro del mismo trato; Cortesía es una operación aparte.`,

  'Solicitudes:Editar Solicitud': `El usuario tiene abierto el modal 'Editar Solicitud'. Tiene los mismos 4 pasos que 'Nueva Solicitud' (Cliente, Campaña, Asignar Circuitos, Resumen) precargados con la información existente; en edición se puede navegar libremente entre pasos.
- El cliente solo se cambia con el permiso correspondiente; si no, el selector aparece bloqueado.
- En 'Asignar Circuitos' cada circuito guardado se puede editar (lápiz: se recarga en el formulario con su operación y clave) o eliminar (bote).
- Las notas anteriores se muestran como bitácora 'Notas' (solo lectura).
- Botón 'Guardar Cambios'. Si intenta cerrar con cambios sin guardar, se pide confirmación porque se perderían.`,

  'Solicitudes:Ver Solicitud': `El usuario tiene abierto el modal de detalle de una solicitud (solo lectura).
Encabezado con botones Editar, Atender y 'Ver estatus y comentarios' (con los mismos candados que la tabla).
Secciones: Campaña (nombre, periodo, descripción), Cliente (ID Cliente, razón social, marca, categoría, agencia), Asesor, Producto, Asignados, Detalle de Circuitos, Archivo Adjunto, bitácora de Notas e Historial.
No permite editar directamente desde aquí.`,

  'Solicitudes:Cambiar Estado Solicitud': `El usuario tiene abierto el modal 'Estado y Comentarios' de una solicitud.
Arriba: badge del estatus actual y selector 'Cambiar estado a:' con las opciones Pendiente, Aprobada, Rechazada y Ajustar; botón 'Actualizar' (deshabilitado si no hubo cambio).
Abajo: comentarios cronológicos con avatar + fecha + texto; caja 'Escribe un comentario...' y botón enviar (avión de papel). Los comentarios NO se pueden editar ni eliminar una vez enviados.
Quien no tiene permiso de cambiar estatus ve el estado en solo lectura, pero puede comentar. Una solicitud Atendida ya no cambia de estatus. Para convertirla en propuesta se usa el botón Atender cuando está Aprobada.`,

  // ─────────────────────────── PROPUESTAS ───────────────────────────
  'Propuestas': `El usuario está en el módulo de Propuestas (lista de propuestas comerciales).
VISTAS DISPONIBLES: selector compacto 'Vista Tabla' / 'Desglose' / 'Tablero' en la barra superior (en pantallas chicas solo iconos). La estrella a su derecha FIJA la vista actual: el módulo abrirá siempre en ella para ese usuario (localStorage; clic de nuevo para quitarla). Desglose agrupa dinámicamente hasta 4 niveles (Asesor, Propuesta, Circuito, Anunciante, ID Cliente, Estatus; default Asesor › Propuesta › Circuito) y recuerda la configuración en localStorage. Si el usuario no ve las columnas típicas probablemente está en Desglose o en Tablero.
TABLERO: una columna por estatus (Abierto, Atendido, Ajuste Comercial, Ajuste CTO Cliente, Ajuste Inventario, Confirmar venta, Aprobada). Cada tarjeta trae ID, marca, campaña, periodo (fechas), inversión, asesor/asignado, el badge de estatus y la FECHA DE ÚLTIMA EDICIÓN. NO hay drag & drop: para cambiar estatus se da clic en el badge de la tarjeta, que abre el mismo modal de la tabla. Al pie de cada tarjeta hay una fila de iconos de acción (Aprobar, Asignar/Ver inventario, Prueba de color, Compartir): es EXACTAMENTE el mismo componente que la columna Acciones de la tabla, con los mismos permisos y candados. Una propuesta 'Aprobada' ya se fue a Campañas y su tarjeta NO se abre para quien tiene permiso de asignar inventario (igual que el botón de la fila); 'Activa' y, para el Asesor Comercial, 'Abierto' tampoco. Las propuestas con un estatus sin columna (p.ej. Rechazada) no se pintan y el tablero avisa cuántas quedaron fuera.
MENÚ 'ORDENAR' (aplica a Tabla y Tablero): un botón abre tres criterios, cada uno con switch de sentido: 'Fecha de creación' (Nueva / Vieja), 'Presupuesto' (Alto / Bajo, por inversión) y 'Último cambio' (Nueva / Vieja; default del tablero: arriba lo que cambió de estatus o se editó más recientemente; dentro se elige qué cambios cuentan). Además el chip 'Solo incompletos' (menos reservas que caras esperadas). Al elegir un orden distinto de 'Fecha de creación · Nueva' la tabla deja de paginar y muestra todo el universo ordenado, porque ordenar solo la página visible daría un orden falso.
VISTAS GUARDADAS (botón 'Vistas' junto a 'Filtros', disponible en Tabla, Desglose y Tablero): una vista guarda con nombre TODO lo configurado: filtros de la barra (estatus, historial, agrupación, filtros avanzados, búsqueda), orden, 'Solo incompletos' y columnas del tablero (el selector de columnas sigue sobre el tablero). Puede aplicarlas (dejan la barra exactamente así), renombrarlas, actualizarlas y borrarlas, y marcar UNA como FIJA (estrella): esa se aplica sola cada vez que entra al módulo. Se guardan por usuario en localStorage del navegador, así que NO lo siguen si cambia de equipo o navegador.
Columnas de la tabla: ID (morado), Fecha Creación, Marca, Creador (avatar), Campaña, Asignados (primeros 2 + '+N'), Inversión (ámbar, moneda), Inicio, Fin (fechas del periodo), Estatus (badge clickeable; puede llevar el aviso 'Incompleta' si faltan reservas), Acciones.
EDITAR CIRCUITO (modal de inventario, también en Campañas): Plazas y Formatos se bloquean cuando el circuito ya tiene inventario reservado, porque las reservas se eligieron con esos filtros. EXCEPCIÓN: los roles de Tráfico SÍ pueden editar FORMATOS con reservas (la etiqueta dice '(con inventario reservado)'); Plazas sigue bloqueado para todos. Cambiar el formato NO libera reservas (cambiar fechas o artículo sí las libera).

Estatus de la propuesta:
- Abierto: recién creada desde una solicitud atendida; Tráfico empieza a asignar inventario.
- Atendido: Tráfico ya trabajó el inventario.
- Ajuste Comercial / Ajuste Cto-Cliente: ajustes con el área comercial o con el cliente.
- Ajuste Inventario y Liberada: los pone el sistema (no se eligen a mano).
- Confirmar venta: lista para compartir y aprobar.
- Aprobada: ya generó la campaña.
- Rechazada / Descartada: no procede; se liberan reservas.
Cada rol solo ve en el modal de estatus los estatus que tiene permitidos.

Botones de acción (4):
1. Aprobar (check verde): visible con permiso de aprobar propuestas; solo habilitado en 'Confirmar venta'. Abre el modal 'Aprobar Propuesta': se eligen Asignados y se confirma. Al aprobar se actualizan las reservas, se activan la cotización y la campaña, se crean tareas de seguimiento y se notifica al creador de la solicitud. Si alguna pieza ya se vendió en otra campaña, avisa del conflicto y no aprueba.
2. Asignar Inventario (pin magenta): con permiso de asignar inventario abre el modal de asignación; en 'Confirmar venta' abre 'Ver Inventario' en solo lectura; sin permiso aparece como ojo ('Ver Propuesta').
3. Prueba de color (pincel): para solicitar una prueba de color (roles con permiso).
4. Compartir (Share2 cyan): habilitado en Aprobada, Atendido, Confirmar venta, Ajuste Inventario y Ajuste Cto-Cliente. Abre la pantalla de compartir (/propuestas/compartir/:id), desde donde se copia el link PÚBLICO sin login para el cliente: /cliente/propuesta/:id y /cliente/propuesta/:id/mapa (vista con mapa).

BLOQUEOS:
- Estatus 'Abierto': bloquea las acciones para el rol Asesor Comercial (todavía no la trabaja Tráfico).
- En Ajuste Comercial solo Asesores Comerciales pueden reservar o eliminar inventario.
- Tráfico NO puede editar tarifa pública, costo ni cantidad de caras (candado en el servidor). Si intenta, el backend rechaza.
- Reservas incompletas solo muestran un aviso informativo; no impiden pasar a 'Confirmar venta' ni a 'Aprobada'.

Flujo: la solicitud Aprobada se atiende > se crea la Propuesta (Abierto) > Tráfico asigna inventario > ajustes si hacen falta > Confirmar venta > se comparte con el cliente > se Aprueba > el sistema crea la Campaña automáticamente.`,

  'Propuestas:Asignar Inventario Propuesta': `El usuario tiene abierto el modal de asignación de inventario de una propuesta.
Panel de circuitos: lista de circuitos (artículo, plaza, formato, tipo, NSE, fechas) con totales de caras (Flujo, Contraflujo, Bonificación) e indicador de completitud: check verde (completo), alerta amarilla (parcial), X roja (sin reservas). Botón 'Agregar Circuito' y edición/eliminación por circuito.
'Buscar Inventario' (por circuito): tabla + mapa del inventario disponible en las fechas del circuito. Filtros: búsqueda, Flujo (con periodos por fechas se reserva como Flujo), Únicos, Únicos Digitales, Spot único, Isla, filtros avanzados, Agrupar (modo Distancia por GPS con radios de 100 m a 3 km, o modo Listado; tamaño de grupo 2-50, default 10), Filtro POI, carga por CSV (con plantilla) y exclusión por categoría de cliente (por distancia o contracara). Botón 'Reservar' para los seleccionados; pestañas Historial y Capas.
Mapa interactivo: espacios como pins. Verde = disponible, naranja = reservado por esta propuesta, gris = reservado por otra o No Disponible/Inhabilitado.

REGLAS IMPORTANTES DEL MODAL:
- Las reservas se registran al momento de reservar. Los circuitos nuevos, las ediciones y las eliminaciones se confirman con 'Guardar Cambios' (indica cuántos cambios hay pendientes); si cierra sin guardar, se descartan. 'Conflicto de reserva' significa que otro usuario tomó ese espacio: refrescar.
- No se puede reservar ni reactivar inventario con estatus 'No Disponible' ni 'Inhabilitado'. El bot NO debe sugerir 'intenta de nuevo'; es candado definitivo.
- APS: se asigna MANUALMENTE desde el detalle de la campaña (botón APS sobre los inventarios seleccionados); en este modal no se asigna.
- Reservar/eliminar en Ajuste Comercial: solo Asesores Comerciales. Tráfico y demás roles verán los botones grises.
- Eliminar un circuito es directo; no requiere autorización.
- No hay autorizaciones por precio ni por descuento: editar tarifas o caras no dispara aprobaciones.

Reservas incompletas: no bloquean pasar a 'Confirmar venta'; solo muestran un aviso ámbar informativo. Los artículos de Impresión (IM) nunca requieren reservas.`,

  // ─────────────────────────── CAMPAÑAS ───────────────────────────
  'Campanas': `El usuario está en el módulo de Campañas (lista de campañas activas y pasadas).
Columnas: ID, Periodo (badge según fechas: En curso / Futura / Pasada), Creador (avatar), Campaña, Marca, Estatus (clickeable; puede llevar el aviso 'Incompleta'), Actividad (Activa si ya tiene APS / Inactiva), Fecha Inicio, Fecha Fin, Inversión, APS (check/guion), Acciones.
Acciones por fila:
- Abrir (ojo): abre /campanas/detail/:id. Siempre disponible.
- Compartir (Share2): solo si la campaña tiene propuesta asociada.
- Prueba de color: con permiso y propuesta asociada.
- Editar (lápiz): visible con permiso de editar campañas. DESHABILITADO si la campaña ya tiene APS asignado o está finalizada, cancelada o rechazada.
- Incidencia (triángulo): con permiso de Tareas de Seguimiento. Abre el modal de incidencia (Re-impresión o Bloqueo).

Barra: búsqueda, Filtrar (filtros avanzados), chip Status, filtro de periodo por AÑOS, filtro de Historial, 'Rápidos' (APS Específico: Todas / Con APS / Sin APS), Ordenar, Agrupar (Estatus, Cliente, Fecha Inicio por mes), Exportar CSV y botón 'Órdenes de Montaje' (según permiso).

Vistas disponibles (selector compacto; la estrella a su derecha FIJA la vista con la que abre el módulo para ese usuario, en localStorage):
- Vista Tabla: lista paginada con filtros y agrupación hasta 2 niveles.
- Versionario ('Vista por Mes'): campañas agrupadas por mes de inicio, expandibles para ver inventario y APS agrupado; botones 'Exportar Layout' y Excel con el versionario de artes.
- Tablero: una columna por estatus (Por Iniciar, Ajuste Comercial, Ajuste CTO Cliente, Atendido, Aprobada, Finalizada). Cada tarjeta trae ID, nombre, cliente, periodo (fechas), inversión, marca, APS, el badge de estatus y la fecha de última edición. NO hay drag & drop: el estatus se cambia con clic en el badge, que abre el mismo modal de estatus (en solo lectura para quien no tiene permiso). Clic en la tarjeta abre el detalle, siempre disponible igual que el ojo de la fila. Al pie de cada tarjeta hay una fila de iconos de acción (Abrir, Compartir, Prueba de color, Editar, Incidencia): es EXACTAMENTE el mismo componente que la columna Acciones de la tabla, con los mismos permisos y candados (Editar deshabilitado con APS o estatus cerrado). Las campañas con estatus sin columna no se pintan y el tablero avisa cuántas quedaron fuera.
  OJO: la fecha de última edición depende de la columna campania.updated_at. Si el ambiente todavía no tiene esa columna, las tarjetas muestran '—' y el orden 'Último cambio' no reordena. En Propuestas sí funciona (usa propuesta.updated_at).

Menú 'Ordenar' (aplica a Tabla y Tablero): un botón abre tres criterios, cada uno con switch de sentido: 'Fecha de creación' (Nueva / Vieja, por fecha de aprobación o de inicio), 'Presupuesto' (Alto / Bajo, por inversión de la campaña) y 'Último cambio' (Nueva / Vieja; default del tablero; dentro se elige qué cambios cuentan). Además el chip 'Solo incompletos'.
Vistas guardadas (botón 'Vistas' junto a 'Filtros', disponible en Tabla, Versionario y Tablero): una vista guarda con nombre los filtros de la barra (incluidos el rápido de APS y los años), orden, 'Solo incompletos' y columnas del tablero; se aplica con un clic, se renombra, actualiza y borra; una puede marcarse como FIJA (estrella) y se aplica sola al entrar al módulo. Por usuario en localStorage del navegador; no siguen al usuario a otro equipo.

REGLA CRÍTICA: las campañas NUNCA se eliminan. Para cancelar una campaña se cambia el estatus a 'Rechazada': se liberan todas las ubicaciones reservadas y se eliminan sus circuitos. Es IRREVERSIBLE y no está disponible si la campaña ya tiene APS asignado.
El APS se asigna manualmente desde el detalle de la campaña.`,

  'Campanas:Editar Campaña': `El usuario tiene abierto el modal de asignación/edición de inventario de una campaña. Este modal tiene dos paneles principales:

Panel izquierdo - Mapa interactivo: muestra los espacios del inventario disponible y reservado con puntos en el mapa.

Panel derecho - Tabla de inventario disponible con:
- Barra de búsqueda por código o dirección.
- Filtros: Flujo (con periodos por fechas se reserva como Flujo), Únicos, Únicos Digitales, Spot único, Isla y filtros avanzados.
- Botón "Agrupar" (ícono de regla, verde cuando activo): agrupa los espacios de la tabla por cercanía geográfica. Útil para seleccionar espacios de una misma zona sin tener que buscarlos uno a uno. Al activarlo aparecen:
  - Selector de modo "Distancia" / "Listado":
    - Modo "Distancia": agrupa usando coordenadas GPS reales (algoritmo haversine). Los espacios más cercanos entre sí quedan en el mismo grupo.
    - Modo "Listado": agrupa secuencialmente por posición en la lista, sin tomar en cuenta ubicación geográfica.
  - Selector de distancia: 100m, 200m, 500m (default), 1km, 1.5km, 2km, 3km. Es el radio mínimo de separación entre grupos.
  - Campo de tamaño de grupo: cuántos espacios máximo por grupo (default 10, rango 2-50).
  - Columna "Grupo" en la tabla: muestra a qué grupo pertenece cada espacio (Grupo 1, Grupo 2...).
- Botón "Filtro POI": filtra espacios cercanos a un punto del mapa.
- Carga por CSV: importa lista de espacios desde archivo CSV.
- Botón "Reservar": reserva los espacios seleccionados para la campaña.

Sección inferior - "Reservados": lista de espacios ya asignados a la campaña, con los mismos controles de agrupación por distancia y la opción de quitar reservas.
Los cambios a circuitos se confirman con 'Guardar Cambios' (abajo).

RECORDATORIOS: Tráfico NO puede editar tarifa/costo/caras (candado en el servidor). No se puede reservar inventario No Disponible/Inhabilitado. Eliminar un circuito guardado es directo: se marca 'Por eliminar' y se elimina al guardar (no requiere autorización).`,

  'Campanas:Nueva Incidencia': `El usuario tiene abierto el modal de incidencia de una campaña.
Muestra el nombre de la campaña.
Tipo de Incidencia (dropdown): 'Re-impresión' o 'Bloqueo'.
- Si 'Bloqueo': el botón 'Ir a Inventarios' navega a /inventarios filtrado por esa campaña para que Tráfico/Admin bloquee el espacio afectado.
- Si 'Re-impresión': el botón 'Ir a Gestión de Artes' navega a /campanas/:id/tareas (Validar Instalación > Instaladas) y abre el modal de Re-impresión con los items ya instalados para solicitar reimprimir (motivos: Grafiti, Siniestro, Vandalismo, Daño por clima, Robo de material, Otro).`,

  'Campanas:Cambiar Estado Campaña': `El usuario tiene abierto el modal 'Cambiar Estatus' de una campaña.
Dropdown de estatus (filtrados según el rol): Ajuste CTO Cliente, Atendido, Ajuste Comercial, Aprobada, Compartir, Rechazada. 'Rechazada' no aparece si la campaña ya tiene APS.
Vista previa del nuevo badge al seleccionar.
Sección de comentarios: lista cronológica con avatar + nombre + fecha + texto. Input + enviar (Enter o click). Actualización en tiempo real por WebSocket.
'Guardar Estatus' deshabilitado si no hubo cambio.
REGLA: las campañas NO se eliminan. Al pasar a Rechazada se pide confirmación: se liberan todas las ubicaciones reservadas, se eliminan los circuitos y es IRREVERSIBLE.`,

  'Campanas:Órdenes de Montaje': `El usuario tiene abierto el modal 'Órdenes de Montaje' (se abre desde el botón de la barra de Campañas; gestión y exportación de órdenes de todas las campañas, según permiso).
Pestañas: Ocupacion VP, Ocupacion Digital, Ocupacion UN+, Inventario VP, Inventario Digital, Inventario UN+.
Botón 'Filtros' con:
- Ocupación: Vendido (default, lo que ya está en campañas), Disponible o Todo (incluye inventario libre/reservado del periodo; para Disponible/Todo hay que elegir Desde y Hasta).
- Formatos (multi-select), APS Específico (Todas / Con APS / Sin APS; solo en Vendido).
- 'Aplicar mes actual' (llena Desde/Hasta con el mes en curso) y Periodo de Fechas (Desde / Hasta).
- Ordenar por y Agrupar por.
Además: buscador, contador de registros y botón 'Exportar' (Excel de la pestaña activa).
Las tablas de ocupación muestran plaza, tipo, asesor comercial, APS, ID Cliente, fechas de inicio y fin, cliente, marca, campaña, artículo, tarifa y monto total, entre otras columnas.`,

  'Campanas:Re-impresión': `El usuario tiene abierto el modal 'Re-impresión por Incidencia'.
Se usa cuando un arte ya instalado necesita reimprimirse por un daño o incidencia.
Muestra las ubicaciones seleccionadas y pide:
- Tipo de incidencia * (Grafiti, Siniestro, Vandalismo, Daño por clima, Robo de material, Otro).
- ¿Qué pasó? * (descripción de la incidencia).
- Asignar analista * (buscador de usuario).
Botón 'Crear tarea de re-impresión': crea la tarea para el analista asignado.`,

  // ─────────────────────────── DETALLE CAMPAÑA ───────────────────────────
  'Detalle de Campana': `El usuario está en la pantalla de detalle de una campaña (/campanas/detail/:id).
Encabezado: flecha de volver, botón Actualizar (recarga los datos sin refrescar la página), 'Editar campaña' (deshabilitado si la campaña tiene APS o está finalizada, cancelada o rechazada) y 'Comentarios' (panel lateral en tiempo real). Si faltan reservas aparece el aviso 'Incompleta' con su detalle.
Tarjetas: Campaña, Cliente, Asignación, Descripción Tráfico y Notas; además el Historial de Acciones de la campaña.
'Lista Inventarios Sin APS': tabla (con filtrar, agrupar, ordenar y CSV) + mapa de los espacios reservados que todavía no tienen APS.
'Lista de Inventario por APS': tabla + mapa de lo que ya tiene APS.

APS - IMPORTANTE: el APS se asigna MANUALMENTE en esta pantalla. Se seleccionan filas en 'Lista Inventarios Sin APS' y se da clic en el botón 'APS (n)': el sistema genera el número de APS y esas filas pasan a 'Lista de Inventario por APS'. No se puede asignar si el grupo está incompleto o tiene exceso de caras (primero hay que ajustar el inventario). Las cortesías no requieren APS: el botón 'Enviar a Gestor de Artes' las manda directo a Tareas de Seguimiento. Para quitar un APS se seleccionan filas en 'Lista de Inventario por APS' y se usa 'Quitar APS', que pide un código de autorización de 6 dígitos enviado por correo al administrador (vence en 2 minutos).

Botones principales:
- 'Gestor de Tareas': navega a /campanas/:id/tareas (Tareas de Seguimiento).
- 'Editar campaña': abre el modal de edición de inventario si cumple condiciones.
El estatus de la campaña se cambia desde el listado de Campañas (clic en el badge de estatus).`,

  // ─────────────────────────── TAREAS DE SEGUIMIENTO (ex Gestión de Artes) ───────────────────────────
  'Gestion de Artes': `El usuario está en la pantalla 'Tareas de Seguimiento' (ruta /campanas/:id/tareas; antes se llamaba 'Gestión de Artes'). Es donde se lleva todo el proceso operativo después de aprobar la campaña.
Son 5 PESTAÑAS (cada rol ve las que su permiso le permite), en este orden:

1. SUBIR ARTES (ícono Upload): selecciona espacios sin arte y asigna los artes/creativos (de la galería, subiendo archivo o pegando URL) con notas por imagen. Al asignar, el arte queda en revisión.

2. REVISAR Y APROBAR (ícono Eye): revisa los artes subidos, los aprueba o rechaza y gestiona tareas de producción. Sub-filtros Sin Revisar / En Revisión / Aprobado / Rechazado. Un arte rechazado detona tarea de Corrección; corregir regenera la revisión; ciclo hasta aprobar.

3. PROGRAMACIÓN (ícono Monitor): solo espacios DIGITALES. Sub-pestañas En Programación / Programado. Tareas de programación de artes digitales con indicaciones por archivo.

4. IMPRESIONES (ícono Printer): solo espacios TRADICIONALES. Sub-pestañas Orden de Impresión / En Impresión / Pendiente Recepción / Recibido. Desde aquí se crea la Orden de Impresión para los artículos de Impresión (IM).

5. VALIDAR INSTALACIÓN (ícono Camera): sub-pestañas Por Instalar / Instaladas / Testigo. Se suben y revisan las fotos testigo (evidencia fotográfica de la instalación) para confirmar que el arte se instaló bien. Desde aquí también se crean tareas de Re-impresión por incidencia.

Botón 'Prueba de color' para solicitar o consultar pruebas de color (flujo paralelo, ver 'Pruebas de Color').
REGLA (recordar): el arte Rechazado requiere motivo específico Y adjunto (archivo o link). Un arte aprobado NO se puede 'desaprobar' sin crear una nueva tarea de Corrección.`,

  // ─────────────────────────── INVENTARIOS ───────────────────────────
  'Inventarios': `El usuario está en el módulo de Inventarios (/inventarios).
Tarjetas: Total Inventarios y No Disponibles (ocultos, con % del total).
Columnas: selección, ID, Código, Mueble (badge 'DIG' si es digital), Formato, Ubicación, Plaza, CTO, Cara (Flujo/Contraflujo), Dimensiones, Actividad (Ocupado/Disponible), Estatus (Activo, No Disponible / Inhabilitado con su vigencia, o bloqueo programado), Acciones.

ESTATUS de inventario (usa 'No Disponible', NUNCA 'Bloqueado'):
- Activo/Disponible (verde): libre para asignar.
- Reservado (ámbar): comprometido en una propuesta/campaña.
- Ocupado/Vendido: en campaña.
- No Disponible (rojo): bloqueado administrativamente, no se puede ocupar. Antes se llamaba 'Bloqueado'.
- Inhabilitado: variante dura, no se puede reactivar automáticamente.
CANDADO: no se puede reservar ni reactivar un inventario con estatus 'No Disponible' ni 'Inhabilitado'. Si el usuario reporta 'no puedo reservar este espacio', es por este candado.

Barra: búsqueda por código, ubicación o municipio (Enter agrega varios códigos), Filtros (Tipo, Trad / Digital, Plaza, CTO, Estatus), vista Tabla, 'Descargar CSV' (seleccionados o con los filtros aplicados), menú 'Análisis' (Análisis de Ocupación nuevo o 'Guardados'), menú 'Bloqueo' ('Bloquear seleccionados' y 'Bloqueo Masivo (Matriz)'), 'Carga Masiva' y 'Nuevo Inventario'.
Acciones por fila: Editar, Historial (pestañas Campañas y Acciones) y Marcar No Disponible / Inhabilitar (o Marcar Disponible / Habilitar / Cancelar bloqueo programado).

MODALES ESPECIALIZADOS (Tráfico/Admin):
- Análisis de Ocupación: matriz inventario × periodo sobre un rango Desde/Hasta (con atajos) por día, semana o mes (la granularidad se sugiere sola según el largo del rango). Cada reserva ocupa todas las columnas que traslapa; celdas compactas con detalle en tooltip, panel de conflictos por rangos de días y descarga CSV de la matriz. Se puede cargar inventario por CSV, Guardar/Actualizar el análisis y 'Compartir' (copia el enlace /inventarios/analisis/:analisisId). Los análisis guardados con el formato anterior se abren con un aviso.
- Bloqueo Masivo (Matriz): mismo selector de fechas y matriz; bloquea múltiples espacios a la vez con motivo y genera tareas para Analistas/Tráfico; los reportes muestran el periodo en fechas.
- Bloqueo individual o de seleccionados (espacio en uso): obliga a motivo + lista de Analistas/Tráfico. Al enviar genera tareas 'Ajuste Inventario Bloqueado' en cada campaña afectada.
- Vigencia del bloqueo (individual, seleccionados y masivo): al marcar No Disponible/Inhabilitado se elige "Indefinida" (queda así hasta habilitar a mano) o "Con fechas" (desde/hasta). Si la fecha de inicio es futura el bloqueo queda PROGRAMADO (badge ámbar en la tabla; la pieza sigue disponible y el sistema lo aplica ese día). Al cumplirse la fecha fin, a quien bloqueó le llega la tarea 'Vigencia Bloqueo Inventario' en Notificaciones, desde donde puede rehabilitar la pieza con un botón. El bloqueo nunca se levanta solo.

Carga masiva CSV: subir, verificar, resultado (3 pasos). Campos requeridos: codigo_unico, tipo_de_mueble, tipo_de_cara (Flujo/Contraflujo), tradicional_digital, plaza, estado, municipio. Descarga de plantilla disponible.`,

  // ─────────────────────────── CLIENTES ───────────────────────────
  'Clientes': `El usuario está en el módulo Clientes.
Tarjetas resumen: Total Clientes, Agencias, Marcas, Categorías (números animados).
Una sola pestaña 'Base de Datos' con todos los clientes del sistema. Los clientes se dan de alta manualmente; no hay sincronización con sistemas externos.
Columnas: ID Cliente, Cliente, Razón Social, Agencia, Marca, Categoría, Producto, Acciones.
Herramientas: búsqueda, Filtrar (filtros avanzados con operadores: igual, distinto, contiene, no contiene), Agrupar (Agencia/Marca/Categoría), Ordenar (A-Z / Z-A) y botón 'Nuevo Cliente'.
Acciones por fila: Ver detalles (ojo) y Eliminar (solo roles con permiso). El Asesor Comercial puede dar de alta clientes pero NO eliminarlos.
ID Cliente: identificador que el sistema asigna automáticamente al registrar al cliente. Es el que se usa para elegir al cliente en solicitudes, propuestas y campañas, y aparece en tablas y exportaciones.`,

  'Clientes:Registrar Cliente': `El usuario tiene abierto el modal 'Nuevo Cliente' (alta manual).
Aviso del modal: 'El ID de cliente se asigna automáticamente al guardar.'
Campos:
- Razón Social * (nombre legal de la empresa cliente).
- Nombre Comercial * (nombre por el que se conoce al cliente).
- Marca, Producto, Categoría, Agencia, Asesor y Unidad de Negocio (opcionales).
Botón 'Crear Cliente': crea el cliente y le asigna su ID Cliente.
Botón 'Cancelar': cierra sin crear.
Después el cliente ya aparece en el selector de cliente de 'Nueva Solicitud' (se busca por Marca, Producto, Razón Social o ID Cliente).`,

  'Clientes:Ver Cliente': `El usuario tiene abierto el modal de detalle de un cliente (solo lectura).
Muestra arriba ID Cliente, Marca, Agencia y Categoría; después Información General (ID Cliente, Cliente, Razón Social, Unidad de Negocio), Asesor Comercial, Agencia, Marca & Producto y Categoría. Botón 'Cerrar'.`,

  // ─────────────────────────── PROVEEDORES ───────────────────────────
  'Proveedores': `El usuario está en el módulo de Proveedores.
Lista de empresas o personas que proveen servicios (instalación, impresión, mantenimiento).
Elementos:
- Búsqueda, Filtrar (Nombre, Categoría, Ciudad, Estado, Contacto), Agrupar (Categoría, Ciudad, Estado) y Ordenar.
- Tabla: Nombre, Categoría, Ciudad, Contacto, Teléfono, Estado, Acciones.
- Botón 'Nuevo Proveedor': nombre, categoría, contacto, teléfono, correo, sitio web, dirección, ciudad, código postal y notas.
- Acciones: Ver detalles, Historial, Editar, Eliminar.`,

  // ─────────────────────────── NOTIFICACIONES Y TAREAS ───────────────────────────
  'Notificaciones': `El usuario está en el módulo Notificaciones y Tareas (/notificaciones).
IMPORTANTE: para los roles Director General y Director Comercial esta ES la pantalla de aterrizaje al iniciar sesión (Mis Tareas), no el Dashboard.

Se alterna entre Notificaciones y Mis Tareas (tareas asignadas al usuario). Botón 'Nueva Actividad Comercial' para registrar una actividad manual (ver modal de Actividad Comercial).

VISTAS:
- Lista: tabla con ID, Tipo (badge), Título, Asignado, Fecha, Creador, Status, # Propuesta.
- Tablero (solo en tareas): columnas Pendiente / En Progreso / Completada. Drag & drop.
- Calendario: vista mensual con fechas límite.
- Notas: notas personales privadas del usuario.

Filtros rápidos: Todas / Sin finalizar / Finalizadas. Filtros avanzados con operadores y presets de fecha (Antes de hoy, Hoy, Mañana, Esta semana, Próxima semana, Próximos 14 días).
Agrupación multinivel: Estado, Tipo, Asignado, Responsable, Fecha.

TIPOS DE TAREAS que pueden aparecer: Solicitud, Atender solicitud, Propuesta, Seguimiento propuesta, Campaña, Seguimiento Campaña, Revisión de artes, Seguimiento Prueba de color, Corrección, Ajuste Cto-Cliente, Ajuste Comercial, Ajuste Inventario Bloqueado, Vigencia Bloqueo Inventario, Impresión, Orden de Impresión, Producción, Orden de Programación, Orden de Instalación, Recepción, Recepción Parcial, Testigo, Re-impresión, Notificación, Actividad Comercial, Mención en Ticket. Cada tarea tiene su propio modal de resolución.
En esta versión no existen tareas de autorización por precio, descuento ni eliminación de circuitos.`,

  'Notificaciones:NuevaActividadComercialModal': `El usuario tiene abierto el modal de Actividad Comercial (crear o editar).
Es un tipo de tarea MANUAL que registran los Asesores para dejar constancia de leads, visitas, llamadas y seguimientos.

CAMPOS:
- ID_accion: lo asigna el sistema al crear (identificador único).
- Asesor: el usuario que crea (automático).
- Fecha/Hora de creación (automática).
- Etapa (Campaña o Propuesta) con buscador opcional que acepta nombre, ID, cliente o marca; al seleccionar se autollenan cliente y marca, que siguen siendo editables.
- Tipo Cliente (p.ej. Lead) y Tipo Actividad.
- Cliente y Marca: campos independientes, editables aunque haya campaña vinculada.
- Año y Periodo (meses): selectores manuales de clasificación.
- Descripción de la actividad (texto libre, OBLIGATORIO).
- Programar recordatorio (opcional): detona una tarea de recordatorio en la fecha indicada.

COMPORTAMIENTO:
- Al guardar se crea una tarea tipo 'Actividad Comercial' en Notificaciones y se refleja en el Historial de Acciones del registro vinculado (si hay campaña o propuesta).
- Una Actividad Comercial existente se edita con el botón 'Editar' (en el detalle o en la lista), que reabre este mismo modal con todo precargado.`,

  // ─────────────────────────── PRUEBAS DE COLOR ───────────────────────────
  'Pruebas de Color': `El usuario está en el flujo de Pruebas de Color (validación física del color de un arte antes de la impresión masiva).
Flujo (estatus del enum pruebas_color.status):
1. revision_artes: el Analista solicita una prueba de color; se le pide al Diseño generar el archivo.
2. arte_aprobado: Diseño aprueba el archivo interno de prueba.
3. enviada_proveedor: la prueba se envía físicamente al proveedor para impresión de muestra.
4. aprobada (terminal): el cliente/dirección validó la muestra impresa. La campaña puede continuar.

REGLAS CLAVE:
- Reenvío v2: si una prueba es rechazada, el reenvío NO crea un registro nuevo; actualiza el MISMO registro de pruebas_color incrementando la versión.
- Separación de permisos: 'crear prueba de color' lo hace Analista; 'revisar/aprobar/rechazar' lo hace Diseño o Dirección según la etapa.
- Adjuntos: cada prueba acepta archivo (JPG/PDF) Y enlace externo (ej. Google Drive). Pueden coexistir ambos en el mismo registro.
- Tareas generadas: 'Revisión de artes' (cuando se solicita) y 'Seguimiento Prueba de color' (cuando se envía al proveedor y se espera validación).
- Pruebas de Color es un flujo PARALELO a Tareas de Seguimiento normal; una campaña puede necesitar prueba o no según el cliente.`,

  'Pruebas de Color:PruebasColorModal': `El usuario tiene abierto el modal de Pruebas de Color (se abre desde Propuestas, Campañas o Tareas de Seguimiento con el botón 'Prueba de color').
Dos pestañas:
1. Listado de pruebas existentes (agrupadas por circuito con versión, estatus y adjuntos).
2. Formulario para solicitar nueva prueba.

CAMPOS DEL FORMULARIO:
- Circuito al que aplica (dropdown de reservas de la campaña).
- Archivo (JPG/PDF, max 10MB) y/o enlace externo (ej. Google Drive). Ambos pueden coexistir.
- Notas al Diseño/Proveedor.
- Checkbox 'Requiere nueva versión' (reenvío v2).

BOTONES SEGÚN ETAPA:
- Analista: 'Solicitar prueba', 'Reenviar v2'.
- Diseño: 'Aprobar arte interno', 'Rechazar con motivo + adjunto'.
- Proveedor/Dirección: 'Aprobar muestra física', 'Rechazar muestra'.

RECORDATORIO: al rechazar es OBLIGATORIO escribir motivo y subir archivo o link; se guarda en tarea.evidencia.`,

  // ─────────────────────────── HISTORIAL DE ACCIONES ───────────────────────────
  'Historial de Acciones': `El usuario está en /historial-acciones, la pantalla de auditoría del sistema.
Entran todos los roles: direcciones, gerentes comerciales, Administrador y TI ven todo; el resto solo ve lo que hizo
o aquello (solicitud/propuesta/campaña) en lo que participa, y la pantalla se lo avisa con una nota arriba de la tabla.
Filtros: Usuarios, Etapa (Solicitud/Propuesta/Campaña), Módulo (sobre qué: Circuito, Reserva, Arte, APS, Usuario, Ticket...)
y Tipo de acción (qué se hizo: Creación, Edición, Eliminación, Rechazo, Cambio de estado...). Se cruzan con AND.

TIPOS DE REGISTRO AUDITADOS:
1. Campaña: creación, cambio de estatus, edición.
2. Propuesta: creación, cambio de estatus, aprobación, descarte.
3. Solicitud: creación, cambio de estatus, atender.
4. Inventario: reserva, liberación, bloqueo.
5. Nota: creación/edición de notas.
6. Tarea: creación, resolución, reasignación.
7. Arte: subida, aprobación, rechazo (incluye Pruebas de Color).

FILTROS: por tipo de acción, usuario que la hizo, rango de fechas, módulo relacionado, texto libre.
Vista: línea del tiempo con avatar + usuario + acción + ID relacionado + fecha + resumen.
Permite expandir cada entrada para ver detalles (antes/después, comentarios, adjuntos).

Si un Asesor pregunta 'quién cambió X': puede consultarlo aquí si se trata de algo en lo que participa; si no, que lo pida a su gerente o director.`,

  // ─────────────────────────── CLIENTE: VISTA PÚBLICA DE PROPUESTA ───────────────────────────
  'Cliente Propuesta': `El usuario (CLIENTE EXTERNO) está en /cliente/propuesta/:id, la vista PÚBLICA de una propuesta compartida.
NO requiere autenticación: cualquiera con el link puede ver.

ELEMENTOS:
- Encabezado con la marca configurada (logo genérico de QEB o el logo del cliente) y colores neutros, nombre de la propuesta, cliente y periodo.
- Resumen de la propuesta y listado de ubicaciones/circuitos (código, formato, ciudad, caras, tarifa) agrupado por periodo y por artículo.
- Filtros y búsqueda rápida.
- Acceso a la vista de mapa (/cliente/propuesta/:id/mapa).

Si el usuario que te consulta es un CLIENTE externo, mantén un tono comercial y evita jerga interna (no hables de estatus internos, permisos, APS ni campos de base de datos). Si es un Asesor preguntando sobre esta pantalla, puedes dar más detalle técnico.`,

  'Cliente Propuesta Mapa': `El usuario está en /cliente/propuesta/:id/mapa, la vista PÚBLICA de la propuesta con mapa interactivo.
No requiere auth. Usa la marca configurada (logo genérico de QEB o del cliente) y colores neutros.

- Mapa Google Maps con todos los circuitos de la propuesta marcados.
- Al hacer click en un pin: popup con código, ubicación, formato, foto si existe.
- Búsqueda POI (puntos de interés): el cliente puede escribir 'hospital', 'estadio', 'escuela', etc., y ver cuáles de los circuitos de la propuesta caen cerca.
- Filtros: plaza, formato, tipo (tradicional/digital).
- Regreso a la vista con tablas (/cliente/propuesta/:id).`,

  // ─────────────────────────── TICKETS ADMIN (MÚLTIPLES RUTAS) ───────────────────────────
  'Admin Tickets': `El usuario está en una de las pantallas de Tickets. Hay varias pantallas según rol:

1. /tickets (TicketsPage, para usuarios autenticados): formulario de alta de ticket (título, descripción, prioridad Baja/Normal/Alta/Urgente, captura opcional). Para TODOS los usuarios.

2. /admin/tickets-historial (HistorialTicketsPage, acceso TI y lista autorizada): historial de TODOS los tickets del sistema con filtros avanzados por área, estado, fecha, usuario y texto libre.

3. /dev/tickets (DevTicketsPage, equipo DEV y TI): board interno con prioridades, asignaciones, tiempos de respuesta y métricas de rendimiento.

4. /admin/tickets-ranking (RankingTicketsPage, solo rol DEV): rankings de tickets resueltos por agente y tiempo de resolución.

5. /reportes-especiales (ReportesEspecialesPage, DEV/Administrador): reportes personalizados que incluyen datos de tickets y métricas globales.

Si un usuario común te pregunta por 'tickets', dirígelo solo a /tickets. Si es DEV o TI, oriéntalo según la pantalla específica que necesite.`,

  // ─────────────────────────── ANÁLISIS COMPARTIDO DE OCUPACIÓN ───────────────────────────
  'Analisis Compartido de Ocupacion': `El usuario está en /inventarios/analisis/:analisisId, el enlace de un análisis de ocupación compartido. Requiere iniciar sesión, pero NO requiere permiso al módulo de Inventarios: quien no tiene ese acceso lo ve en solo lectura; quien sí lo tiene lo abre dentro de Inventarios con todas las acciones.

Se usa cuando Tráfico/Dirección necesita compartir el análisis con roles sin acceso directo a Inventarios.

ELEMENTOS:
- Nombre del análisis y su periodo (rango de fechas por día, semana o mes).
- Matriz inventario × periodo con la ocupación de cada espacio (detalle en tooltip) y los conflictos detectados.
- En solo lectura NO permite modificar inventario ni liberar reservas, solo visualizar.
- Si el enlace es de un análisis guardado con el formato anterior, se abre con un periodo por defecto y un aviso.

El enlace se genera con el botón 'Compartir' del Análisis de Ocupación (dentro de Inventarios) por un rol con permiso al módulo.`,

  // ─────────────────────────── MANTENIMIENTO ───────────────────────────
  'Mantenimiento': `El usuario está en /mantenimiento, la pantalla de aviso que aparece cuando el sistema está en mantenimiento programado.
Mensaje al usuario explicando que el sistema está temporalmente fuera de servicio, con hora estimada de regreso (si está definida).
Botón 'Volver a intentar' para refrescar y verificar si el sistema ya está disponible.
Durante el mantenimiento TODAS las demás rutas redirigen aquí.`,

  // ─────────────────────────── CORREOS ───────────────────────────
  'Correos': `El usuario está en el módulo de Correos, la bandeja de correos que genera el sistema.
Elementos:
- Búsqueda ('Buscar correos...') y filtro Todos / No leídos / Leídos.
- Botón para actualizar la lista y contadores.
- Tabla con columnas: De, Asunto, Fecha, Estado (leído / no leído).
- Clic en un correo para ver su contenido completo.
Los correos se generan automáticamente cuando ocurren eventos como aprobación de propuestas, cambios de estatus, etc.`,

  // ─────────────────────────── PERFIL ───────────────────────────
  'Perfil': `El usuario está en su página de Perfil.
Campos editables:
- Foto de perfil: hover muestra ícono cámara. Acepta JPEG/JPG/PNG/GIF/WebP, máx 5 MB. Si no hay foto: avatar con inicial en degradado.
- Nombre completo: siempre editable.
- Teléfono: editable.
- Área y Puesto: SOLO editables por rol Administrador.
Campos NO editables: Correo electrónico (identificador de login). Para cambiarlo, contactar al administrador.

Cambiar contraseña: contraseña actual, nueva contraseña (mínimo 6 caracteres), confirmar. Botones ojo para mostrar/ocultar. Si se olvidó: usar 'Olvidé mi contraseña' en login o contactar al administrador.

Preferencias de Notificaciones (sección granular): por CADA tipo de notificación o tarea se puede activar/desactivar por canal:
- Aviso en la app (popup)
- Email
Ejemplo: un asesor puede querer email de 'Seguimiento Campaña' pero solo aviso en la app para 'Revisión de artes'.`,

  // ─────────────────────────── ADMIN ───────────────────────────
  'Admin': `El usuario está en el panel de administración (solo roles Administrador, DEV y Gerente de Trafico para algunos sub-módulos).
Sub-módulos (rutas directas):
- /admin/usuarios: UsuariosAdminPage. CRUD de cuentas con CreateModal y EditModal. CASCADA obligatoria Área > Puesto > Rol: al elegir Área se filtran Puestos, al elegir Puesto se filtran Roles. El rol 'DEV' NUNCA se ofrece en la UI; solo se asigna por script. Desactivar vs Eliminar: eliminar es PERMANENTE, desactivar preserva historial.
- /admin/chatbot: Historial QEBooh. Log completo de conversaciones del chatbot con sesiones expandibles.
- /admin/tickets-historial: HistorialTicketsPage (TI y lista autorizada). Historial de todos los tickets del sistema con filtros avanzados.
- /admin/tickets-ranking: RankingTicketsPage (solo DEV). Rankings de tickets por agente/tiempo.
- /dev/tickets: DevTicketsPage (equipo DEV y TI). Board interno con prioridades, asignaciones y tiempos de respuesta.
- /reportes-especiales: ReportesEspecialesPage (DEV/Administrador). Reportes personalizados.
- /historial-acciones: HistorialAccionesPage (todos los roles; visibilidad total solo direcciones, gerentes comerciales, Admin y TI). Auditoría del sistema (ver pantalla 'Historial de Acciones').`,

};

/**
 * Obtiene el contexto de UI para la pantalla y modal actuales.
 * Devuelve una cadena de texto o null si no hay contexto definido.
 */
export function getScreenContext(pantalla: string, modal: string | null): string | null {
  if (modal) {
    const key = `${pantalla}:${modal}`;
    if (SCREEN_CONTEXTS[key]) return SCREEN_CONTEXTS[key];
  }
  return SCREEN_CONTEXTS[pantalla] || null;
}
