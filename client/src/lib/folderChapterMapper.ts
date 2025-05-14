import { Chapter, PhotoWithChapter } from '@/components/ChaptersManager';

/**
 * Analizza i file dalla struttura delle cartelle e genera capitoli automaticamente
 * @param files Array di File da analizzare
 * @returns Un array di capitoli e un array di foto con capitoli assegnati
 */
export function extractChaptersFromFolders(
  files: File[]
): { chapters: Chapter[]; photosWithChapters: PhotoWithChapter[] } {
  console.log(`Analisi di ${files.length} file per estrazione capitoli...`);
  
  // Mappa per tracciare le cartelle uniche
  const foldersMap: Map<string, { files: File[]; position: number }> = new Map();
  // Array dei file che non hanno una cartella specifica
  const rootFiles: File[] = [];
  
  // Tenta di identificare la struttura delle cartelle dal nome del file
  // Possibili modi in cui le cartelle possono apparire:
  // 1. webkitRelativePath: "folder/file.jpg"
  // 2. Nome file include un percorso: "folder/file.jpg"
  // 3. Nome file include un prefisso di capitolo: "01_Sposo_file.jpg"
  
  // Per debug: controlla cosa riceviamo nei file
  let foundAtLeastOneFolder = false;
  
  files.forEach((file, index) => {
    if (index < 3) {
      console.log(`Esempio file ${index}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        webkitRelativePath: (file as any).webkitRelativePath || 'N/A'
      });
    }
    
    // Ottieni il percorso relativo
    const path = (file as any).webkitRelativePath || '';
    
    if (path && path.includes('/')) {
      // Se il file ha un percorso relativo con cartelle (metodo 1)
      foundAtLeastOneFolder = true;
      const folderPath = path.split('/')[0]; // Prendiamo solo il primo livello di cartelle
      
      if (folderPath) {
        if (!foldersMap.has(folderPath)) {
          // Aggiunge una nuova cartella con la posizione corrente
          foldersMap.set(folderPath, {
            files: [file],
            position: foldersMap.size
          });
          console.log(`Aggiunta nuova cartella: ${folderPath}`);
        } else {
          // Aggiunge il file alla cartella esistente
          foldersMap.get(folderPath)!.files.push(file);
        }
        return;
      }
    } else if (file.name.includes('/')) {
      // Se il nome del file include un separatore di percorso (metodo 2)
      foundAtLeastOneFolder = true;
      const folderPath = file.name.split('/')[0];
      
      if (folderPath) {
        if (!foldersMap.has(folderPath)) {
          foldersMap.set(folderPath, {
            files: [file],
            position: foldersMap.size
          });
          console.log(`Cartella da nome file con /: ${folderPath}`);
        } else {
          foldersMap.get(folderPath)!.files.push(file);
        }
        return;
      }
    } else {
      // Prova a riconoscere capitoli dal nome del file con pattern comune (metodo 3)
      // Es. "01_Sposo_file.jpg" -> capitolo "Sposo"
      const match = file.name.match(/^(\d+)_([^_]+)_.*$/);
      if (match) {
        foundAtLeastOneFolder = true;
        const folderPath = match[2]; // Il nome del capitolo
        
        if (!foldersMap.has(folderPath)) {
          foldersMap.set(folderPath, {
            files: [file],
            position: parseInt(match[1], 10) || foldersMap.size
          });
          console.log(`Cartella da pattern numerato: ${folderPath}`);
        } else {
          foldersMap.get(folderPath)!.files.push(file);
        }
        return;
      }
    }
    
    // Se il file non ha un percorso relativo o è alla radice
    rootFiles.push(file);
  });
  
  console.log(`Analisi completata. Cartelle trovate: ${foldersMap.size}, file alla radice: ${rootFiles.length}`);
  console.log(`Rilevamento cartelle dalla struttura: ${foundAtLeastOneFolder ? 'Sì' : 'No'}`);
  
  // Se non abbiamo trovato cartelle ma abbiamo molti file, proviamo a creare capitoli automatici
  // basati su gruppi di foto (ad es. dividere in gruppi di 20-30 per capitolo)
  if (foldersMap.size === 0 && files.length > 30) {
    console.log("Creazione capitoli automatici basati su gruppi di file...");
    const PHOTOS_PER_CHAPTER = 25;
    const numChapters = Math.ceil(files.length / PHOTOS_PER_CHAPTER);
    
    for (let i = 0; i < numChapters; i++) {
      const startIdx = i * PHOTOS_PER_CHAPTER;
      const endIdx = Math.min(startIdx + PHOTOS_PER_CHAPTER, files.length);
      const chapterFiles = files.slice(startIdx, endIdx);
      
      foldersMap.set(`Gruppo ${i+1}`, {
        files: chapterFiles,
        position: i
      });
    }
    
    rootFiles.length = 0; // Svuotiamo i file della radice perché li abbiamo tutti assegnati
  }
  
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
  
  // Terzo passaggio: assegna le foto ai capitoli con posizionamento ottimizzato
  const photosWithChapters: PhotoWithChapter[] = [];
  
  // Crea un indice per tenere traccia della posizione iniziale di ogni capitolo
  const chapterPositions: Record<string, number> = {};
  let currentPosition = 0;
  
  // Prima assegniamo le posizioni iniziali per ogni capitolo
  chapters.forEach((chapter) => {
    chapterPositions[chapter.id] = currentPosition;
    
    // Trova le files per questo capitolo
    const folderName = Object.keys(folderNameMapping).find(
      key => folderNameMapping[key] === chapter.title
    ) || chapter.title.replace(/ /g, '_');
    
    const folderData = foldersMap.get(folderName);
    if (folderData) {
      currentPosition += folderData.files.length;
    } else if (chapter.title === 'Altre Foto') {
      currentPosition += rootFiles.length;
    }
  });
  
  // Ora assegniamo le foto ai capitoli, mantenendo l'ordine corretto
  chapters.forEach((chapter) => {
    // Trova il nome della cartella per questo capitolo
    const folderName = Object.keys(folderNameMapping).find(
      key => folderNameMapping[key] === chapter.title
    ) || chapter.title.replace(/ /g, '_');
    
    // Ottieni i file per questa cartella
    let filesToAdd: File[] = [];
    if (chapter.title === 'Altre Foto') {
      filesToAdd = rootFiles;
    } else {
      const folderData = foldersMap.get(folderName);
      if (folderData) {
        filesToAdd = folderData.files;
      }
    }
    
    // Aggiungi le foto al capitolo
    let chapterPosition = chapterPositions[chapter.id];
    filesToAdd.forEach((file, index) => {
      // Generiamo un ID univoco basato su timestamp e posizione
      const uniqueTimestamp = Date.now() + index;
      const uniqueId = `photo-${uniqueTimestamp}-${chapterPosition}`;
      
      // Crea metadati aggiuntivi per la foto
      const filePathParts = (file as any).webkitRelativePath?.split('/') || [];
      const filePathInfo = filePathParts.length > 1 
        ? { folderPath: filePathParts.slice(0, -1).join('/') } 
        : {};
      
      photosWithChapters.push({
        id: uniqueId,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        chapterId: chapter.id,
        position: chapterPosition++,
        ...(filePathInfo as any)
      });
    });
    
    // Aggiorna la posizione per il prossimo capitolo
    chapterPositions[chapter.id] = chapterPosition;
  });
  
  // Log per debug
  const totalAssignedPhotos = photosWithChapters.length;
  
  // Statistiche dettagliate
  console.log(`\n===== STATISTICHE ELABORAZIONE CARTELLE =====`);
  console.log(`File totali trovati: ${files.length}`);
  console.log(`Cartelle trovate: ${foldersMap.size}`);
  console.log(`Capitoli creati: ${chapters.length}`);
  console.log(`Foto totali elaborate: ${totalAssignedPhotos}`);
  
  if (chapters.length > 0) {
    console.log(`\nDistribuzione per capitolo:`);
    chapters.forEach(chapter => {
      const count = photosWithChapters.filter(p => p.chapterId === chapter.id).length;
      const percentage = Math.round((count / totalAssignedPhotos) * 100);
      console.log(`- Capitolo "${chapter.title}": ${count} foto (${percentage}%)`);
    });
  }
  
  // Verifica se ci sono foto non assegnate a nessun capitolo
  const unassignedInFinal = photosWithChapters.filter(p => !p.chapterId).length;
  if (unassignedInFinal > 0) {
    console.warn(`⚠️ Attenzione: ${unassignedInFinal} foto non hanno un capitolo assegnato!`);
  }
  
  console.log(`============================================\n`);
  
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