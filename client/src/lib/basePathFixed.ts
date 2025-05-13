// VERSIONE FINALE SPA in SUBDIRECTORY
// Gestisce correttamente il caso di una SPA montata in una sottocartella

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
 * Crea un URL con il path base corretto, verificando se siamo già in una sottodirectory
 * @param path Il percorso relativo (può iniziare con o senza /)
 * @returns L'URL completo con il path base, gestendo correttamente i già presenti in sottodirectory
 */
export function createUrl(path: string): string {
  try {
    const basePath = getBasePath();
    
    // CONTROLLO CRITICO: Se l'URL attuale del browser contiene già il basePath
    // non dobbiamo aggiungerlo nuovamente
    const alreadyInSubdirectory = basePath && 
                                window.location.pathname.startsWith(basePath) && 
                                import.meta.env.PROD;
    
    // Se siamo già nella sottodirectory, non aggiungiamo il basePath
    if (alreadyInSubdirectory) {
      // Caso speciale: pagina home
      if (path === '' || path === '/') {
        return '/';
      }
      
      // Normalizza il path con slash iniziale
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      console.log(`[createUrl] In subdirectory - path: "${path}" → "${normalizedPath}"`);
      return normalizedPath;
    }
    
    // CASO NORMALE: non siamo già nella subdirectory
    
    // Caso speciale: pagina home
    if (path === '' || path === '/') {
      const home = basePath ? `${basePath}/` : '/';
      console.log(`[createUrl] HOME path: "${path}" → "${home}"`);
      return home;
    }
    
    // Rimuovi gli slash iniziali e finali
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