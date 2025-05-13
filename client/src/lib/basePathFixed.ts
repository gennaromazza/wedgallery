// Questa è una versione completamente rivista della gestione del path base
// Utilizzalo per tutte le navigazioni e i link nell'applicazione

/**
 * Ottiene il path base dell'applicazione in base all'ambiente
 * In produzione: '/wedgallery/'
 * In sviluppo: '/'
 */
export function getBasePath(): string {
  // In produzione usa /wedgallery/
  if (import.meta.env.PROD) {
    return '/wedgallery/';
  }
  
  // In sviluppo usa /
  return '/';
}

/**
 * Crea un URL con il path base corretto
 * @param path Il percorso relativo (può iniziare con o senza /)
 * @returns L'URL completo con il path base
 */
export function createUrl(path: string): string {
  const basePath = getBasePath();
  
  // Caso speciale: pagina home
  if (path === '' || path === '/') {
    return basePath;
  }

  // Rimuove eventuali / iniziali dal path
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Crea l'URL finale
  const url = `${basePath}${cleanPath}`;
  
  // Log per debug
  console.log(`[createUrl] path: "${path}" → "${url}"`);
  
  return url;
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