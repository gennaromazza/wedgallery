/**
 * Soluzione semplificata per il routing in sottodirectory
 */

/**
 * Ottiene il path base dell'applicazione
 * In produzione: '/wedgallery'
 * In sviluppo: ''
 */
export function getBasePath(): string {
  if (import.meta.env.PROD) {
    return '/wedgallery';
  }
  return '';
}

/**
 * Crea URL con prefisso corretto
 */
export function createUrl(path: string): string {
  const base = getBasePath();
  
  // Per la home page
  if (!path || path === '/') {
    return base ? `${base}/` : '/';
  }
  
  // Rimuovi eventuali slash iniziali dal path
  const cleanPath = path.replace(/^\/+/, '');
  
  // In produzione, aggiungi il prefisso /wedgallery
  if (base && import.meta.env.PROD) {
    return `${base}/${cleanPath}`;
  }
  
  // In sviluppo, usa percorso normale
  return `/${cleanPath}`;
}

/**
 * Crea URL assoluto con origine
 */
export function createAbsoluteUrl(path: string): string {
  return `${window.location.origin}${createUrl(path)}`;
}

/**
 * Verifica se siamo in produzione
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}

/**
 * Verifica se siamo già in sottodirectory
 */
export function isInSubdirectory(): boolean {
  const base = getBasePath();
  return base !== '' && 
         window.location.pathname.startsWith(base) && 
         import.meta.env.PROD === true;
}