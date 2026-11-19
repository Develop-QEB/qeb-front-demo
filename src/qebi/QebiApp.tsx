import { useEffect, useState } from 'react';
import { Construction, Filter, Target, TrendingUp } from 'lucide-react';
import { EmbudoPage, ObjetivosPage, VariacionesPage } from './features/reportes/ReportesPage';
import { useThemeStore } from './store/themeStore';
import { cn } from './lib/utils';
import { Header } from '../components/layout/Header';

type Vista = 'variaciones' | 'embudo' | 'objetivos';

const TABS = [
  { v: 'variaciones', label: 'Variaciones e impacto', Icon: TrendingUp },
  { v: 'embudo', label: 'Embudo', Icon: Filter },
  { v: 'objetivos', label: 'Objetivos', Icon: Target },
] as const;

/**
 * DEMO QEBI — vistas de reportes de QEBI (Variaciones, Embudo, Objetivos) con
 * datos hardcodeados (sin bi-back). Se omite la pestaña "BI" (réplica del Power
 * BI). Usa el mismo <Header> del demo para integrarse con el resto del sistema.
 */
export function QebiApp() {
  const [vista, setVista] = useState<Vista>('variaciones');
  const setTheme = useThemeStore((s) => s.setTheme);

  // Sincroniza el tema interno de QEBI con el tema real del demo (clase .dark en
  // <html>), para que los charts usen el isDark correcto.
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [setTheme]);

  // Las barras de filtro sticky de las vistas se anclan bajo el Header (h-16 = 64px).
  useEffect(() => {
    document.documentElement.style.setProperty('--bi-header-h', '64px');
    return () => { document.documentElement.style.removeProperty('--bi-header-h'); };
  }, []);

  return (
    <div className="min-h-screen">
      <Header title="QEBI" />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mx-auto max-w-[1600px] space-y-3">
          {/* Tabs */}
          <nav className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.v}
                onClick={() => setVista(t.v)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  vista === t.v
                    ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow'
                    : 'text-purple-700 hover:bg-purple-500/10 dark:text-purple-200'
                )}
              >
                <t.Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </nav>

          {/* Banner demo */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:text-amber-200">
            <Construction className="h-4 w-4 shrink-0" />
            <span><b>Módulo de demostración.</b> Datos de ejemplo (sin conexión a BI).</span>
          </div>

          {vista === 'variaciones' && <VariacionesPage />}
          {vista === 'embudo' && <EmbudoPage />}
          {vista === 'objetivos' && <ObjetivosPage />}
        </div>
      </div>
    </div>
  );
}

export default QebiApp;
