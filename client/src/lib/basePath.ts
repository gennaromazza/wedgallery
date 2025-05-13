
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
  
  // Concatena il percorso base con il percorso relativo
  return `${basePath}${normalizedPath}`;
};
