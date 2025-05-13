// VERSIONE STABILE E SICURA PER ROUTING IN SUBDIRECTORY
// Gestisce correttamente il routing in produzione e sviluppo

/**
 * Ottiene il path base dell'applicazione in base all'ambiente
 * In produzione: '/wedgallery'  (senza slash finale)
 * In sviluppo: ''  (stringa vuota)
 * 
 * NOTA: Questo deve corrispondere al valore 'base' in vite.config.ts
 * ma senza lo slash finale, che viene gestito dalla funzione createUrl
 */
export function getBasePath(): string {
  // In produzione usa /wedgallery (senza slash finale)
  if (import.meta.env.PROD) {
    return '/wedgallery';
  }
  
  // In sviluppo usa stringa vuota
  return '';
}

// Questo è importante per capire se l'app è già montata
// nella sottodirectory o se è in un percorso semplice
export function isInSubdirectory(): boolean {
  const basePath = getBasePath();
  // Verifica esplicita dei tipi per evitare problemi di inferenza
  const hasBasePath = basePath !== '';
  const isInPath = hasBasePath ? window.location.pathname.startsWith(basePath) : false;
  const isProd = import.meta.env.PROD === true;
  
  return hasBasePath && isInPath && isProd;
}

/**
 * Crea un URL assoluto (con origine e tutti i percorsi completi)
 * Utile per redirect e navigazione esterna
 */
export function createAbsoluteUrl(path: string): string {
  const relativeUrl = createUrl(path);
  return `${window.location.origin}${relativeUrl}`;
}

/**
 * Crea un URL con il path base corretto
 * @param path Il percorso relativo (può iniziare con o senza /)
 * @returns L'URL completo con il path base
 */
export function createUrl(path: string): string {
  try {
    const basePath = getBasePath();
    
    // CASO SPECIALE - HOME PAGE
    if (path === '' || path === '/') {
      // Per la home page, sempre ritorna il basePath con slash
      const home = basePath ? `${basePath}/` : '/';
      console.log(`[createUrl] HOME path: "${path}" → "${home}"`);
      return home;
    }
    
    // STRATEGIA SICURA PER TUTTI GLI ALTRI PERCORSI
    
    // 1. Normalizza il path rimuovendo slash iniziali e finali
    // (verranno aggiunti in modo consistente)
    const cleanPath = path.replace(/^\/|\/$/g, '');
    
    // 2. Determina se è necessario includere il basePath
    // Non facciamo affidamento sulla posizione attuale dell'URL
    // ma garantiamo sempre un percorso completo e corretto
    
    // Per un'app in produzione, aggiungiamo sempre il basePath
    if (basePath && import.meta.env.PROD) {
      // Rimuovi eventuali slash iniziali e finali dal basePath
      const cleanBasePath = basePath.replace(/^\/|\/$/g, '');
      // Costruisci l'URL garantendo uno slash tra basePath e path
      const url = `/${cleanBasePath}/${cleanPath}`;
      console.log(`[createUrl] PROD path: "${path}" → "${url}"`);
      return url;
    } 
    // In sviluppo, usa solo il percorso semplice
    else {
      const url = `/${cleanPath}`;
      console.log(`[createUrl] DEV path: "${path}" → "${url}"`);
      return url;
    }
  } catch (error) {
    console.error(`[createUrl] Errore nel creare l'URL per "${path}":`, error);
    // In caso di errore, ritorna un percorso valido
    return path.startsWith('/') ? path : `/${path}`;
  }
}

/**
 * Hook personalizzato che sostituisce useLocation di wouter
 * per gestire correttamente il path base nelle navigazioni
 */
export function useBaseLocation() {
  const basePath = getBasePath();
  console.log(`[useBaseLocation] basePath: "${basePath}"`);
  return basePath;
}

/**
 * Controlla se siamo in ambiente di produzione
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}