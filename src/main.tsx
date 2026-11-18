import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css';
import './index.css'
import App from './App.tsx'
import { aplicarVariablesMarca } from './config/marca'

// Apply saved theme before first render to avoid flash
try {
  const stored = JSON.parse(localStorage.getItem('theme-storage') || '{}');
  if (stored?.state?.theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch { /* ignore */ }

// Colores de marca (config/marca.ts) como variables CSS para las clases *-marca-*.
try { aplicarVariablesMarca(); } catch { /* ignore */ }

// Demo sin SAP: borrar cachés SAP que un navegador pudo guardar en versiones
// anteriores (catálogos de clientes/artículos y la BD SAP seleccionada).
try {
  ['sap_cuic_cache', 'sap_articulos_cache', 'environment-storage'].forEach((k) => localStorage.removeItem(k));
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
