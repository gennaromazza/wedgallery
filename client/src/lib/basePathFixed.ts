// Versione corretta per evitare doppi slash e problemi di routing
// Utilizzala per tutte le navigazioni e i link nell'applicazione

/**
 * Ottiene il path base dell'applicazione in base all'ambiente
 * In produzione: '/wedgallery'  (senza slash finale)
 * In sviluppo: ''  (stringa vuota)
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
  const basePath = getBasePath();
  
  // Normalizza il percorso di input
  let normalizedPath = path;
  if (!normalizedPath.startsWith('/') && normalizedPath !== '') {
    normalizedPath = '/' + normalizedPath;
  }
  
  // Caso speciale: pagina home
  if (normalizedPath === '' || normalizedPath === '/') {
    return basePath || '/';
  }
  
  // Crea l'URL finale
  const url = `${basePath}${normalizedPath}`;
  
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

/**
 * Controlla se siamo in ambiente di produzione
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}