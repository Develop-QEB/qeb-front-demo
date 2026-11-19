import { useEffect, useRef, useState } from 'react';
import { Construction, Filter, Target, TrendingUp } from 'lucide-react';
import { EmbudoPage, ObjetivosPage, VariacionesPage } from './features/reportes/ReportesPage';
import { useThemeStore } from './store/themeStore';
import { cn } from './lib/utils';

type Vista = 'variaciones' | 'embudo' | 'objetivos';

const TABS = [
  { v: 'variaciones', label: 'Variaciones e impacto', Icon: TrendingUp },
  { v: 'embudo', label: 'Embudo', Icon: Filter },
  { v: 'objetivos', label: 'Objetivos', Icon: Target },
] as const;

/**
 * DEMO QEBI — copia de las vistas de reportes de QEBI (Variaciones, Embudo,
 * Objetivos), con datos hardcodeados (sin bi-back). Se omite la pestaña "BI"
 * (réplica del Power BI). Montada dentro del MainLayout del demo.
 */
export function QebiApp() {
  const [vista, setVista] = useState<Vista>('variaciones');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const activo = TABS.find((t) => t.v === vista) ?? TABS[0];
  const ActivoIcon = activo.Icon;

  // Sincroniza el tema de QEBI con el tema real del demo (clase .dark en <html>),
  // para que los charts usen el isDark correcto. No se pinta un toggle propio.
  const setTheme = useThemeStore((s) => s.setTheme);
  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark');
    setTheme(dark ? 'dark' : 'light');
    const obs = new MutationObserver(() => {
      const d = document.documentElement.classList.contains('dark');
      setTheme(d ? 'dark' : 'light');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [setTheme]);

  // Cierra el menú móvil al tocar fuera.
  useEffect(() => {
    if (!menuAbierto) return;
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menuAbierto]);

  // Publica la altura del header como --bi-header-h para las barras sticky.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--bi-header-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="bg-main-pattern min-h-svh overflow-x-clip">
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-purple-200/40 bg-white/70 backdrop-blur-xl dark:border-purple-900/30 dark:bg-[#140c1f]/70">
        <div className="mx-auto max-w-[1600px] px-3 py-2.5 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 text-sm font-bold text-white shadow-sm">BI</span>
              <div>
                <h1 className="text-base font-semibold leading-tight text-zinc-800 dark:text-white">QEBI · Reportes de Ventas</h1>
                <p className="hidden text-[11px] text-zinc-500 dark:text-zinc-400 sm:block">
                  Variaciones, embudo y objetivos · Solicitud → Propuesta → Campaña
                </p>
              </div>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 lg:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Demo · datos de ejemplo
            </span>
          </div>

          {/* Desktop: tabs en fila */}
          <nav className="mt-2.5 hidden flex-wrap items-center gap-2 sm:flex">
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

          {/* Móvil: botón + menú desplegable */}
          <div ref={navRef} className="relative mt-2.5 sm:hidden">
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              className="flex w-full items-center gap-3 rounded-full bg-purple-500/10 px-3 py-2 text-purple-700 transition-transform duration-150 active:scale-[0.98] dark:text-purple-200"
            >
              <span className="relative flex h-5 w-6 shrink-0 items-center justify-center">
                <span className={cn('absolute h-[2px] w-5 rounded-full bg-current transition-all duration-300 ease-out', menuAbierto ? 'rotate-45' : '-translate-y-[6px]')} />
                <span className={cn('absolute h-[2px] w-5 rounded-full bg-current transition-all duration-200 ease-out', menuAbierto && 'opacity-0')} />
                <span className={cn('absolute h-[2px] w-5 rounded-full bg-current transition-all duration-300 ease-out', menuAbierto ? '-rotate-45' : 'translate-y-[6px]')} />
              </span>
              <ActivoIcon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">{activo.label}</span>
            </button>
            <div
              className={cn(
                'absolute inset-x-0 z-30 grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out',
                menuAbierto ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="min-h-0">
                <div className="mt-2 flex flex-col gap-1 rounded-2xl border border-purple-200/50 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-purple-900/30 dark:bg-[#1a1025]/95">
                  {TABS.map((t, i) => (
                    <button
                      key={t.v}
                      onClick={() => { setVista(t.v); setMenuAbierto(false); }}
                      style={{ transitionDelay: menuAbierto ? `${60 + i * 45}ms` : '0ms' }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300',
                        menuAbierto ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
                        vista === t.v
                          ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow'
                          : 'text-purple-700 hover:bg-purple-500/10 dark:text-purple-200'
                      )}
                    >
                      <t.Icon className="h-4 w-4 shrink-0" />
                      {t.label}
                      {vista === t.v && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mx-auto max-w-[1600px] space-y-3">
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
