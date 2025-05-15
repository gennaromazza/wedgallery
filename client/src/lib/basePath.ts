
// Utility per gestire il percorso base dell'applicazione
// Supporta sia installazione root che in sottocartella
import { PRODUCTION_BASE_PATH } from '../config';

/**
 * Restituisce il percorso base dell'applicazione
 * In sviluppo: sempre '/'
 * In produzione: utilizza il percorso configurato in config.ts
 */
export const getBasePath = (): string => {
  // In ambiente di sviluppo, usa sempre la root
  if (!import.meta.env.PROD) {
    return '/';
  }
  
  // In produzione, usa il percorso configurato
  return PRODUCTION_BASE_PATH;
};

/**
 * Crea un URL per i link interni all'applicazione
 * @param path Percorso relativo (con o senza slash iniziale)
 * @returns URL normalizzato
 */
export const createUrl = (path: string): string => {
  const basePath = getBasePath();
  
  // Gestione percorsi speciali
  if (path === '' || path === '/') {
    return basePath;
  }
  
  // Normalizza il percorso aggiungendo slash iniziale se mancante
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Se siamo in ambiente di produzione con basePath diverso da /
  if (basePath !== '/') {
    // Rimuove lo slash iniziale per unire i percorsi correttamente
    const pathWithoutLeadingSlash = normalizedPath.startsWith('/') 
      ? normalizedPath.substring(1) 
      : normalizedPath;
    
    // Garantisce che basePath termini con uno slash
    const basePathWithTrailingSlash = basePath.endsWith('/') 
      ? basePath 
      : `${basePath}/`;
    
    return `${basePathWithTrailingSlash}${pathWithoutLeadingSlash}`;
  }
  
  return normalizedPath;
};

/**
 * Crea URL assoluto con origine
 * @param path Percorso relativo
 * @returns URL assoluto completo di origine e percorso base
 */
export const createAbsoluteUrl = (path: string): string => {
  // Utilizziamo createUrl che ora gestisce correttamente il percorso base
  const fullPath = createUrl(path);
  
  console.log("Creazione URL assoluto:", {
    origin: window.location.origin,
    path,
    basePath: getBasePath(),
    fullPath,
    result: `${window.location.origin}${fullPath}`
  });
  
  return `${window.location.origin}${fullPath}`;
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
 * @returns true se l'app è in una sottodirectory, false se è alla radice
 */
export const isInSubdirectory = (): boolean => {
  return getBasePath() !== '/';
};
