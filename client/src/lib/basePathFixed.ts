// VERSIONE STABILE E SICURA PER ROUTING IN SUBDIRECTORY
// Gestisce correttamente il routing in produzione e sviluppo
import { useState, useEffect } from 'react';

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
    // Sicurezza: se path è undefined, usiamo stringa vuota
    const safePath = path || '';
    const basePath = getBasePath();
    
    // CASO 1: HOME PAGE
    if (safePath === '' || safePath === '/') {
      // Per la home page, sempre ritorna il basePath con slash
      const home = basePath ? `${basePath}/` : '/';
      console.log(`[createUrl] HOME path: "${safePath}" → "${home}"`);
      return home;
    }
    
    // CASO 2: TUTTI GLI ALTRI PERCORSI
    
    // 1. Elimina slash duplicati e normalizza il percorso 
    // Rimuovi slash iniziali e finali per poi riaggiungerli in modo consistente
    let cleanPath = safePath.replace(/^\/+|\/+$/g, '');
    
    // 2. Rimuovi eventuali duplicazioni del basePath se già presenti nel path
    if (basePath && basePath !== '/' && cleanPath.startsWith(basePath.replace(/^\//, ''))) {
      // Se il percorso ripete il basePath, lo rimuoviamo
      cleanPath = cleanPath.replace(new RegExp(`^${basePath.replace(/^\//, '')}`), '');
      // Rimuovi anche eventuali slash iniziali rimasti
      cleanPath = cleanPath.replace(/^\/+/, '');
      console.log(`[createUrl] FIXED duplicated basePath in "${safePath}"`);
    }
    
    // 3. Costruisci l'URL finale in base all'ambiente
    let finalUrl: string;
    
    // In produzione, aggiungi sempre il basePath
    if (basePath && import.meta.env.PROD) {
      // Garantisci uno slash tra basePath e path
      const cleanBasePath = basePath.replace(/^\/|\/$/g, '');
      finalUrl = cleanPath ? `/${cleanBasePath}/${cleanPath}` : `/${cleanBasePath}/`;
      console.log(`[createUrl] PROD path: "${safePath}" → "${finalUrl}"`);
    } 
    // In sviluppo, usa solo il percorso semplice
    else {
      finalUrl = `/${cleanPath}`;
      console.log(`[createUrl] DEV path: "${safePath}" → "${finalUrl}"`);
    }
    
    // 4. Elimina slash duplicati nel risultato finale
    finalUrl = finalUrl.replace(/\/+/g, '/');
    return finalUrl;
    
  } catch (error) {
    console.error(`[createUrl] Errore nel creare l'URL per "${path}":`, error);
    // In caso di errore, ritorna un percorso valido con slash iniziale
    return path?.startsWith('/') ? path : `/${path || ''}`;
  }
}

/**
 * Hook personalizzato che sostituisce useLocation di wouter
 * per gestire correttamente il path base nelle navigazioni
 * 
 * Questo metodo estrae l'URL relativo dalla locazione corrente,
 * rimuovendo il basePath se presente.
 */
export function useBaseLocation(): [string, (to: string) => void] {
  const [location, setLocation] = useState<string>("");
  const [navigate, setNavigate] = useState<(to: string) => void>(() => (path: string) => {
    console.warn("[useBaseLocation] Navigate function not yet initialized");
  });
  
  const basePath = getBasePath();
  
  // Inizializza e aggiorna la location corrente
  useEffect(() => {
    // Funzione che estrae il percorso relativo dalla URL corrente
    const getCurrentLocation = (): string => {
      const { pathname } = window.location;
      
      // Se siamo in produzione e abbiamo un basePath, rimuovilo dal pathname
      if (isProduction() && basePath && pathname.startsWith(basePath)) {
        const relativePath = pathname.slice(basePath.length) || "/";
        console.log(`[useBaseLocation] Extracted path: "${relativePath}" from "${pathname}"`);
        return relativePath;
      }
      
      // Altrimenti ritorna il pathname semplice
      return pathname;
    };
    
    // Imposta la location corrente
    setLocation(getCurrentLocation());
    
    // Crea funzione di navigazione
    setNavigate(() => (to: string) => {
      const fullPath = createUrl(to);
      console.log(`[useBaseLocation] Navigating to: "${fullPath}" (from "${to}")`);
      window.history.pushState(null, '', fullPath);
      setLocation(to);
    });
    
    // Listener per aggiornare la location quando cambia l'URL
    const handlePopState = () => {
      setLocation(getCurrentLocation());
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [basePath]);
  
  return [location, navigate];
}

/**
 * Controlla se siamo in ambiente di produzione
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}