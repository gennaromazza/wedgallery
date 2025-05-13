
// Utility per gestire il percorso base dell'applicazione
// Utile quando l'app è ospitata in una sottocartella

/**
 * Restituisce il percorso base dell'applicazione
 * In ambiente di produzione sarà '/wedgallery/', in sviluppo sarà '/'
 */
export const getBasePath = (): string => {
  // Per produzione (hosting in sottocartella)
  if (import.meta.env.PROD) {
    return '/wedgallery/';
  }
  
  // Per sviluppo locale (usare la root)
  return '/';
};

/**
 * Crea un URL includendo il percorso base dell'applicazione
 * Per uso nei link e nella navigazione
 * @param path Percorso relativo (con o senza slash iniziale)
 * @returns URL completo per l'ambiente corrente
 */
export const createUrl = (path: string): string => {
  const basePath = getBasePath();
  
  // Gestione percorsi speciali
  if (path === '' || path === '/') {
    return basePath;
  }
  
  // Rimuovi slash iniziale dal path se presente
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Controllo esplicito per evitare duplicazioni
  // Verifica se il path non contenga già il basePath (ad es. /wedgallery/admin quando basePath è /wedgallery/)
  if (normalizedPath.startsWith(basePath.substring(1))) {
    console.warn(`Rilevato tentativo di duplicazione del basePath in "${path}". Correzione automatica applicata.`);
    return `/${normalizedPath}`;
  }
  
  // Concatena il percorso base con il percorso relativo
  return `${basePath}${normalizedPath}`;
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
 * Verifica se siamo già in sottodirectory
 * @returns true se il pathname contiene già il percorso base e siamo in produzione
 */
export const isInSubdirectory = (): boolean => {
  const base = getBasePath();
  return base !== '/' && 
         window.location.pathname.startsWith(base) && 
         isProduction();
};
