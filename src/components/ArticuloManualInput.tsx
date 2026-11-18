import { useEffect, useRef, useState } from 'react';
import {
  OPERACIONES_ARTICULO,
  OperacionArticulo,
  ArticuloManual,
  ARTICULO_CLAVE_MAX,
  componerArticulo,
  parsearArticulo,
  sanitizarClave,
  validarClave,
} from '../lib/articuloManual';

interface Props {
  /** Artículo actual ({ItemCode, ItemName}) o null. */
  value: ArticuloManual | null;
  /** Se llama con el artículo compuesto, o null si la clave no es válida. */
  onChange: (articulo: ArticuloManual | null) => void;
  isDark: boolean;
  disabled?: boolean;
  /** Clases extra para el contenedor. */
  className?: string;
}

/**
 * Captura manual del artículo: operación (Renta, Cortesía, ...) + clave libre.
 * Se guarda como "PREFIJO-CLAVE" (ver lib/articuloManual.ts).
 */
export function ArticuloManualInput({ value, onChange, isDark, disabled = false, className = '' }: Props) {
  const inicial = parsearArticulo(value?.ItemCode);
  const [operacion, setOperacion] = useState<OperacionArticulo>(inicial.operacion);
  const [claveTexto, setClaveTexto] = useState<string>(inicial.clave);
  // Último código que ESTE componente emitió ('' cuando emitió null por una
  // clave vacía o inválida). Sirve para distinguir el eco de nuestra propia
  // emisión de un cambio que viene de fuera.
  const ultimoEmitido = useRef<string>((value?.ItemCode || '').toUpperCase());

  // Si el artículo cambia desde fuera (abrir edición, limpiar el formulario),
  // sincronizar los campos. El eco de lo que acabamos de emitir se ignora, así
  // una clave inválida no se borra mientras el usuario la corrige.
  useEffect(() => {
    const externo = (value?.ItemCode || '').toUpperCase();
    if (externo === ultimoEmitido.current) return;
    ultimoEmitido.current = externo;
    const p = parsearArticulo(externo);
    setOperacion(p.operacion);
    setClaveTexto(externo ? p.clave : '');
  }, [value?.ItemCode]);

  const clave = sanitizarClave(claveTexto);
  const error = claveTexto ? validarClave(clave) : null;

  const emitir = (op: OperacionArticulo, texto: string) => {
    const c = sanitizarClave(texto);
    const art = c && !validarClave(c) ? componerArticulo(op, c) : null;
    ultimoEmitido.current = art?.ItemCode ?? '';
    onChange(art);
  };

  const campo = `w-full px-3 py-2 ${isDark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400'} border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed`;
  const ayuda = OPERACIONES_ARTICULO.find(o => o.value === operacion)?.ayuda;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_1fr] gap-2">
        <select
          value={operacion}
          disabled={disabled}
          onChange={(e) => {
            const op = e.target.value as OperacionArticulo;
            setOperacion(op);
            emitir(op, claveTexto);
          }}
          className={campo}
          aria-label="Operación"
        >
          {OPERACIONES_ARTICULO.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={claveTexto}
          disabled={disabled}
          maxLength={ARTICULO_CLAVE_MAX + 10}
          placeholder="Clave del artículo (ej. Parabús Zona Norte)"
          onChange={(e) => {
            setClaveTexto(e.target.value);
            emitir(operacion, e.target.value);
          }}
          className={campo}
          aria-label="Clave del artículo"
        />
      </div>
      <div className={`mt-1 text-[11px] ${error ? 'text-red-400' : isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
        {error
          ? error
          : clave
            ? <>Se guardará como <span className="font-mono">{operacion}-{clave}</span>{ayuda ? ` · ${ayuda}` : ''}</>
            : ayuda}
      </div>
    </div>
  );
}
