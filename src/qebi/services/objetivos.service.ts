/**
 * DEMO: objetivos hardcodeados (sin bi-back). Los setters son no-op resueltos.
 */
export interface ObjetivosData {
  anio: number;
  mensual: Record<number, number>;
  asesores: Record<string, number>;
}

const ASESORES = ['Ana Rivas', 'Beto Lomas', 'Carla Fenn', 'Diego Serna'];

export const getObjetivos = (anio: number): Promise<ObjetivosData> => {
  const mensual: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) mensual[m] = 800_000 + (m % 4) * 120_000;
  const asesores: Record<string, number> = {};
  ASESORES.forEach((a, i) => (asesores[a] = 2_400_000 - i * 300_000));
  return Promise.resolve({ anio, mensual, asesores });
};

export const putMensual = (_anio: number, _mes: number, _monto: number) => Promise.resolve();
export const putMensualBulk = (_anio: number, _montos: number[]) => Promise.resolve();
export const putAsesor = (_anio: number, _asesor: string, _monto: number) => Promise.resolve();
export const delMensual = (_anio: number) => Promise.resolve();
export const delAsesores = (_anio: number) => Promise.resolve();
