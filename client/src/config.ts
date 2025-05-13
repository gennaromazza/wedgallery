/**
 * Configurazione per l'applicazione
 * 
 * Questo file consente di configurare l'applicazione per funzionare
 * sia a livello root che in una sottocartella (es. /wedgallery/)
 */

// Configura qui il percorso base dell'applicazione in produzione
// Usa '/' per installazione root, '/wedgallery/' per sottocartella
export const PRODUCTION_BASE_PATH = '/wedgallery/';

// In alternativa, potresti anche usare un environment variable
// export const PRODUCTION_BASE_PATH = import.meta.env.VITE_BASE_PATH || '/';