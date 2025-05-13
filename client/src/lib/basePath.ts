// Utility per gestire il percorso base dell'applicazione
// Utile quando l'app è ospitata in una sottocartella

export const getBasePath = (): string => {
  if (import.meta.env.VITE_PUBLIC_PATH) {
    // Assicuriamo che il percorso termini con uno slash ma non ne abbia all'inizio
    let path = import.meta.env.VITE_PUBLIC_PATH;
    if (!path.endsWith('/')) {
      path += '/';
    }
    // Rimuovi eventuali slash iniziali per coerenza
    while (path.startsWith('/')) {
      path = path.substring(1);
    }
    // Aggiungi uno slash all'inizio
    return '/' + path;
  }
  return '/';
};

// Funzione per creare URL con il percorso base
export const createUrl = (path: string): string => {
  const basePath = getBasePath();
  
  // Rimuovi slash iniziale dal path se presente
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  
  // Assicurati che il basePath termini con uno slash
  const normalizedBasePath = basePath.endsWith('/') 
    ? basePath 
    : basePath + '/';
  
  // Log per debug
  console.log(`createUrl: basePath = "${normalizedBasePath}", path = "${path}", result = "${normalizedBasePath}${path}"`);
  
  return `${normalizedBasePath}${path}`;
};