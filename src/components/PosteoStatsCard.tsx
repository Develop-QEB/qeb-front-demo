import { useState } from 'react';
import { DollarSign, ChevronDown } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useThemeStore } from '../store/themeStore';
import { formatMoneyMXN } from '../lib/utils';

const fmtExacto = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;

// Estado contraído/expandido por vista, recordado en el navegador. Por
// default el bloque arranca CONTRAÍDO; solo se expande si el usuario lo abrió
// antes. Si el storage no está disponible (privado, bloqueado), no persiste y
// siempre arranca contraído.
const storageKey = (k: string) => `posteo-card:collapsed:${k}`;
function readCollapsed(k?: string): boolean {
  if (!k) return false;
  try { return localStorage.getItem(storageKey(k)) !== '0'; } catch { return true; }
}
function writeCollapsed(k: string, v: boolean): void {
  try { localStorage.setItem(storageKey(k), v ? '1' : '0'); } catch { /* sin persistencia */ }
}

// Bloque: inversión total del universo que lista Campañas (la suma de la
// columna Inversión, con o sin filtro). El monto exacto va en el tooltip.
//
// Demo sin SAP: el bloque también mostraba el estado de POST a SAP
// (pendientes por postear vs posteadas); se quitó y quedó solo el KPI de
// inversión. El nombre del componente se conserva para no mover archivos.
export function PosteoStatsCard({
  isLoading,
  periodoLabel,
  inversionTotal,
  inversionSubLabel,
  collapseKey,
}: {
  isLoading: boolean;
  periodoLabel?: string | null;
  /** Inversión total del universo (misma suma que el listado). */
  inversionTotal?: number | null;
  /** Texto chico bajo la inversión total (p. ej. "799 campañas · Todas"). */
  inversionSubLabel?: string | null;
  /** Si se pasa, el bloque se puede contraer/expandir y recuerda el estado bajo esta llave. */
  collapseKey?: string;
}) {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed(collapseKey));
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (collapseKey) writeCollapsed(collapseKey, next);
  };

  const total = inversionTotal ?? 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${isDark ? 'border-purple-900/30 bg-[#1a1025]/90 shadow-purple-900/10' : 'border-purple-200/50 bg-white/90 shadow-purple-100/20'} backdrop-blur-xl shadow-xl`}>
      <div className={`p-4 border-b ${isDark ? 'border-purple-900/30' : 'border-purple-200/50'} flex flex-wrap items-center justify-between gap-2`}>
        <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'} uppercase tracking-wider flex items-center gap-2`}>
          <DollarSign className={`h-4 w-4 ${isDark ? 'text-purple-300' : 'text-purple-600'}`} /> Inversión total
          {periodoLabel && (
            <span className={`normal-case tracking-normal text-[11px] font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
              {periodoLabel}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          {/* Contraído: resumen compacto en el encabezado para no perder el número clave. */}
          {collapsed && !isLoading && (
            <span className={`text-xs font-semibold ${isDark ? 'text-purple-300' : 'text-purple-600'}`} title={fmtExacto(total)}>
              {formatMoneyMXN(total)}
            </span>
          )}
          {collapseKey && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={!collapsed}
              title={collapsed ? 'Mostrar indicadores' : 'Ocultar indicadores'}
              className={`p-1 rounded-lg border transition-colors ${isDark ? 'border-purple-500/20 text-zinc-400 hover:text-white hover:bg-purple-500/10' : 'border-purple-200 text-gray-500 hover:text-gray-800 hover:bg-purple-50'}`}
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
      <div className="p-4">
        <div className={`rounded-xl p-4 ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'} border ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          {isLoading ? (
            <Skeleton className={`h-9 w-28 ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`} />
          ) : (
            <>
              <div
                className={`text-3xl font-light ${isDark ? 'text-white' : 'text-gray-800'}`}
                title={fmtExacto(total)}
              >
                {formatMoneyMXN(total)}
              </div>
              {inversionSubLabel && (
                <div className={`mt-1 text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{inversionSubLabel}</div>
              )}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
