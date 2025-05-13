// VERSIONE DEFINITIVA: compatibile con produzione e sviluppo
// Utilizzala per tutte le navigazioni e i link nell'applicazione

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

/**
 * Crea un URL con il path base corretto, evitando slash duplicati
 * @param path Il percorso relativo (può iniziare con o senza /)
 * @returns L'URL completo con il path base
 */
export function createUrl(path: string): string {
  try {
    const basePath = getBasePath();
    
    // Caso speciale: per la pagina home
    if (path === '' || path === '/') {
      // Per home, usa solo basePath o / se non c'è basePath
      const home = basePath ? `${basePath}/` : '/';
      console.log(`[createUrl] HOME path: "${path}" → "${home}"`);
      return home;
    }
    
    // Rimuovi gli slash iniziali e finali sia dal basePath che dal path
    const cleanBasePath = basePath.replace(/^\/|\/$/g, '');
    const cleanPath = path.replace(/^\/|\/$/g, '');
    
    // Costruisci l'URL con gli slash corretti
    let url = '';
    
    if (cleanBasePath) {
      url = `/${cleanBasePath}/${cleanPath}`;
    } else {
      url = `/${cleanPath}`;
    }
    
    console.log(`[createUrl] path: "${path}" → "${url}"`);
    return url;
  } catch (error) {
    console.error(`[createUrl] Errore nel creare l'URL per "${path}":`, error);
    // In caso di errore, ritorna il path originale
    return path;
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