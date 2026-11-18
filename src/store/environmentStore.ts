import { create } from 'zustand';

// Demo: sin integración con SAP. No hay URL de proxy (ni variable de entorno ni
// respaldo), así que ninguna llamada sale hacia un servidor SAP. SAP_HABILITADO
// sirve para ocultar en la UI todo lo que dependa de SAP.
export const SAP_HABILITADO = false;
export const SAP_BASE_URL = '';

// Bases de datos SAP del sistema base. Se conserva el tipo porque varios
// componentes y datos todavía lo referencian; en el demo no apuntan a nada.
export type SapDatabase = 'CIMU' | 'TEST' | 'TRADE' | 'UDC';
export type Environment = SapDatabase;

// Sin SAP: todos los endpoints, compañías y series quedan vacíos.
export const getEndpoints = (_env: Environment) => ({
  cuic: '',
  articulos: '',
  deliveryNotes: '',
});
export const getSapCompanyDb = (_sapDb: SapDatabase): string => '';
export const getDeliveryNotesEndpoint = (_sapDb: SapDatabase): string => '';
export const getSeriesForSapDatabase = (_sapDb: SapDatabase): number => 0;

interface EnvironmentState {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
}

export const useEnvironmentStore = create<EnvironmentState>()((set) => ({
  environment: 'TEST' as Environment,
  setEnvironment: (env) => set({ environment: env }),
}));
