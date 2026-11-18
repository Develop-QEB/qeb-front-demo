import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  X, Upload, Trash2, Save, Share2, Loader2, AlertCircle, CheckCircle2,
  ArrowLeft, ArrowRight, BarChart3, Calendar, ChevronDown,
  ExternalLink, Download, Filter, Search
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { inventariosService } from '../../services/inventarios.service';
import { propuestasService } from '../../services/propuestas.service';
import { campanasService } from '../../services/campanas.service';
import {
  analisisOcupacionService,
  AnalisisOcupacion,
  CampanaEnCelda,
  CatorcenaRef,
  InventarioResumen,
  MatrizOcupacion,
} from '../../services/analisisOcupacion.service';
import {
  ColumnaPeriodo,
  Granularidad,
  PeriodoAnalisis,
  GRANULARIDADES,
  GRANULARIDAD_LABEL,
  GRANULARIDAD_UNIDAD,
  MAX_COLUMNAS,
  agruparColumnas,
  atajosPeriodo,
  columnaIncluye,
  contarColumnas,
  diasDelRango,
  esFechaISO,
  etiquetaPeriodo,
  granularidadAutomatica,
  granularidadPermitida,
  hoyISO,
  periodoConRango,
  periodoProximosDias,
  rangoCorto,
  rangoEnOrden,
  rangoLegible,
  validarPeriodo,
} from '../../lib/analisisPeriodos';

type Step = 'select' | 'periodos' | 'matriz';

/** Un análisis nuevo arranca con los próximos 30 días (vista por día). */
const DIAS_PERIODO_INICIAL = 30;

interface AnalisisOcupacionModalProps {
  open: boolean;
  onClose: () => void;
  initialInventarios?: InventarioResumen[];
  initialAnalisis?: AnalisisOcupacion;
  onSaved?: (a: AnalisisOcupacion) => void;
  /**
   * Modo solo lectura: usado al abrir un enlace compartido desde un usuario sin
   * acceso al módulo de inventario. Oculta guardar, compartir, cambiar periodos
   * y todas las acciones de edición/liberación sobre la matriz.
   */
  readOnly?: boolean;
}

function parseCsvCodes(text: string): string[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detectar separador (coma, punto y coma o tabulación)
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of lines[0]) if (ch in counts) counts[ch]++;
  const sep = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0) > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';

  const splitRow = (line: string): string[] =>
    line.split(sep).map(c => c.replace(/^"|"$/g, '').trim());

  const headerCells = splitRow(lines[0]).map(c => c.toLowerCase());
  // Buscar la columna "código único" / "codigo unico" / "codigo"
  const codigoIdx = headerCells.findIndex(h => h.includes('codigo') || h.includes('código'));
  const hasHeader = codigoIdx !== -1 || headerCells[0] === 'id';

  // Si encontramos header con "codigo", usar esa columna.
  // Si el primer header es "id" y hay >1 columnas, asumir que la 2ª es el código.
  // En cualquier otro caso, usar la primera columna.
  let targetCol = 0;
  if (codigoIdx !== -1) {
    targetCol = codigoIdx;
  } else if (headerCells[0] === 'id' && headerCells.length > 1) {
    targetCol = 1;
  }

  const startIdx = hasHeader ? 1 : 0;
  const codes = new Set<string>();
  for (let i = startIdx; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    const value = cells[targetCol]?.trim();
    if (value) codes.add(value);
  }
  return Array.from(codes);
}

