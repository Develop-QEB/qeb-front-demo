import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// Services
import { clientesService } from '../services/clientes.service';
import { solicitudesService } from '../services/solicitudes.service';
import { proveedoresService } from '../services/proveedores.service';
import { inventariosService } from '../services/inventarios.service';
import { campanasService } from '../services/campanas.service';
import { propuestasService } from '../services/propuestas.service';
import { dashboardService, resolveCatorcenaActual, FilterOptions } from '../services/dashboard.service';

// Hook para prefetching de datos
export function usePrefetch() {
  const queryClient = useQueryClient();

  // Prefetch clientes
  const prefetchClientes = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clientes', { page: 1, limit: 20 }],
      queryFn: () => clientesService.getAll({ page: 1, limit: 20 }),
      staleTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['clientes', 'stats'],
      queryFn: () => clientesService.getStats(),
      staleTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['clientes', 'filter-options'],
      queryFn: () => clientesService.getFilterOptions(),
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch solicitudes
  const prefetchSolicitudes = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['solicitudes', { page: 1, limit: 20 }],
      queryFn: () => solicitudesService.getAll({ page: 1, limit: 20 }),
      staleTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['solicitudes', 'stats'],
      queryFn: () => solicitudesService.getStats(),
      staleTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['solicitudes', 'catorcenas'],
      queryFn: () => solicitudesService.getCatorcenas(),
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch proveedores
  const prefetchProveedores = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['proveedores', { page: 1, limit: 20 }],
      queryFn: () => proveedoresService.getAll({ page: 1, limit: 20 }),
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch inventarios
  const prefetchInventarios = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['inventarios', { page: 1, limit: 50 }],
      queryFn: () => inventariosService.getAll({ page: 1, limit: 50 }),
      staleTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['inventarios', 'stats'],
      queryFn: () => inventariosService.getStats(),
      staleTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['inventarios', 'plazas'],
      queryFn: () => inventariosService.getPlazas(),
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch campañas
  const prefetchCampanas = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['campanas', { page: 1, limit: 20 }],
      queryFn: () => campanasService.getAll({ page: 1, limit: 20 }),
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch propuestas
  const prefetchPropuestas = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['propuestas', { page: 1, limit: 20 }],
      queryFn: () => propuestasService.getAll({ page: 1, limit: 20 }),
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch del dashboard: primero filter-options y con la catorcena actual
  // se calienta stats con la MISMA key que usa DashboardPage (el dashboard
  // arranca filtrado a la catorcena actual por default).
  const prefetchDashboard = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ['dashboard', 'filter-options'],
      queryFn: () => dashboardService.getFilterOptions(),
      staleTime: 30 * 60 * 1000,
    });
    const opts = queryClient.getQueryData<FilterOptions>(['dashboard', 'filter-options']);
    const catId = resolveCatorcenaActual(opts)?.id;
    const filters = catId ? { catorcena_id: catId } : {};
    await queryClient.prefetchQuery({
      queryKey: ['dashboard', 'stats', filters],
      queryFn: () => dashboardService.getStats(filters),
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch ligero — solo dashboard, el resto carga lazy por ruta
  const prefetchAll = useCallback(() => {
    void prefetchDashboard();
  }, [prefetchDashboard]);

  // Async version — only prefetch essential dashboard data to reduce DB connections
  // Other pages load lazily when the user navigates to them
  const prefetchAllAsync = useCallback(async () => {
    await prefetchDashboard();
  }, [prefetchDashboard]);

  return {
    prefetchClientes,
    prefetchSolicitudes,
    prefetchProveedores,
    prefetchInventarios,
    prefetchCampanas,
    prefetchPropuestas,
    prefetchAll,
    prefetchAllAsync,
  };
}

// Mapeo de rutas a funciones de prefetch
export const routePrefetchMap: Record<string, string> = {
  '/clientes': 'prefetchClientes',
  '/solicitudes': 'prefetchSolicitudes',
  '/proveedores': 'prefetchProveedores',
  '/inventarios': 'prefetchInventarios',
  '/campanas': 'prefetchCampanas',
  '/propuestas': 'prefetchPropuestas',
};
