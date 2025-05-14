import { Chapter, PhotoWithChapter } from '@/components/ChaptersManager';

/**
 * Analizza i file dalla struttura delle cartelle e genera capitoli automaticamente
 * @param files Array di File da analizzare
 * @returns Un array di capitoli e un array di foto con capitoli assegnati
 */
export function extractChaptersFromFolders(
  files: File[]
): { chapters: Chapter[]; photosWithChapters: PhotoWithChapter[] } {
  // Mappa per tracciare le cartelle uniche
  const foldersMap: Map<string, { files: File[]; position: number }> = new Map();
  // Array dei file che non hanno una cartella specifica
  const rootFiles: File[] = [];
  
  // Primo passaggio: identifica le cartelle e assegna i file
  files.forEach(file => {
    // Ottieni il percorso relativo
    const path = file.webkitRelativePath || '';
    
    if (path && path.includes('/')) {
      // Se il file ha un percorso relativo con cartelle
      const folderPath = path.split('/')[0]; // Prendiamo solo il primo livello di cartelle
      
      if (folderPath) {
        if (!foldersMap.has(folderPath)) {
          // Aggiunge una nuova cartella con la posizione corrente
          foldersMap.set(folderPath, {
            files: [file],
            position: foldersMap.size
          });
        } else {
          // Aggiunge il file alla cartella esistente
          foldersMap.get(folderPath)!.files.push(file);
        }
        return;
      }
    }
    
    // Se il file non ha un percorso relativo o è alla radice
    rootFiles.push(file);
  });
  
  // Secondo passaggio: crea i capitoli dalle cartelle
  const chapters: Chapter[] = [];
  let chapterPosition = 0;
  
  // Imposta un elenco di cartelle conosciute con nomi più descrittivi
  const folderNameMapping: { [key: string]: string } = {
    'Sposo': 'Preparazione Sposo',
    'Sposa': 'Preparazione Sposa',
    'Preparativi_Sposo': 'Preparazione Sposo',
    'Preparativi_Sposa': 'Preparazione Sposa',
    'Cerimonia': 'Cerimonia',
    'Chiesa': 'Cerimonia in Chiesa',
    'Comune': 'Cerimonia Civile',
    'Ricevimento': 'Ricevimento',
    'Festa': 'Festa e Ricevimento',
    'Villa': 'Ricevimento in Villa',
    'Dettagli': 'Dettagli e Particolari',
    'Torta': 'Taglio della Torta',
    'Ballo': 'Primo Ballo',
    'Esterni': 'Foto Esterni',
    'Parco': 'Foto nel Parco',
    'Giardino': 'Foto nel Giardino',
    'Famiglia': 'Foto con la Famiglia',
    'Invitati': 'Foto con gli Invitati',
    'Amici': 'Foto con gli Amici',
    'Gruppo': 'Foto di Gruppo',
    'Fine': 'Fine Evento'
  };
  
  // Crea i capitoli dalle cartelle
  foldersMap.forEach((data, folderName) => {
    // Genera un ID univoco per il capitolo
    const chapterId = `chapter-${Date.now()}-${chapterPosition}`;
    
    // Determina un titolo descrittivo per il capitolo
    const titleMapping = folderNameMapping[folderName] || folderNameMapping[folderName.replace(/_/g, ' ')] || null;
    const chapterTitle = titleMapping || folderName.replace(/_/g, ' ');
    
    chapters.push({
      id: chapterId,
      title: chapterTitle,
      description: `Foto dalla cartella "${folderName}"`,
      position: chapterPosition++
    });
  });
  
  // Se ci sono file alla radice, crea un capitolo per loro
  if (rootFiles.length > 0) {
    chapters.push({
      id: `chapter-${Date.now()}-root`,
      title: 'Altre Foto',
      description: 'Foto senza categoria specifica',
      position: chapterPosition
    });
  }
  
  // Terzo passaggio: assegna le foto ai capitoli
  const photosWithChapters: PhotoWithChapter[] = [];
  let globalPhotoPosition = 0;
  
  // Aggiungi le foto dalle cartelle
  foldersMap.forEach((data, folderName) => {
    // Trova il capitolo corrispondente
    const chapter = chapters.find(c => 
      c.title === (folderNameMapping[folderName] || folderName.replace(/_/g, ' '))
    );
    
    if (chapter) {
      // Aggiungi le foto al capitolo
      data.files.forEach(file => {
        photosWithChapters.push({
          id: `photo-${Date.now()}-${globalPhotoPosition}`,
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          chapterId: chapter.id,
          position: globalPhotoPosition++
        });
      });
    }
  });
  
  // Aggiungi le foto senza cartella
  if (rootFiles.length > 0) {
    const rootChapter = chapters.find(c => c.title === 'Altre Foto');
    
    if (rootChapter) {
      rootFiles.forEach(file => {
        photosWithChapters.push({
          id: `photo-${Date.now()}-${globalPhotoPosition}`,
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          chapterId: rootChapter.id,
          position: globalPhotoPosition++
        });
      });
    }
  }
  
  return { chapters, photosWithChapters };
}

/**
 * Combina capitoli esistenti con nuovi capitoli estratti dalle cartelle
 * @param existingChapters Capitoli già esistenti
 * @param newChapters Nuovi capitoli da aggiungere
 * @returns Un array di capitoli combinati senza duplicati
 */
export function combineChapters(
  existingChapters: Chapter[],
  newChapters: Chapter[]
): Chapter[] {
  const combined = [...existingChapters];
  const existingTitles = new Set(existingChapters.map(c => c.title));
  
  // Aggiungi solo i nuovi capitoli che non esistono già
  newChapters.forEach(chapter => {
    if (!existingTitles.has(chapter.title)) {
      combined.push({
        ...chapter,
        position: combined.length // Aggiorna la posizione
      });
    }
  });
  
  return combined;
}

/**
 * Aggiorna le foto per assegnarle ai capitoli esistenti o mantenere l'assegnazione corrente
 * @param existingPhotos Foto già esistenti con assegnazione ai capitoli
 * @param newPhotos Nuove foto con assegnazione ai capitoli
 * @param allChapters Tutti i capitoli disponibili
 * @returns Un array di foto combinato con le assegnazioni ai capitoli corrette
 */
export function combinePhotos(
  existingPhotos: PhotoWithChapter[],
  newPhotos: PhotoWithChapter[],
  allChapters: Chapter[]
): PhotoWithChapter[] {
  const combined = [...existingPhotos];
  
  // Mappa tra titoli dei capitoli e ID
  const chapterTitleToId = new Map<string, string>();
  allChapters.forEach(chapter => {
    chapterTitleToId.set(chapter.title, chapter.id);
  });
  
  // Aggiungi le nuove foto
  newPhotos.forEach(photo => {
    // Trova se la foto esiste già (basandosi sul nome)
    const existingPhoto = existingPhotos.find(p => p.name === photo.name);
    
    if (!existingPhoto) {
      // Se la foto è nuova, aggiungila
      combined.push({
        ...photo,
        position: combined.length // Aggiorna la posizione
      });
    }
  });
  
  return combined;
}