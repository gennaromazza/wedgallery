// Utility per gestire il percorso base dell'applicazione
// Utile quando l'app è ospitata in una sottocartella

export const getBasePath = (): string => {
  if (import.meta.env.VITE_PUBLIC_PATH) {
    return import.meta.env.VITE_PUBLIC_PATH;
  }
  return '/';
};

// Funzione per creare URL con il percorso base
export const createUrl = (path: string): string => {
  const basePath = getBasePath();
  // Se il path inizia con / e il basePath termina con /, evita la doppia barra
  if (path.startsWith('/') && basePath.endsWith('/')) {
    path = path.substring(1);
  }
  return `${basePath}${path}`;
};