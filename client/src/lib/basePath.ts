
// Utility per gestire il percorso base dell'applicazione
// Configurato per un'installazione a livello root

/**
 * Restituisce il percorso base dell'applicazione
 * Sempre '/' poiché l'app è installata a livello root
 */
export const getBasePath = (): string => {
  // Sempre a livello root
  return '/';
};

/**
 * Crea un URL per i link interni all'applicazione
 * @param path Percorso relativo (con o senza slash iniziale)
 * @returns URL normalizzato
 */
export const createUrl = (path: string): string => {
  // Gestione percorsi speciali
  if (path === '' || path === '/') {
    return '/';
  }
  
  // Normalizza il percorso aggiungendo slash iniziale se mancante
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Crea URL assoluto con origine
 * @param path Percorso relativo
 * @returns URL assoluto completo di origine
 */
export const createAbsoluteUrl = (path: string): string => {
  return `${window.location.origin}${createUrl(path)}`;
};

/**
 * Verifica se l'applicazione è in esecuzione in ambiente di produzione
 * @returns true se in produzione, false se in sviluppo
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD === true;
};

/**
 * Verifica se siamo in sottodirectory
 * @returns sempre false poiché l'app è configurata per eseguire alla radice
 */
export const isInSubdirectory = (): boolean => {
  return false;
};