export function AnalisisOcupacionModal({
  open,
  onClose,
  initialInventarios,
  initialAnalisis,
  onSaved,
  readOnly = false,
}: AnalisisOcupacionModalProps) {
  const isDark = useThemeStore(s => s.theme) === 'dark';
  const queryClient = useQueryClient();
  const userRole = useAuthStore(s => s.user?.rol);
  // Selección múltiple (botón oculto): solo DEV. Nunca en modo solo lectura.
  const canBulkSelect = !readOnly && userRole === 'DEV';

  const [selectionMode, setSelectionMode] = useState(false);

  const [step, setStep] = useState<Step>('select');
  const [inventarios, setInventarios] = useState<InventarioResumen[]>([]);
  const [codigosNoEncontrados, setCodigosNoEncontrados] = useState<string[]>([]);
  // Periodo del análisis: rango libre de fechas + cómo partirlo en columnas.
  const [periodo, setPeriodo] = useState<PeriodoAnalisis>(() => periodoProximosDias(DIAS_PERIODO_INICIAL));
  // Se llena al abrir un análisis guardado sin periodo por fechas (formato anterior, por catorcenas).
  const [avisoFormatoAnterior, setAvisoFormatoAnterior] = useState<{ catorcenas: CatorcenaRef[] } | null>(null);
  const [matriz, setMatriz] = useState<MatrizOcupacion | null>(null);
  const [building, setBuilding] = useState(false);
  // Identifica la última matriz pedida: si llega la respuesta de una anterior, se descarta.
  const buildIdRef = useRef(0);

  const [csvProcessing, setCsvProcessing] = useState(false);
  const [csvFeedback, setCsvFeedback] = useState<{ encontrados: number; noEncontrados: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [analisisId, setAnalisisId] = useState<number | null>(null);
  const [analisisNombre, setAnalisisNombre] = useState('');
  const [savingAnalisis, setSavingAnalisis] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(true);

  const [shareCopied, setShareCopied] = useState(false);

  // Reset al abrir
  useEffect(() => {
    if (!open) return;
    if (initialAnalisis) {
      const owner = initialAnalisis.is_owner !== false;
      // Un análisis viejo (por catorcenas) no trae periodo por fechas: se abre
      // con el periodo inicial y un aviso para que elijan un rango nuevo.
      const guardado = initialAnalisis.periodos[0] ?? null;
      const p = guardado ?? periodoProximosDias(DIAS_PERIODO_INICIAL);
      setStep('matriz');
      setInventarios(initialAnalisis.inventarios);
      setCodigosNoEncontrados(initialAnalisis.codigosNoEncontrados);
      setPeriodo(p);
      setAvisoFormatoAnterior(guardado ? null : { catorcenas: initialAnalisis.catorcenasLegado });
      setAnalisisId(initialAnalisis.id);
      setAnalisisNombre(owner || readOnly ? initialAnalisis.nombre : `Copia de ${initialAnalisis.nombre}`);
      setIsOwner(owner);
      // Construir matriz al abrir
      void buildMatrizFor(initialAnalisis.inventarios, p);
    } else {
      // Descarta cualquier matriz que siguiera construyéndose de una apertura anterior.
      buildIdRef.current += 1;
      setBuilding(false);
      setStep('select');
      setInventarios(initialInventarios || []);
      setCodigosNoEncontrados([]);
      setPeriodo(periodoProximosDias(DIAS_PERIODO_INICIAL));
      setAvisoFormatoAnterior(null);
      setMatriz(null);
      setAnalisisId(null);
      setAnalisisNombre('');
      setIsOwner(true);
    }
    setCsvFeedback(null);
    setSaveError(null);
    setShareCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialAnalisis?.id]);

  const handleDownloadTemplate = () => {
    const csv = 'Código Único\nEJEMPLO-001\nEJEMPLO-002\n';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-analisis-ocupacion.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (file: File) => {
    setCsvProcessing(true);
    setCsvFeedback(null);
    try {
      // Excel en español suele guardar CSV en Windows-1252; intentamos UTF-8 estricto
      // y caemos a windows-1252 si encontramos bytes inválidos.
      const buffer = await file.arrayBuffer();
      let text: string;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      } catch {
        text = new TextDecoder('windows-1252').decode(buffer);
      }
      // Quita BOM residual por si acaso
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const codes = parseCsvCodes(text);
      if (codes.length === 0) {
        setCsvFeedback({ encontrados: 0, noEncontrados: 0 });
        return;
      }

      // Excluir códigos que ya están en la selección
      const existentes = new Set(inventarios.map(i => i.codigo_unico));
      const nuevosCodigos = codes.filter(c => !existentes.has(c));

      if (nuevosCodigos.length === 0) {
        setCsvFeedback({ encontrados: 0, noEncontrados: 0 });
        return;
      }

      const check = await inventariosService.bulkCheck(nuevosCodigos, true);
      const idsEncontrados: number[] = [
        ...check.sobreescribibles.map(s => s.id).filter((x): x is number => x !== null),
        ...check.ocupados.map(o => o.id).filter((x): x is number => x !== null),
      ];

      // Fetch full data en lotes para no saturar la red ni el servidor.
      // Con miles de IDs, Promise.all en paralelo provoca timeouts silenciosos
      // que se traducen en `null` y se filtran fuera, perdiendo registros.
      const CHUNK_SIZE = 50;
      const found: InventarioResumen[] = [];
      for (let i = 0; i < idsEncontrados.length; i += CHUNK_SIZE) {
        const chunk = idsEncontrados.slice(i, i + CHUNK_SIZE);
        const part = await Promise.all(
          chunk.map(async id => {
            try {
              const inv = await inventariosService.getById(id);
              return {
                id: inv.id,
                codigo_unico: inv.codigo_unico,
                ubicacion: inv.ubicacion,
                mueble: inv.mueble,
                plaza: inv.plaza,
                estado: inv.estado,
                tipo_de_cara: inv.tipo_de_cara,
                tradicional_digital: inv.tradicional_digital,
              } as InventarioResumen;
            } catch {
              return null;
            }
          })
        );
        for (const item of part) if (item) found.push(item);
      }

      // Combinar sin duplicados
      setInventarios(prev => {
        const map = new Map(prev.map(p => [p.id, p]));
        found.forEach(f => map.set(f.id, f));
        return Array.from(map.values());
      });
      setCodigosNoEncontrados(prev => Array.from(new Set([...prev, ...check.nuevos])));
      setCsvFeedback({ encontrados: found.length, noEncontrados: check.nuevos.length });
    } catch (err) {
      setCsvFeedback({ encontrados: 0, noEncontrados: 0 });
      console.error('Error procesando CSV:', err);
    } finally {
      setCsvProcessing(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const removeInventario = (id: number) => {
    setInventarios(prev => prev.filter(i => i.id !== id));
  };

  const removeCodigoNoEncontrado = (codigo: string) => {
    setCodigosNoEncontrados(prev => prev.filter(c => c !== codigo));
  };

  const buildMatrizFor = useCallback(async (invs: InventarioResumen[], p: PeriodoAnalisis) => {
    const buildId = ++buildIdRef.current;
    setBuilding(true);
    try {
      const m = await analisisOcupacionService.buildMatriz(invs, p);
      if (buildId === buildIdRef.current) setMatriz(m);
    } catch (err) {
      console.error('Error construyendo matriz:', err);
    } finally {
      if (buildId === buildIdRef.current) setBuilding(false);
    }
  }, []);

  const goToMatriz = () => {
    setStep('matriz');
    void buildMatrizFor(inventarios, periodo);
  };

  const handleSave = async () => {
    if (!analisisNombre.trim()) {
      setSaveError('Pon un nombre al análisis antes de guardar');
      return;
    }
    setSaveError(null);
    setSavingAnalisis(true);
    try {
      const payload = {
        nombre: analisisNombre.trim(),
        inventarios,
        // Se guarda en `catorcenas_data` como [{ inicio, fin, granularidad }].
        periodos: [periodo],
        codigosNoEncontrados,
      };
      const saved = analisisId && isOwner
        ? await analisisOcupacionService.update(analisisId, payload)
        : await analisisOcupacionService.create(payload);
      setAnalisisId(saved.id);
      setIsOwner(true);
      // Ya quedó guardado con periodo por fechas: el aviso de formato anterior sobra.
      setAvisoFormatoAnterior(null);
      // Invalidar cache de la lista para que aparezca al instante en "Guardados"
      queryClient.invalidateQueries({ queryKey: ['analisis-ocupacion'] });
      onSaved?.(saved);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingAnalisis(false);
    }
  };

  const handleShare = async () => {
    if (!analisisId) {
      setSaveError('Guarda el análisis primero para poder compartirlo');
      return;
    }
    const url = `${window.location.origin}/inventarios/analisis/${analisisId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt('Copia el enlace:', url);
    }
  };

  const canContinueFromSelect = inventarios.length > 0;
  const canContinueFromPeriodos = validarPeriodo(periodo) === null;

  if (!open) return null;

  const stepIndex = step === 'select' ? 1 : step === 'periodos' ? 2 : 3;

  // Texto del aviso para análisis guardados con el formato anterior (catorcenas).
  const textoAvisoFormato = (() => {
    if (!avisoFormatoAnterior) return '';
    const cats = avisoFormatoAnterior.catorcenas;
    const lista = cats.slice(0, 6).map(c => `C${c.numero}-${c.anio}`).join(', ') + (cats.length > 6 ? '…' : '');
    const origen = cats.length > 0
      ? `Este análisis se guardó por catorcenas (${lista}), un formato que ya no se usa.`
      : 'Este análisis no tenía un periodo por fechas guardado.';
    const accion = readOnly
      ? ''
      : isOwner
        ? ' Usa “Cambiar periodo” para elegir otro rango y guarda para actualizarlo.'
        : ' Usa “Cambiar periodo” para elegir otro rango y guarda una copia con el formato nuevo.';
    return `${origen} Se muestra la ocupación del ${rangoLegible(periodo.inicio, periodo.fin)}.${accion}`;
  })();

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className={`${isDark ? 'bg-zinc-900' : 'bg-white'} rounded-2xl border ${isDark ? 'border-purple-500/20' : 'border-purple-200'} w-full ${step === 'matriz' ? 'max-w-7xl' : 'max-w-3xl'} max-h-[92vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-500/10`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-5 border-b ${isDark ? 'border-purple-500/20 bg-gradient-to-r from-purple-900/20 via-fuchsia-900/10 to-purple-900/20' : 'border-purple-200 bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-50'} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${isDark ? 'bg-purple-500/20' : 'bg-purple-50'} flex items-center justify-center`}
                onClick={() => {
                  if (step !== 'matriz' || !canBulkSelect) return;
                  setSelectionMode(s => !s);
                }}
              >
                <BarChart3 className={`h-5 w-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Análisis de Ocupación</h2>
                <p className={`text-xs ${isDark ? 'text-purple-300/50' : 'text-purple-400'}`}>
                  Paso {stepIndex} de 3 · {step === 'select' ? 'Inventarios' : step === 'periodos' ? 'Periodo' : 'Matriz'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'} transition-colors`}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className={`flex items-center px-5 py-2 border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'} gap-2 text-xs`}>
            {(['select', 'periodos', 'matriz'] as const).map((s, idx) => {
              const active = step === s;
              const done = stepIndex > idx + 1;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                    active
                      ? isDark ? 'bg-purple-500 text-white' : 'bg-purple-600 text-white'
                      : done
                        ? isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                        : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <span className={active ? (isDark ? 'text-purple-300 font-medium' : 'text-purple-700 font-medium') : isDark ? 'text-zinc-500' : 'text-gray-400'}>
                    {s === 'select' ? 'Inventarios' : s === 'periodos' ? 'Periodo' : 'Resultado'}
                  </span>
                  {idx < 2 && <ChevronDown className={`h-3 w-3 -rotate-90 ${isDark ? 'text-zinc-700' : 'text-gray-300'}`} />}
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className={`flex-1 p-5 min-h-0 ${step === 'matriz' ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
            {step === 'select' && (
              <div className="space-y-4">
                {/* CSV upload */}
                <div className={`rounded-xl border ${isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'} p-4`}>
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div>
                      <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Carga masiva por CSV</h3>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Detecta la columna "Código Único" por el encabezado. Si no hay encabezado, usa la primera columna.</p>
                    </div>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) void handleCsvUpload(f);
                      }}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleDownloadTemplate}
                        title="Descargar plantilla CSV con el formato esperado"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar template
                      </button>
                      <button
                        onClick={() => csvInputRef.current?.click()}
                        disabled={csvProcessing}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'} disabled:opacity-50`}
                      >
                        {csvProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {csvProcessing ? 'Procesando...' : 'Subir CSV'}
                      </button>
                    </div>
                  </div>
                  {csvFeedback && (
                    <div className={`mt-2 text-xs flex items-center gap-3 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        {csvFeedback.encontrados} encontrados
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <AlertCircle className={`h-3.5 w-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        {csvFeedback.noEncontrados} no encontrados
                      </span>
                    </div>
                  )}
                </div>

                {/* Lista de inventarios encontrados */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Inventarios seleccionados <span className={isDark ? 'text-purple-300' : 'text-purple-600'}>({inventarios.length})</span>
                    </h3>
                  </div>
                  {inventarios.length === 0 ? (
                    <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'} py-8 text-center border border-dashed ${isDark ? 'border-zinc-700' : 'border-gray-300'} rounded-lg`}>
                      Aún no hay inventarios. Selecciona en la tabla o sube un CSV.
                    </div>
                  ) : (
                    <div className={`rounded-lg border ${isDark ? 'border-zinc-700' : 'border-gray-200'} overflow-hidden max-h-72 overflow-y-auto`}>
                      <table className="w-full text-xs">
                        <thead className={`${isDark ? 'bg-zinc-800/80 text-zinc-400' : 'bg-gray-50 text-gray-500'} sticky top-0`}>
                          <tr>
                            <th className="px-3 py-2 text-left font-medium w-8">#</th>
                            <th className="px-3 py-2 text-left font-medium">Código</th>
                            <th className="px-3 py-2 text-left font-medium">Mueble</th>
                            <th className="px-3 py-2 text-left font-medium">Plaza</th>
                            <th className="px-3 py-2 text-left font-medium">Ubicación</th>
                            <th className="px-3 py-2 text-center font-medium w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventarios.map((inv, idx) => (
                            <tr key={inv.id} className={`border-t ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
                              <td className={`px-3 py-1.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{idx + 1}</td>
                              <td className={`px-3 py-1.5 font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{inv.codigo_unico}</td>
                              <td className={`px-3 py-1.5 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{inv.mueble || '-'}</td>
                              <td className={`px-3 py-1.5 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{inv.plaza || '-'}</td>
                              <td className={`px-3 py-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'} max-w-[260px] truncate`} title={inv.ubicacion || undefined}>{inv.ubicacion || '-'}</td>
                              <td className="px-3 py-1.5 text-center">
                                <button
                                  onClick={() => removeInventario(inv.id)}
                                  className={`p-1 rounded ${isDark ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                  title="Quitar"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Códigos no encontrados */}
                {codigosNoEncontrados.length > 0 && (
                  <div>
                    <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      <AlertCircle className="h-4 w-4" />
                      Códigos no encontrados ({codigosNoEncontrados.length})
                    </h3>
                    <div className={`flex flex-wrap gap-1.5 p-3 rounded-lg border ${isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'} max-h-32 overflow-y-auto`}>
                      {codigosNoEncontrados.map(c => (
                        <span key={c} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono ${isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-white text-amber-700 border border-amber-200'}`}>
                          {c}
                          <button onClick={() => removeCodigoNoEncontrado(c)} className="hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'periodos' && (
              <PeriodoSelector value={periodo} onChange={setPeriodo} isDark={isDark} acento="purple" />
            )}

            {step === 'matriz' && (
              <>
                {avisoFormatoAnterior && (
                  <div className={`mb-2 shrink-0 flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{textoAvisoFormato}</span>
                  </div>
                )}
                <MatrizView
                  matriz={matriz}
                  building={building}
                  isDark={isDark}
                  onRefresh={() => buildMatrizFor(inventarios, periodo)}
                  selectionMode={selectionMode}
                  readOnly={readOnly}
                  nombreAnalisis={analisisNombre}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'} flex items-center justify-between gap-3`}>
            {step === 'matriz' && readOnly ? (
              <div className="flex items-center gap-2 flex-1">
                <span className={`text-sm font-medium truncate max-w-md ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {analisisNombre}
                </span>
                <span
                  title="Estás viendo un análisis compartido en modo solo lectura."
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${isDark ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}
                >
                  Solo lectura
                </span>
                <div className="ml-auto">
                  <button
                    onClick={onClose}
                    className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : step === 'matriz' ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={analisisNombre}
                  onChange={e => setAnalisisNombre(e.target.value)}
                  placeholder="Nombre del análisis..."
                  className={`flex-1 max-w-xs px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'} focus:outline-none focus:ring-1 focus:ring-purple-500/50`}
                />
                {!isOwner && (
                  <span
                    title="Estás viendo un análisis compartido. Al guardar se creará una copia en tu cuenta."
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
                  >
                    Compartido
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={savingAnalisis}
                  title={!isOwner ? 'Crea una copia en tu cuenta' : analisisId ? 'Actualizar análisis' : 'Guardar análisis'}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'} disabled:opacity-50`}
                >
                  {savingAnalisis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {!isOwner ? 'Guardar copia' : analisisId ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  onClick={handleShare}
                  disabled={!analisisId}
                  title={!analisisId ? 'Guarda primero para compartir' : 'Copiar enlace'}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'} disabled:opacity-50`}
                >
                  {shareCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                  {shareCopied ? 'Copiado' : 'Compartir'}
                </button>
                {saveError && <span className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>{saveError}</span>}
                <div className="ml-auto">
                  <button
                    onClick={() => setStep('periodos')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Cambiar periodo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Cancelar
                </button>
                <div className="flex items-center gap-2">
                  {step === 'periodos' && (
                    <button
                      onClick={() => setStep('select')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Atrás
                    </button>
                  )}
                  {step === 'select' && (
                    <button
                      onClick={() => setStep('periodos')}
                      disabled={!canContinueFromSelect}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      Continuar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {step === 'periodos' && (
                    <button
                      onClick={goToMatriz}
                      disabled={!canContinueFromPeriodos}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      Generar matriz
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </>
  );
}

// ===== Selector de periodo (rango de fechas + granularidad) =====
// Lo usan el análisis de ocupación (morado) y el bloqueo masivo (rosa). No
// depende de la tabla de catorcenas: el rango es libre.

const ACENTOS_PERIODO = {
  purple: {
    icono: { dark: 'text-purple-400', light: 'text-purple-600' },
    ring: 'focus:ring-purple-500/50',
    atajoActivo: { dark: 'bg-purple-500/20 border-purple-500 text-purple-200', light: 'bg-purple-50 border-purple-500 text-purple-800' },
    segmentoActivo: { dark: 'bg-purple-500/25 text-purple-200', light: 'bg-purple-100 text-purple-800' },
    resumen: { dark: 'border-purple-500/30 bg-purple-500/5', light: 'border-purple-200 bg-purple-50/50' },
    resumenTexto: { dark: 'text-purple-300', light: 'text-purple-700' },
  },
  rose: {
    icono: { dark: 'text-rose-400', light: 'text-rose-600' },
    ring: 'focus:ring-rose-500/50',
    atajoActivo: { dark: 'bg-rose-500/20 border-rose-500 text-rose-200', light: 'bg-rose-50 border-rose-500 text-rose-800' },
    segmentoActivo: { dark: 'bg-rose-500/25 text-rose-200', light: 'bg-rose-100 text-rose-800' },
    resumen: { dark: 'border-rose-500/30 bg-rose-500/5', light: 'border-rose-200 bg-rose-50/50' },
    resumenTexto: { dark: 'text-rose-300', light: 'text-rose-700' },
  },
} as const;

export function PeriodoSelector({
  value,
  onChange,
  isDark,
  acento = 'purple',
}: {
  value: PeriodoAnalisis;
  onChange: (p: PeriodoAnalisis) => void;
  isDark: boolean;
  acento?: keyof typeof ACENTOS_PERIODO;
}) {
  const a = ACENTOS_PERIODO[acento];
  const tono = (par: { dark: string; light: string }) => (isDark ? par.dark : par.light);
  const muted = isDark ? 'text-zinc-500' : 'text-gray-500';
  const atajos = useMemo(() => atajosPeriodo(), []);
  const error = validarPeriodo(value);
  const rangoOk = rangoEnOrden(value.inicio, value.fin);
  const auto = rangoOk ? granularidadAutomatica(value.inicio, value.fin) : null;

  // Último periodo válido. Sirve de referencia para saber si la granularidad la
  // eligió el usuario: mientras se teclea un año el input emite fechas
  // intermedias (0202-11-18...) que no deben borrar esa elección.
  const ultimoValidoRef = useRef<PeriodoAnalisis | null>(null);
  useEffect(() => {
    if (!validarPeriodo(value)) ultimoValidoRef.current = value;
  }, [value]);
  const referencia = (): PeriodoAnalisis => (error ? ultimoValidoRef.current ?? value : value);

  // Si el rango queda al revés o incompleto, solo se muestra el error de validación.
  const cambiarRango = (inicio: string, fin: string) => onChange(periodoConRango(inicio, fin, referencia()));

  const inputClass = `px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white [color-scheme:dark]' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-1 ${a.ring}`;
  const botonInactivo = isDark
    ? 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400';

  const dias = rangoOk ? diasDelRango(value.inicio, value.fin) : 0;
  const columnas = rangoOk ? contarColumnas(value.inicio, value.fin, value.granularidad) : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Calendar className={`h-4 w-4 ${tono(a.icono)}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Rango de fechas</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={`text-[11px] ${muted}`}>Desde</span>
            <input
              type="date"
              value={value.inicio}
              onChange={e => cambiarRango(e.target.value, value.fin)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={`text-[11px] ${muted}`}>Hasta</span>
            <input
              type="date"
              value={value.fin}
              min={esFechaISO(value.inicio) ? value.inicio : undefined}
              onChange={e => cambiarRango(value.inicio, e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs ${muted}`}>Atajos:</span>
        {atajos.map(at => {
          const activo = at.inicio === value.inicio && at.fin === value.fin;
          return (
            <button
              key={at.id}
              type="button"
              onClick={() => cambiarRango(at.inicio, at.fin)}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${activo ? tono(a.atajoActivo) : botonInactivo}`}
            >
              {at.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs ${muted}`}>Ver por:</span>
        <div className={`flex items-center rounded-lg border overflow-hidden text-xs ${isDark ? 'border-zinc-700' : 'border-gray-300'}`}>
          {GRANULARIDADES.map((g, idx) => {
            const n = rangoOk ? contarColumnas(value.inicio, value.fin, g) : 0;
            const permitida = rangoOk && granularidadPermitida(value.inicio, value.fin, g);
            const activa = value.granularidad === g;
            return (
              <button
                key={g}
                type="button"
                disabled={!permitida}
                onClick={() => onChange({ ...value, granularidad: g })}
                title={!rangoOk
                  ? 'Elige primero el rango de fechas'
                  : permitida
                    ? `${n} ${n === 1 ? 'columna' : 'columnas'}`
                    : `Serían ${n} columnas; el máximo es ${MAX_COLUMNAS}`}
                className={`px-3 py-1.5 font-medium transition-colors ${idx > 0 ? (isDark ? 'border-l border-zinc-700' : 'border-l border-gray-300') : ''} ${
                  activa
                    ? tono(a.segmentoActivo)
                    : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {GRANULARIDAD_LABEL[g]}
                {auto === g && <span className="ml-1 text-[9px] font-normal opacity-70">(auto)</span>}
              </button>
            );
          })}
        </div>
        <span className={`text-[11px] ${muted}`}>
          Se ajusta solo al largo del rango: hasta 90 días por día, hasta un año por semana y más largo por mes.
        </span>
      </div>

      {error ? (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className={`rounded-lg border p-3 ${tono(a.resumen)}`}>
          <div className={`text-sm font-medium ${tono(a.resumenTexto)}`}>{rangoLegible(value.inicio, value.fin)}</div>
          <div className={`text-[11px] mt-0.5 ${muted}`}>
            {dias} {dias === 1 ? 'día' : 'días'} · {columnas} {columnas === 1 ? 'columna' : 'columnas'} por {GRANULARIDAD_UNIDAD[value.granularidad].uno}
            {auto === value.granularidad ? ' (automático)' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Matrix View =====
const labelForCampana = (c: CampanaEnCelda): string => {
  if (c.campana_id) return c.campana_nombre || `Campaña #${c.campana_id}`;
  return `Propuesta #${c.propuesta_id}`;
};

// Estatus de reserva que cuentan como VENDIDO (venta firme). Espejo de
// ESTATUS_FIRME en inventario-bloqueo.service.ts del back — esa es la lista que
// gobierna ocupacion, bloqueo y el detector de conflictos, y es la que hay que
// mantener en sync. 'Con Arte'/'Sin Arte' son ventas con/sin arte cargado: el
// cliente sigue teniendo el espacio, asi que ocupan igual.
// OJO: el dashboard usa una lista distinta (expandEstatusFilter, sin 'Sin Arte')
// porque ahi es un filtro de reporte, no la definicion de ocupacion.
// OJO 2: no sirve mirar si hay campana_id — propuesta, cotizacion y campania se
// crean en la misma transaccion, asi que campana_id casi siempre viene lleno.
const ESTATUS_VENDIDO = new Set(['Vendido', 'Vendido bonificado', 'Con Arte', 'Sin Arte']);
const esVendida = (c: CampanaEnCelda): boolean => ESTATUS_VENDIDO.has(c.reserva_estatus);

// Un inventario Tradicional solo admite 1 VENTA por fecha (por columna); los Digitales admiten varias.
const esDigital = (inv?: InventarioResumen): boolean => inv?.tradicional_digital === 'Digital';
const conflictoKey = (invId: number, cellKey: string): string => `${invId}|${cellKey}`;

// Regla de conflicto (multireservas), evaluada en cada columna (día/semana/mes):
// varias reservas sobre la misma cara y fechas son válidas y esperadas — el
// equipo reserva de más y luego define. Lo que no puede convivir es una venta
// con cualquier otra cosa:
//   reserva + reserva   -> OK, no es conflicto
//   campaña + reserva   -> conflicto
//   campaña + campaña   -> conflicto
// "Campaña" = reserva con estatus vendido (ver ESTATUS_VENDIDO); no basta con
// que traiga campana_id, que casi siempre viene lleno.
const contarVendidas = (campanas: CampanaEnCelda[]): number => campanas.filter(esVendida).length;
const hayConflicto = (campanas: CampanaEnCelda[]): boolean =>
  campanas.length >= 2 && contarVendidas(campanas) >= 1;

// Estado que se muestra en cada tarjeta / celda y por el que se puede filtrar.
type EstadoCelda = 'vendido' | 'reservado' | 'disponible';
const estadoDeTarjeta = (c: CampanaEnCelda): EstadoCelda => (esVendida(c) ? 'vendido' : 'reservado');

// Texto principal de una tarjeta: vendida -> nombre de campaña; reservada -> propuesta.
const labelTarjeta = (c: CampanaEnCelda): string => {
  const nombreCampana = c.campana_nombre || `Campaña #${c.campana_id}`;
  if (esVendida(c)) return nombreCampana;
  return c.propuesta_id ? `Propuesta #${c.propuesta_id}` : nombreCampana;
};

/** Ancho de las celdas compactas según la granularidad (más columnas → más angostas). */
const ANCHO_CELDA: Record<Granularidad, string> = { dia: 'w-7', semana: 'w-12', mes: 'w-14' };

/** Colores de las celdas compactas (los mismos tonos de las tarjetas); también se usan en la leyenda. */
const clasesCelda = (isDark: boolean) => ({
  disponible: isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200',
  reservado: isDark
    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-amber-500/35'
    : 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200',
  vendido: isDark
    ? 'bg-red-500/25 border-red-500/50 text-red-200 hover:bg-red-500/40'
    : 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200',
});

/** Tooltip de una celda ocupada: el detalle de sus reservas en texto corto. */
function tooltipCelda(
  codigo: string,
  col: ColumnaPeriodo,
  visibles: CampanaEnCelda[],
  total: number,
  conflicto: boolean,
): string {
  const MAX_LINEAS = 6;
  const lineas = [`${codigo} · ${col.titulo}`];
  if (conflicto) lineas.push('CONFLICTO: una venta convive con otra venta o reserva');
  for (const c of visibles.slice(0, MAX_LINEAS)) {
    const rango = rangoCorto(c.inicio_periodo, c.fin_periodo);
    lineas.push(`${esVendida(c) ? 'Vendido' : 'Reservado'}: ${labelTarjeta(c)} · ${c.cliente_nombre || 'Sin cliente'}${rango ? ` (${rango})` : ''}`);
  }
  if (visibles.length > MAX_LINEAS) lineas.push(`… y ${visibles.length - MAX_LINEAS} más`);
  if (total > visibles.length) lineas.push(`${total - visibles.length} oculta(s) por los filtros`);
  lineas.push('Clic para ver el detalle');
  return lineas.join('\n');
}

/** Conflicto del panel: columnas seguidas de un sitio con las mismas reservas en conflicto. */
interface ConflictoRango {
  key: string;
  inv: InventarioResumen;
  desde: ColumnaPeriodo;
  hasta: ColumnaPeriodo;
  celdas: number;
  vendidas: number;
  reservadas: number;
  /** reserva_ids de la celda, para saber si la siguiente columna es el mismo conflicto. */
  firma: string;
}

function MatrizView({
  matriz,
  building,
  isDark,
  onRefresh,
  selectionMode,
  readOnly = false,
  nombreAnalisis,
}: {
  matriz: MatrizOcupacion | null;
  building: boolean;
  isDark: boolean;
  onRefresh: () => Promise<void> | void;
  selectionMode: boolean;
  readOnly?: boolean;
  nombreAnalisis?: string;
}) {
  const userRole = useAuthStore(s => s.user?.rol);
  // En modo solo lectura nadie puede liberar reservas, sin importar el rol.
  const canRelease = !readOnly && (
    userRole === 'DEV'
    || userRole === 'Gerente de Trafico'
    || userRole === 'Coordinador de trafico'
    || userRole === 'Especialista de trafico'
    || userRole === 'Auxiliar de trafico'
  );

  const [showDuplicados, setShowDuplicados] = useState(false);
  const [soloDuplicados, setSoloDuplicados] = useState(false);
  const [campanaFilter, setCampanaFilter] = useState<Set<string>>(new Set());
  // Filtro por estado de celda (acumulable): vacío = sin filtro.
  const [estadoFilter, setEstadoFilter] = useState<Set<EstadoCelda>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  // Celda abierta en la ventana de detalle (inventario × columna).
  const [celdaAbierta, setCeldaAbierta] = useState<{ invId: number; colKey: string } | null>(null);

  const [confirmRelease, setConfirmRelease] = useState<{
    card: CampanaEnCelda;
    inventario: InventarioResumen;
  } | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Selección múltiple (por reserva_id)
  const [selectedReservas, setSelectedReservas] = useState<Set<number>>(new Set());
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [bulkReleasing, setBulkReleasing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const toggleReservaSelected = (reservaId: number) => {
    setSelectedReservas(prev => {
      const next = new Set(prev);
      if (next.has(reservaId)) next.delete(reservaId);
      else next.add(reservaId);
      return next;
    });
  };
  const clearSelection = () => setSelectedReservas(new Set());

  const handleConfirmRelease = async () => {
    if (!confirmRelease || !canRelease) return;
    if (confirmRelease.card.aps && confirmRelease.card.aps > 0) {
      setReleaseError(
        confirmRelease.card.posted
          ? 'Esta reserva tiene POST y no se puede eliminar'
          : 'Esta reserva tiene APS asignado y no se puede eliminar'
      );
      return;
    }
    setReleasing(true);
    setReleaseError(null);
    try {
      const { card } = confirmRelease;
      if (card.campana_id) {
        await campanasService.deleteReservas(card.campana_id, [card.reserva_id]);
      } else if (card.propuesta_id) {
        await propuestasService.deleteReservas(card.propuesta_id, [card.reserva_id]);
      } else {
        throw new Error('La reserva no tiene campaña ni propuesta asociada');
      }
      setConfirmRelease(null);
      await onRefresh();
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : 'Error al liberar la reserva');
    } finally {
      setReleasing(false);
    }
  };

  // Lookup de las cards seleccionadas (resolviendo reserva_id contra la matriz).
  // Una reserva aparece en todas las columnas que cubre: se toma una sola vez.
  const selectedCards = useMemo(() => {
    const out: { card: CampanaEnCelda; inventarioId: number }[] = [];
    if (!matriz || selectedReservas.size === 0) return out;
    const vistas = new Set<number>();
    for (const [invIdStr, invCeldas] of Object.entries(matriz.celdas)) {
      for (const celda of Object.values(invCeldas)) {
        for (const c of celda.campanas) {
          if (!selectedReservas.has(c.reserva_id) || vistas.has(c.reserva_id)) continue;
          vistas.add(c.reserva_id);
          out.push({ card: c, inventarioId: Number(invIdStr) });
        }
      }
    }
    return out;
  }, [matriz, selectedReservas]);

  const handleBulkRelease = async () => {
    if (!canRelease || selectedCards.length === 0) return;
    setBulkReleasing(true);
    setBulkError(null);
    try {
      // Agrupar por campana_id y propuesta_id para minimizar requests
      const byCampana = new Map<number, number[]>();
      const byPropuesta = new Map<number, number[]>();
      for (const { card } of selectedCards) {
        if (card.aps && card.aps > 0) continue; // defensivo: nunca debería entrar aquí
        if (card.campana_id) {
          const list = byCampana.get(card.campana_id) || [];
          list.push(card.reserva_id);
          byCampana.set(card.campana_id, list);
        } else if (card.propuesta_id) {
          const list = byPropuesta.get(card.propuesta_id) || [];
          list.push(card.reserva_id);
          byPropuesta.set(card.propuesta_id, list);
        }
      }

      const errores: string[] = [];
      for (const [campanaId, reservaIds] of byCampana) {
        try {
          await campanasService.deleteReservas(campanaId, reservaIds);
        } catch (err) {
          const axiosErr = err as { response?: { data?: { error?: string } } };
          const msg = axiosErr?.response?.data?.error || (err instanceof Error ? err.message : 'error');
          errores.push(`Campaña #${campanaId}: ${msg}`);
        }
      }
      for (const [propuestaId, reservaIds] of byPropuesta) {
        try {
          await propuestasService.deleteReservas(propuestaId, reservaIds);
        } catch (err) {
          const axiosErr = err as { response?: { data?: { error?: string } } };
          const msg = axiosErr?.response?.data?.error || (err instanceof Error ? err.message : 'error');
          errores.push(`Propuesta #${propuestaId}: ${msg}`);
        }
      }

      await onRefresh();

      if (errores.length === 0) {
        setConfirmBulkOpen(false);
        clearSelection();
      } else {
        setBulkError(errores.join(' · '));
        clearSelection(); // los IDs viejos ya no aplican
      }
    } finally {
      setBulkReleasing(false);
    }
  };

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  // Si se apaga el modo selección desde fuera, limpia la selección actual
  useEffect(() => {
    if (!selectionMode) setSelectedReservas(new Set());
  }, [selectionMode]);

  const allCampanas = useMemo(() => {
    if (!matriz) return [] as { label: string; cliente: string }[];
    const map = new Map<string, { label: string; cliente: string }>();
    for (const invCeldas of Object.values(matriz.celdas)) {
      for (const celda of Object.values(invCeldas)) {
        for (const c of celda.campanas) {
          const label = labelForCampana(c);
          if (!map.has(label)) {
            map.set(label, { label, cliente: c.cliente_nombre || 'Sin cliente' });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [matriz]);

  const filteredOptions = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return allCampanas;
    return allCampanas.filter(o =>
      o.label.toLowerCase().includes(q) || o.cliente.toLowerCase().includes(q)
    );
  }, [allCampanas, filterSearch]);

  const isFiltered = campanaFilter.size > 0;

  const toggleCampana = (label: string) => {
    setCampanaFilter(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const clearFilter = () => setCampanaFilter(new Set());
  const selectAllVisible = () =>
    setCampanaFilter(prev => {
      const next = new Set(prev);
      filteredOptions.forEach(o => next.add(o.label));
      return next;
    });


  const invById = useMemo(() => {
    const m = new Map<number, InventarioResumen>();
    if (matriz) for (const inv of matriz.inventarios) m.set(inv.id, inv);
    return m;
  }, [matriz]);

  // Conflictos por celda (inventario × columna) de inventarios Tradicionales.
  // Los Digitales admiten varias ventas a la vez y se excluyen.
  const conflictoCeldas = useMemo(() => {
    const set = new Set<string>();
    if (!matriz) return set;
    for (const [invIdStr, invCeldas] of Object.entries(matriz.celdas)) {
      if (esDigital(invById.get(Number(invIdStr)))) continue;
      for (const [cellKey, celda] of Object.entries(invCeldas)) {
        if (hayConflicto(celda.campanas)) set.add(conflictoKey(Number(invIdStr), cellKey));
      }
    }
    return set;
  }, [matriz, invById]);

  // Lista de conflictos para el panel informativo. Las columnas seguidas de un
  // mismo sitio con las mismas reservas en conflicto se juntan en un renglón con
  // su rango de fechas (si no, una venta duplicada de 20 días serían 20 renglones).
  const conflictos = useMemo(() => {
    const out: ConflictoRango[] = [];
    if (!matriz) return out;
    for (const inv of matriz.inventarios) {
      if (esDigital(inv)) continue;
      const invCeldas = matriz.celdas[inv.id];
      if (!invCeldas) continue;
      let actual: ConflictoRango | null = null;
      for (const col of matriz.columnas) {
        const celda = invCeldas[col.key];
        if (!celda || !hayConflicto(celda.campanas)) {
          actual = null;
          continue;
        }
        const firma = celda.campanas.map(c => c.reserva_id).sort((x, y) => x - y).join(',');
        if (actual && actual.firma === firma) {
          actual.hasta = col;
          actual.celdas += 1;
          continue;
        }
        const vendidas = contarVendidas(celda.campanas);
        actual = {
          key: conflictoKey(inv.id, col.key),
          inv,
          desde: col,
          hasta: col,
          celdas: 1,
          vendidas,
          reservadas: celda.campanas.length - vendidas,
          firma,
        };
        out.push(actual);
      }
    }
    return out;
  }, [matriz]);

  const isEstadoFiltered = estadoFilter.size > 0;
  const toggleEstado = (e: EstadoCelda) =>
    setEstadoFilter(prev => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });

  // Tarjetas de una celda que pasan el filtro de campañas y el de estado.
  const filtrarTarjetas = useCallback((campanas: CampanaEnCelda[]): CampanaEnCelda[] => {
    if (!isFiltered && !isEstadoFiltered) return campanas;
    return campanas.filter(c => {
      if (isFiltered && !campanaFilter.has(labelForCampana(c))) return false;
      if (isEstadoFiltered && !estadoFilter.has(estadoDeTarjeta(c))) return false;
      return true;
    });
  }, [campanaFilter, isFiltered, estadoFilter, isEstadoFiltered]);

  // Una celda "Disponible" se muestra salvo que haya filtro de estado sin 'disponible'.
  const disponibleVisible = !isEstadoFiltered || estadoFilter.has('disponible');

  // Tarjetas visibles de una celda con TODOS los filtros aplicados (incluido "Solo conflictos").
  const tarjetasVisibles = useCallback((invId: number, cellKey: string, campanas: CampanaEnCelda[]): CampanaEnCelda[] => {
    if (soloDuplicados && !conflictoCeldas.has(conflictoKey(invId, cellKey))) return [];
    return filtrarTarjetas(campanas);
  }, [soloDuplicados, conflictoCeldas, filtrarTarjetas]);

  const hayFiltros = isFiltered || isEstadoFiltered || soloDuplicados;

  const inventariosFiltrados = useMemo(() => {
    if (!matriz) return [] as InventarioResumen[];
    if (!hayFiltros) return matriz.inventarios;
    return matriz.inventarios.filter(inv => {
      const invCeldas = matriz.celdas[inv.id];
      if (!invCeldas) return false;
      for (const col of matriz.columnas) {
        const celda = invCeldas[col.key];
        if (!celda) continue;
        if (celda.campanas.length === 0) {
          // Celda disponible: solo cuenta si el filtro de estado la incluye y no hay
          // filtro de campaña ni "solo conflictos" (ambos exigen tarjetas).
          if (!isFiltered && !soloDuplicados && isEstadoFiltered && disponibleVisible) return true;
          continue;
        }
        if (tarjetasVisibles(inv.id, col.key, celda.campanas).length > 0) return true;
      }
      return false;
    });
  }, [matriz, hayFiltros, isFiltered, soloDuplicados, isEstadoFiltered, disponibleVisible, tarjetasVisibles]);

  // Reservas visibles y liberables (sin APS, dentro de los filtros activos), una vez cada una.
  const selectableCards = useMemo(() => {
    if (!matriz) return [] as CampanaEnCelda[];
    const out: CampanaEnCelda[] = [];
    const vistas = new Set<number>();
    for (const inv of inventariosFiltrados) {
      const invCeldas = matriz.celdas[inv.id];
      if (!invCeldas) continue;
      for (const col of matriz.columnas) {
        const celda = invCeldas[col.key];
        if (!celda) continue;
        for (const c of tarjetasVisibles(inv.id, col.key, celda.campanas)) {
          if (c.aps && c.aps > 0) continue;
          if (vistas.has(c.reserva_id)) continue;
          vistas.add(c.reserva_id);
          out.push(c);
        }
      }
    }
    return out;
  }, [matriz, inventariosFiltrados, tarjetasVisibles]);

  // Datos de la celda abierta en la ventana de detalle (con los filtros aplicados).
  const celdaDetalle = useMemo(() => {
    if (!celdaAbierta || !matriz) return null;
    const inv = invById.get(celdaAbierta.invId);
    const col = matriz.columnas.find(c => c.key === celdaAbierta.colKey);
    if (!inv || !col) return null;
    const todas = matriz.celdas[inv.id]?.[col.key]?.campanas || [];
    return {
      inv,
      col,
      todas,
      visibles: tarjetasVisibles(inv.id, col.key, todas),
      esConflicto: conflictoCeldas.has(conflictoKey(inv.id, col.key)),
    };
  }, [celdaAbierta, matriz, invById, tarjetasVisibles, conflictoCeldas]);

  // Si la celda abierta se queda sin reservas visibles (p.ej. tras liberar), se cierra.
  useEffect(() => {
    if (!celdaAbierta || building) return;
    if (!celdaDetalle || celdaDetalle.visibles.length === 0) setCeldaAbierta(null);
  }, [celdaAbierta, celdaDetalle, building]);

  // Filas de la matriz. Se memorizan para que abrir la ventana de detalle o el
  // menú de filtros no vuelva a pintar miles de celdas (vista por día).
  const filasMatriz = useMemo(() => {
    if (!matriz) return null;
    const clases = clasesCelda(isDark);
    const base = `${ANCHO_CELDA[matriz.periodo.granularidad]} h-7 mx-auto rounded flex items-center justify-center text-[10px] font-semibold border`;

    // Celda compacta: color por estado + número de reservas. El detalle va en el
    // tooltip y en la ventana que se abre al hacer clic.
    const renderCelda = (inv: InventarioResumen, col: ColumnaPeriodo) => {
      const codigo = inv.codigo_unico || `#${inv.id}`;
      const todas = matriz.celdas[inv.id]?.[col.key]?.campanas || [];

      if (todas.length === 0) {
        if (!disponibleVisible) {
          return (
            <td key={col.key} className="p-0.5">
              <div
                className={`${base} border-dashed ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}
                title={`${codigo} · ${col.titulo}\nDisponible (oculto por el filtro de estado)`}
              />
            </td>
          );
        }
        return (
          <td key={col.key} className="p-0.5">
            <div className={`${base} ${clases.disponible}`} title={`${codigo} · ${col.titulo}\nDisponible`} />
          </td>
        );
      }

      const visibles = tarjetasVisibles(inv.id, col.key, todas);
      if (visibles.length === 0) {
        return (
          <td key={col.key} className="p-0.5">
            <div
              className={`${base} border-dashed font-medium ${isDark ? 'border-zinc-700 text-zinc-600' : 'border-gray-300 text-gray-400'}`}
              title={`${codigo} · ${col.titulo}\n${todas.length} reserva(s) oculta(s) por los filtros`}
            >
              {todas.length}
            </div>
          </td>
        );
      }

      const esConflicto = conflictoCeldas.has(conflictoKey(inv.id, col.key));
      const colorClass = visibles.some(esVendida) ? clases.vendido : clases.reservado;
      const seleccionada = selectionMode && visibles.some(c => selectedReservas.has(c.reserva_id));
      return (
        <td key={col.key} className="p-0.5">
          <button
            type="button"
            onClick={() => setCeldaAbierta({ invId: inv.id, colKey: col.key })}
            title={tooltipCelda(codigo, col, visibles, todas.length, esConflicto)}
            className={`${base} relative cursor-pointer transition-colors ${colorClass} ${esConflicto ? 'ring-2 ring-inset ring-amber-500' : ''} ${
              seleccionada ? (isDark ? 'outline outline-2 outline-offset-1 outline-purple-400' : 'outline outline-2 outline-offset-1 outline-purple-500') : ''
            }`}
          >
            {visibles.length}
            {esConflicto && (
              <AlertCircle className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${isDark ? 'text-amber-400 bg-zinc-900' : 'text-amber-600 bg-white'}`} />
            )}
          </button>
        </td>
      );
    };

    return inventariosFiltrados.map(inv => (
      <tr key={inv.id} className={`border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
        <td className={`sticky left-0 z-10 px-3 py-1.5 ${isDark ? 'bg-zinc-900' : 'bg-white'} border-r ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{inv.codigo_unico}</span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${inv.tradicional_digital === 'Digital' ? (isDark ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200') : (isDark ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'bg-pink-50 text-pink-700 border-pink-200')}`}>
              {inv.tradicional_digital || 'Tradicional'}
            </span>
          </div>
          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'} truncate max-w-[200px]`} title={inv.ubicacion || undefined}>
            {inv.plaza || '-'} · {inv.mueble || '-'}
          </div>
        </td>
        {matriz.columnas.map(col => renderCelda(inv, col))}
      </tr>
    ));
  }, [matriz, inventariosFiltrados, tarjetasVisibles, conflictoCeldas, disponibleVisible, selectionMode, selectedReservas, isDark]);

  // Exporta la matriz tal como se ve (respeta filtros de campaña, estado y conflictos).
  const handleDownloadCsv = () => {
    if (!matriz) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = [
      'Código', 'Tipo', 'Plaza', 'Mueble', 'Ubicación',
      ...matriz.columnas.map(c => c.titulo),
    ];
    const rows = inventariosFiltrados.map(inv => {
      const base = [
        inv.codigo_unico || `#${inv.id}`,
        inv.tradicional_digital || 'Tradicional',
        inv.plaza || '',
        inv.mueble || '',
        inv.ubicacion || '',
      ];
      const cols = matriz.columnas.map(col => {
        const todas = matriz.celdas[inv.id]?.[col.key]?.campanas || [];
        if (todas.length === 0) return disponibleVisible && !soloDuplicados ? 'Disponible' : '';
        const vis = tarjetasVisibles(inv.id, col.key, todas);
        if (vis.length === 0) return '';
        const partes = vis.map(c => {
          const rango = rangoCorto(c.inicio_periodo, c.fin_periodo);
          return `${esVendida(c) ? 'Vendido' : 'Reservado'}: ${labelTarjeta(c)} (${c.cliente_nombre || 'Sin cliente'})${rango ? ` [${rango}]` : ''}`;
        });
        const prefijo = conflictoCeldas.has(conflictoKey(inv.id, col.key)) ? 'CONFLICTO · ' : '';
        return prefijo + partes.join(' | ');
      });
      return [...base, ...cols].map(esc).join(',');
    });
    const csv = '﻿' + [header.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const nombre = (nombreAnalisis || 'matriz').trim().replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, '').replace(/\s+/g, '-') || 'matriz';
    a.href = url;
    a.download = `analisis-ocupacion-${nombre}-${matriz.periodo.inicio}_a_${matriz.periodo.fin}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allSelectableSelected = selectableCards.length > 0
    && selectableCards.every(c => selectedReservas.has(c.reserva_id));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      clearSelection();
    } else {
      setSelectedReservas(new Set(selectableCards.map(c => c.reserva_id)));
    }
  };

  if (building || !matriz) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Construyendo matriz de ocupación...</p>
      </div>
    );
  }

  const hoy = hoyISO();
  const grupos = agruparColumnas(matriz.columnas);
  const anchoCelda = ANCHO_CELDA[matriz.periodo.granularidad];
  const unidad = GRANULARIDAD_UNIDAD[matriz.periodo.granularidad];
  const clases = clasesCelda(isDark);

  // Tarjeta de una reserva en la ventana de detalle.
  const renderTarjeta = (c: CampanaEnCelda, inv: InventarioResumen) => {
    // Reservado -> amarillo y enlaza a la propuesta.
    // Vendido   -> rojo y enlaza a la campaña.
    // El fallback cruzado cubre el caso raro de que falte el id
    // del lado que corresponde (dato huerfano).
    const vendida = esVendida(c);
    const cardClass = vendida
      ? isDark
        ? 'bg-red-500/10 border-red-500/40 hover:bg-red-500/20'
        : 'bg-red-50 border-red-200 hover:bg-red-100'
      : isDark
        ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
        : 'bg-amber-50 border-amber-200 hover:bg-amber-100';
    const statusLabel = vendida ? 'Vendido' : 'Reservado';
    const statusTextClass = vendida
      ? isDark ? 'text-red-300' : 'text-red-700'
      : isDark ? 'text-amber-300' : 'text-amber-700';
    const hrefCampana = `/campanas/detail/${c.campana_id}`;
    const hrefPropuesta = `/propuestas?viewId=${c.propuesta_id}`;
    const href = vendida
      ? (c.campana_id ? hrefCampana : hrefPropuesta)
      : (c.propuesta_id ? hrefPropuesta : hrefCampana);
    const label = labelTarjeta(c);
    const clienteLabel = c.cliente_nombre || 'Sin cliente';
    const rangoLabel = rangoCorto(c.inicio_periodo, c.fin_periodo);
    const bloqueadoLocal = !!(c.aps && c.aps > 0);
    const seleccionable = canRelease && !bloqueadoLocal;
    const isSelected = selectionMode && selectedReservas.has(c.reserva_id);
    const selectionRing = isSelected
      ? (isDark ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-zinc-900' : 'ring-2 ring-purple-500 ring-offset-1 ring-offset-white')
      : '';
    const padLeft = selectionMode && seleccionable ? 'pl-7' : '';
    const padRight = canRelease ? 'pr-7' : '';
    return (
      <div key={c.reserva_id} className={`relative group/card rounded-md ${selectionRing}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={vendida ? `Abrir campaña: ${label}` : `Abrir propuesta #${c.propuesta_id}`}
          className={`block w-full text-left rounded-md p-2 ${padLeft} ${padRight} border transition-all cursor-pointer ${cardClass}`}
        >
          <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${statusTextClass}`}>
            {statusLabel}
            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
          </div>
          <div
            className={`text-[11px] mt-1 truncate underline underline-offset-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}
            title={label}
          >
            {label}
          </div>
          <div
            className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}
            title={clienteLabel}
          >
            {clienteLabel}
          </div>
          {c.articulo && (
            <div
              className={`text-[10px] mt-0.5 truncate font-mono ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
              title={`Artículo: ${c.articulo}`}
            >
              {c.articulo}
            </div>
          )}
          {rangoLabel && (
            <div
              className={`text-[10px] mt-0.5 truncate font-mono ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}
              title={`Reserva #${c.reserva_id} · ${rangoLabel}`}
            >
              {rangoLabel} · #{c.reserva_id}
            </div>
          )}
        </a>
        {seleccionable && selectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleReservaSelected(c.reserva_id)}
            onClick={e => e.stopPropagation()}
            title="Seleccionar para liberación en lote"
            className="absolute top-1.5 left-1.5 h-3.5 w-3.5 cursor-pointer accent-purple-500"
          />
        )}
        {canRelease && (() => {
          const tooltipBloqueo = c.posted
            ? 'Tiene POST, no se puede eliminar'
            : 'Tiene APS asignado, no se puede eliminar';
          return (
            <button
              type="button"
              disabled={bloqueadoLocal}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                if (bloqueadoLocal) return;
                setReleaseError(null);
                setConfirmRelease({ card: c, inventario: inv });
              }}
              title={bloqueadoLocal ? tooltipBloqueo : 'Liberar reserva (eliminar de la BD)'}
              className={`absolute top-1 right-1 p-1 rounded transition-all ${
                bloqueadoLocal
                  ? `opacity-100 cursor-not-allowed ${isDark ? 'text-zinc-600' : 'text-gray-300'}`
                  : `opacity-0 group-hover/card:opacity-100 focus:opacity-100 ${
                      isDark
                        ? 'text-zinc-400 hover:text-red-300 hover:bg-red-500/20'
                        : 'text-gray-500 hover:text-red-600 hover:bg-red-100'
                    }`
              }`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div ref={filterRef} className="relative">
          <button
            onClick={() => setFilterOpen(o => !o)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isFiltered
                ? isDark
                  ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 hover:bg-purple-500/30'
                  : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                : isDark
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Filtrar campañas en la matriz"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>
              {isFiltered
                ? `${campanaFilter.size} de ${allCampanas.length} campañas`
                : `Filtrar campañas (${allCampanas.length})`}
            </span>
            {isFiltered && (
              <span
                role="button"
                onClick={e => { e.stopPropagation(); clearFilter(); }}
                className={`flex items-center justify-center rounded-full p-0.5 ${isDark ? 'hover:bg-purple-500/40' : 'hover:bg-purple-200'}`}
                title="Limpiar filtro"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          {filterOpen && (
            <div
              className={`absolute z-40 mt-1 left-0 w-80 rounded-lg border shadow-xl ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className={`p-2 border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
                <div className={`flex items-center gap-2 px-2 py-1 rounded-md border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'}`}>
                  <Search className={`h-3.5 w-3.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                  <input
                    autoFocus
                    type="text"
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    placeholder="Buscar campaña o cliente..."
                    className={`flex-1 bg-transparent text-xs outline-none ${isDark ? 'text-white placeholder:text-zinc-500' : 'text-gray-900 placeholder:text-gray-400'}`}
                  />
                  {filterSearch && (
                    <button onClick={() => setFilterSearch('')} className={isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px]">
                  <button
                    onClick={selectAllVisible}
                    disabled={filteredOptions.length === 0}
                    className={`px-2 py-0.5 rounded ${isDark ? 'text-purple-300 hover:bg-purple-500/15' : 'text-purple-700 hover:bg-purple-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    Seleccionar {filterSearch ? 'visibles' : 'todas'}
                  </button>
                  <button
                    onClick={clearFilter}
                    disabled={!isFiltered}
                    className={`px-2 py-0.5 rounded ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {filteredOptions.length === 0 ? (
                  <div className={`px-3 py-4 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                    Sin coincidencias
                  </div>
                ) : (
                  filteredOptions.map(opt => {
                    const selected = campanaFilter.has(opt.label);
                    return (
                      <label
                        key={opt.label}
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs ${
                          isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCampana(opt.label)}
                          className="accent-purple-500 h-3.5 w-3.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`truncate ${isDark ? 'text-zinc-200' : 'text-gray-800'}`} title={opt.label}>
                            {opt.label}
                          </div>
                          <div className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-gray-500'}`} title={opt.cliente}>
                            {opt.cliente}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        {/* Filtro por estado (acumulable) */}
        <div className={`flex items-center rounded-lg border overflow-hidden text-xs ${isDark ? 'border-zinc-700' : 'border-gray-300'}`} title="Filtrar por estado (puedes combinar varios)">
          {([
            { key: 'reservado', label: 'Reservado', on: isDark ? 'bg-amber-500/25 text-amber-200' : 'bg-amber-100 text-amber-800' },
            { key: 'vendido', label: 'Vendido', on: isDark ? 'bg-red-500/25 text-red-200' : 'bg-red-100 text-red-800' },
            { key: 'disponible', label: 'Disponible', on: isDark ? 'bg-emerald-500/25 text-emerald-200' : 'bg-emerald-100 text-emerald-800' },
          ] as { key: EstadoCelda; label: string; on: string }[]).map((opt, idx) => {
            const active = estadoFilter.has(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => toggleEstado(opt.key)}
                className={`px-2.5 py-1.5 font-medium transition-colors ${idx > 0 ? (isDark ? 'border-l border-zinc-700' : 'border-l border-gray-300') : ''} ${
                  active
                    ? opt.on
                    : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          {isEstadoFiltered && (
            <button
              onClick={() => setEstadoFilter(new Set())}
              title="Quitar filtro de estado"
              className={`px-2 py-1.5 ${isDark ? 'border-l border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700' : 'border-l border-gray-300 text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {hayFiltros && (
          <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
            Mostrando {inventariosFiltrados.length} de {matriz.inventarios.length} inventarios
          </span>
        )}
        <button
          onClick={handleDownloadCsv}
          disabled={inventariosFiltrados.length === 0}
          title="Descargar la matriz visible en CSV"
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Download className="h-3.5 w-3.5" />
          Descargar CSV
        </button>
        {canRelease && selectionMode && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
            isDark
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
              : 'bg-purple-50 border-purple-300 text-purple-800'
          }`}>
            <button
              onClick={toggleSelectAll}
              disabled={selectableCards.length === 0}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                isDark ? 'hover:bg-purple-500/30 disabled:opacity-40' : 'hover:bg-purple-100 disabled:opacity-40'
              }`}
              title={allSelectableSelected ? 'Deseleccionar todas' : 'Seleccionar todas las visibles y liberables'}
            >
              {allSelectableSelected
                ? 'Deseleccionar todas'
                : `Seleccionar todas (${selectableCards.length})`}
            </button>
            {selectedReservas.size > 0 && (
              <>
                <span className={`${isDark ? 'text-purple-300/50' : 'text-purple-400'}`}>·</span>
                <span className="font-semibold">
                  {selectedReservas.size} {selectedReservas.size === 1 ? 'seleccionada' : 'seleccionadas'}
                </span>
                <button
                  onClick={() => setConfirmBulkOpen(true)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium ${
                    isDark ? 'bg-red-500/30 text-red-200 hover:bg-red-500/40' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <Trash2 className="h-3 w-3" />
                  Liberar
                </button>
                <button
                  onClick={clearSelection}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    isDark ? 'hover:bg-purple-500/30' : 'hover:bg-purple-100'
                  }`}
                  title="Limpiar selección"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Periodo y leyenda de colores */}
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
        <span className={`font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
          {etiquetaPeriodo(matriz.periodo)} · {matriz.columnas.length} {matriz.columnas.length === 1 ? unidad.uno : unidad.varios}
        </span>
        <span className="inline-flex items-center gap-1"><span className={`inline-block w-3 h-3 rounded border ${clases.disponible}`} />Disponible</span>
        <span className="inline-flex items-center gap-1"><span className={`inline-block w-3 h-3 rounded border ${clases.reservado}`} />Reservado</span>
        <span className="inline-flex items-center gap-1"><span className={`inline-block w-3 h-3 rounded border ${clases.vendido}`} />Vendido</span>
        <span className="inline-flex items-center gap-1"><span className={`inline-block w-3 h-3 rounded border ring-2 ring-inset ring-amber-500 ${clases.vendido}`} />Conflicto</span>
        <span>El número es la cantidad de reservas; pasa el cursor o haz clic para ver el detalle.</span>
      </div>

      {matriz.inventariosConError.length > 0 && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            No se pudo cargar el historial de {matriz.inventariosConError.length} {matriz.inventariosConError.length === 1 ? 'inventario' : 'inventarios'}; aparecen sin reservas.
          </span>
          <button
            onClick={() => void onRefresh()}
            className={`ml-auto px-2 py-0.5 rounded font-medium ${isDark ? 'hover:bg-amber-500/20' : 'hover:bg-amber-100'}`}
          >
            Reintentar
          </button>
        </div>
      )}

      {conflictos.length > 0 && (
        <div className={`rounded-lg border ${isDark ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50'} text-xs`}>
          <div className="flex items-stretch">
            <button
              onClick={() => setShowDuplicados(s => !s)}
              className={`flex-1 flex items-center gap-2 px-3 py-2 ${isDark ? 'text-amber-300 hover:bg-amber-500/10' : 'text-amber-700 hover:bg-amber-100/50'} rounded-l-lg transition-colors`}
              title="Inventarios Tradicionales con una venta que convive con otra venta o con reservas en las mismas fechas"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="font-semibold">
                {conflictos.length} {conflictos.length === 1 ? 'conflicto' : 'conflictos'}
                {' '}· {conflictoCeldas.size} {conflictoCeldas.size === 1 ? 'celda' : 'celdas'}
              </span>
              <span className={`${isDark ? 'text-amber-400/70' : 'text-amber-600/80'}`}>
                (Tradicional vendido que comparte fechas con otra venta o reserva)
              </span>
              <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${showDuplicados ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setSoloDuplicados(s => !s)}
              title="Mostrar solo las celdas en conflicto"
              className={`flex items-center gap-1.5 px-3 py-2 border-l text-xs font-medium rounded-r-lg transition-colors ${
                soloDuplicados
                  ? isDark
                    ? 'bg-amber-500/30 border-amber-500/40 text-amber-100'
                    : 'bg-amber-200 border-amber-300 text-amber-900'
                  : isDark
                    ? 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10'
                    : 'border-amber-200 text-amber-700 hover:bg-amber-100/60'
              }`}
            >
              {soloDuplicados ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
              Solo conflictos
            </button>
          </div>
          {showDuplicados && (
            <div className={`px-3 pb-2 pt-1 max-h-44 overflow-y-auto border-t ${isDark ? 'border-amber-500/20' : 'border-amber-200/60'}`}>
              <ul className="space-y-0.5">
                {conflictos.map(cf => (
                  <li key={cf.key}>
                    <button
                      type="button"
                      onClick={() => setCeldaAbierta({ invId: cf.inv.id, colKey: cf.desde.key })}
                      title="Ver el detalle de la celda"
                      className={`w-full text-left flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-1 py-0.5 ${isDark ? 'text-zinc-300 hover:bg-amber-500/10' : 'text-gray-700 hover:bg-amber-100/60'}`}
                    >
                      <span className="font-mono font-medium">{cf.inv.codigo_unico || `#${cf.inv.id}`}</span>
                      <span className={isDark ? 'text-zinc-500' : 'text-gray-500'}>
                        · {rangoLegible(cf.desde.inicio, cf.hasta.fin)}
                        {cf.celdas > 1 ? ` (${cf.celdas} ${unidad.varios})` : ''}
                      </span>
                      <span className={isDark ? 'text-zinc-500' : 'text-gray-500'}>· {cf.inv.plaza || '-'}</span>
                      <span
                        title="Ventas y reservas que conviven en estas fechas (un Tradicional solo debería tener una venta y nada más)"
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-white text-amber-700 border-amber-200'}`}
                      >
                        {cf.vendidas} vendida{cf.vendidas === 1 ? '' : 's'}
                        {cf.reservadas > 0 ? ` + ${cf.reservadas} reservada${cf.reservadas === 1 ? '' : 's'}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className={`sticky left-0 top-0 z-30 px-3 py-2 text-left align-bottom text-xs font-semibold border-b ${isDark ? 'border-purple-500/30 bg-zinc-900 text-purple-300' : 'border-purple-200 bg-white text-purple-700'} min-w-[200px]`}
            >
              Inventario
            </th>
            {grupos.map(g => (
              <th
                key={g.key}
                colSpan={g.span}
                title={g.etiqueta}
                className={`sticky top-0 z-20 h-6 p-0 border-l ${isDark ? 'border-zinc-800 bg-zinc-900 text-purple-300' : 'border-gray-200 bg-white text-purple-700'}`}
              >
                <span className="absolute inset-x-1 top-1 truncate text-left text-[10px] font-semibold">{g.etiqueta}</span>
              </th>
            ))}
          </tr>
          <tr>
            {matriz.columnas.map(col => {
              const esHoy = columnaIncluye(col, hoy);
              const textoClass = esHoy
                ? isDark ? 'bg-purple-500/25 text-purple-100' : 'bg-purple-100 text-purple-800'
                : col.finDeSemana
                  ? isDark ? 'text-zinc-500' : 'text-gray-400'
                  : isDark ? 'text-zinc-300' : 'text-gray-600';
              return (
                <th
                  key={col.key}
                  title={esHoy ? `${col.titulo} (hoy)` : col.titulo}
                  className={`sticky top-6 z-20 px-0.5 py-1 text-center border-b ${isDark ? 'border-purple-500/30 bg-zinc-900' : 'border-purple-200 bg-white'}`}
                >
                  <div className={`${anchoCelda} mx-auto rounded leading-tight ${textoClass}`}>
                    <div className="text-[10px] font-semibold whitespace-nowrap">{col.etiqueta}</div>
                    {col.detalle && <div className="text-[9px] font-normal whitespace-nowrap opacity-80">{col.detalle}</div>}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {inventariosFiltrados.length === 0 && (
            <tr>
              <td
                colSpan={matriz.columnas.length + 1}
                className={`px-3 py-8 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}
              >
                Ningún inventario coincide con los filtros activos.
              </td>
            </tr>
          )}
          {filasMatriz}
        </tbody>
      </table>
      </div>

      {/* Detalle de una celda: las reservas que caen en ese día/semana/mes */}
      {celdaDetalle && celdaDetalle.visibles.length > 0 && (
        <div
          className="fixed inset-0 bg-black/60 z-[55] flex items-center justify-center p-4"
          onClick={() => setCeldaAbierta(null)}
        >
          <div
            className={`rounded-2xl border ${isDark ? 'bg-zinc-900 border-purple-500/30' : 'bg-white border-purple-200'} w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'} flex items-start gap-3`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {celdaDetalle.inv.codigo_unico || `#${celdaDetalle.inv.id}`}
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${celdaDetalle.inv.tradicional_digital === 'Digital' ? (isDark ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200') : (isDark ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'bg-pink-50 text-pink-700 border-pink-200')}`}>
                    {celdaDetalle.inv.tradicional_digital || 'Tradicional'}
                  </span>
                </div>
                <div className={`text-xs mt-0.5 font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{celdaDetalle.col.titulo}</div>
                <div className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-zinc-500' : 'text-gray-500'}`} title={celdaDetalle.inv.ubicacion || undefined}>
                  {celdaDetalle.inv.plaza || '-'} · {celdaDetalle.inv.mueble || '-'}
                </div>
              </div>
              <button
                onClick={() => setCeldaAbierta(null)}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-1.5">
              {celdaDetalle.esConflicto && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}
                  title="Inventario Tradicional vendido que comparte estas fechas con otra venta o con reservas"
                >
                  <AlertCircle className="h-3 w-3" />
                  Conflicto · {celdaDetalle.todas.length}
                </div>
              )}
              {celdaDetalle.visibles.map(c => renderTarjeta(c, celdaDetalle.inv))}
              {celdaDetalle.todas.length > celdaDetalle.visibles.length && (
                <div className={`text-[11px] italic ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                  {celdaDetalle.todas.length - celdaDetalle.visibles.length} reserva(s) más oculta(s) por los filtros
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmRelease && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
          onClick={() => !releasing && setConfirmRelease(null)}
        >
          <div
            className={`rounded-2xl border ${isDark ? 'bg-zinc-900 border-red-500/30' : 'bg-white border-red-200'} w-full max-w-md shadow-2xl`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
                  <AlertCircle className={`h-5 w-5 ${isDark ? 'text-red-300' : 'text-red-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ¿Liberar esta reserva?
                  </h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Se eliminará la reserva de la base de datos. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>
            <div className={`p-5 space-y-2 text-xs ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              {(() => {
                const { card, inventario } = confirmRelease;
                // Mismo criterio que la tarjeta: el estatus de la reserva decide
                // si esto es una venta o una reserva, no la presencia de campana_id.
                const vendida = esVendida(card);
                const rango = rangoLegible(card.inicio_periodo, card.fin_periodo);
                const rows: { k: string; v: string }[] = [
                  { k: 'Estatus', v: card.reserva_estatus || (vendida ? 'Vendido' : 'Reservado') },
                  { k: vendida ? 'Campaña' : 'Propuesta', v: vendida ? (card.campana_nombre || `#${card.campana_id}`) : `#${card.propuesta_id}` },
                  { k: 'Cliente', v: card.cliente_nombre || 'Sin cliente' },
                  { k: 'Inventario', v: inventario.codigo_unico || `#${inventario.id}` },
                ];
                if (rango) rows.push({ k: 'Periodo', v: rango });
                if (card.articulo) rows.push({ k: 'Artículo', v: card.articulo });
                rows.push({ k: 'Reserva', v: `#${card.reserva_id}` });
                return rows.map(r => (
                  <div key={r.k} className="flex items-start gap-2">
                    <span className={`min-w-[80px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{r.k}:</span>
                    <span className="flex-1 font-medium break-words">{r.v}</span>
                  </div>
                ));
              })()}
              {releaseError && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {releaseError}
                </div>
              )}
            </div>
            <div className={`p-4 border-t ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'} flex items-center justify-end gap-2`}>
              <button
                onClick={() => setConfirmRelease(null)}
                disabled={releasing}
                className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-gray-700 hover:bg-gray-100'} disabled:opacity-50`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRelease}
                disabled={releasing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30' : 'bg-red-600 text-white hover:bg-red-700'} disabled:opacity-50`}
              >
                {releasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {releasing ? 'Liberando...' : 'Sí, liberar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
          onClick={() => !bulkReleasing && setConfirmBulkOpen(false)}
        >
          <div
            className={`rounded-2xl border ${isDark ? 'bg-zinc-900 border-red-500/30' : 'bg-white border-red-200'} w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
                  <AlertCircle className={`h-5 w-5 ${isDark ? 'text-red-300' : 'text-red-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ¿Liberar {selectedCards.length} {selectedCards.length === 1 ? 'reserva' : 'reservas'}?
                  </h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Se eliminarán de la base de datos. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>
            <div className={`p-5 overflow-y-auto text-xs ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              <ul className="space-y-1.5">
                {selectedCards.slice(0, 15).map(({ card }) => {
                  const esP = !card.campana_id;
                  const nombre = esP ? `Propuesta #${card.propuesta_id}` : (card.campana_nombre || `Campaña #${card.campana_id}`);
                  const rango = rangoCorto(card.inicio_periodo, card.fin_periodo);
                  return (
                    <li key={card.reserva_id} className="flex items-start gap-2">
                      <span className={`shrink-0 inline-block w-1.5 h-1.5 mt-1.5 rounded-full ${esP ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{nombre}</div>
                        <div className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                          {card.cliente_nombre || 'Sin cliente'}{rango ? ` · ${rango}` : ''} · #{card.reserva_id}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {selectedCards.length > 15 && (
                  <li className={`text-[11px] italic ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                    … y {selectedCards.length - 15} más
                  </li>
                )}
              </ul>
              {bulkError && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-xs whitespace-pre-line ${isDark ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {bulkError}
                </div>
              )}
            </div>
            <div className={`p-4 border-t ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'} flex items-center justify-end gap-2`}>
              <button
                onClick={() => setConfirmBulkOpen(false)}
                disabled={bulkReleasing}
                className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-gray-700 hover:bg-gray-100'} disabled:opacity-50`}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkRelease}
                disabled={bulkReleasing || selectedCards.length === 0}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30' : 'bg-red-600 text-white hover:bg-red-700'} disabled:opacity-50`}
              >
                {bulkReleasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {bulkReleasing ? 'Liberando...' : `Sí, liberar ${selectedCards.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
