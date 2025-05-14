/**
 * Versione semplificata per la lettura dei file dalle cartelle
 * con assegnazione diretta ai capitoli
 */

import { Chapter, PhotoWithChapter } from '@/components/ChaptersManager';

/**
 * Utilizza metodo semplificato per leggere file dalle DataTransferItems
 * e assegnarli alle cartelle corrette
 */
export async function processFilesFromFolders(
  items: DataTransferItem[],
  progressCallback?: (progress: number, status: string, filesFound?: number, filesProcessed?: number) => void
): Promise<{
  files: File[];
  chapters: Chapter[];
  photosWithChapters: PhotoWithChapter[];
}> {
  // Callback di progresso
  const updateProgress = (progress: number, status: string, filesFound?: number, filesProcessed?: number) => {
    if (progressCallback) {
      progressCallback(progress, status, filesFound, filesProcessed);
    }
  };
  
  updateProgress(5, 'Analisi delle cartelle...', 0, 0);
  
  // Per prima cosa, analizziamo le cartelle e creiamo una mappa
  const folderEntries: { entry: any, name: string }[] = [];
  const fileEntries: { entry: any, folderName: string | null }[] = [];
  
  // Identifica tutte le entry di cartelle e file
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
      if (entry) {
        if (entry.isDirectory) {
          folderEntries.push({ entry, name: entry.name });
          console.log(`Identificata cartella: ${entry.name}`);
        } else if (entry.isFile) {
          // I file nella radice non hanno una cartella
          fileEntries.push({ entry, folderName: null });
        }
      }
    }
  }
  
  updateProgress(10, `Trovate ${folderEntries.length} cartelle`, 0, 0);
  
  // Crea i capitoli in base alle cartelle trovate
  const chapters: Chapter[] = folderEntries.map((folder, idx) => ({
    id: `chapter-${Date.now()}-${idx}`,
    title: folder.name,
    description: `Foto dalla cartella "${folder.name}"`,
    position: idx
  }));
  
  // Aggiungi un capitolo "Altre foto" se abbiamo file nella radice
  const defaultChapter: Chapter = {
    id: `chapter-${Date.now()}-default`,
    title: "Altre foto",
    description: "Foto senza cartella specifica",
    position: chapters.length
  };
  
  updateProgress(20, `Creati ${chapters.length} capitoli, lettura file...`, 0, 0);
  
  // Ora leggiamo i file da ogni cartella
  // Funzione per leggere tutti i file da una cartella
  const readFilesFromDirectory = async (directoryEntry: any, folderName: string) => {
    const files: File[] = [];
    let filesToProcess = 0;
    let filesProcessed = 0;
    
    // Funzione ricorsiva per leggere una cartella e le sue sottocartelle
    const readDirectory = async (entry: any): Promise<void> => {
      return new Promise((resolve) => {
        const reader = entry.createReader();
        
        // Legge i batch di entries
        const readNextBatch = () => {
          reader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) {
              // Cartella completamente letta
              resolve();
              return;
            }
            
            // Processiamo tutte le entry in questo batch
            const promises = entries.map(async (entry) => {
              if (entry.isDirectory) {
                // Processa ricorsivamente le sottocartelle
                await readDirectory(entry);
              } else if (entry.isFile) {
                // Aggiungiamo al conteggio totale
                filesToProcess++;
                
                // Leggi il file
                return new Promise<void>((resolveFile) => {
                  entry.file((file: File) => {
                    files.push(file);
                    filesProcessed++;
                    
                    // Aggiorna il progresso
                    if (progressCallback && filesProcessed % 10 === 0) {
                      updateProgress(
                        20 + Math.min(30, (filesProcessed / Math.max(filesToProcess, 1)) * 30),
                        `Lettura file dalla cartella "${folderName}" (${filesProcessed}/${filesToProcess})...`,
                        filesToProcess,
                        filesProcessed
                      );
                    }
                    
                    resolveFile();
                  }, () => {
                    filesProcessed++;
                    resolveFile();
                  });
                });
              }
            });
            
            // Attendi che tutte le entry di questo batch siano processate
            await Promise.all(promises);
            
            // Continua con il prossimo batch
            readNextBatch();
          });
        };
        
        // Inizia a leggere
        readNextBatch();
      });
    };
    
    // Inizia la lettura ricorsiva
    await readDirectory(directoryEntry);
    return files;
  };
  
  // Leggi tutti i file dalle cartelle
  const folderFiles: Map<string, File[]> = new Map();
  let allFiles: File[] = [];
  let totalProcessed = 0;
  
  // Per ogni cartella, leggi tutti i file
  for (let i = 0; i < folderEntries.length; i++) {
    const { entry, name } = folderEntries[i];
    updateProgress(20, `Lettura file dalla cartella "${name}"...`, 0, totalProcessed);
    
    try {
      const files = await readFilesFromDirectory(entry, name);
      console.log(`Letti ${files.length} file dalla cartella "${name}"`);
      
      // Salva i file per questa cartella
      folderFiles.set(name, files);
      allFiles = allFiles.concat(files);
      totalProcessed += files.length;
      
      updateProgress(
        50,
        `Completata lettura di ${totalProcessed} file da ${i + 1}/${folderEntries.length} cartelle...`,
        totalProcessed,
        totalProcessed
      );
    } catch (error) {
      console.error(`Errore nella lettura dei file dalla cartella "${name}":`, error);
    }
  }
  
  // Leggi i file nella radice
  updateProgress(60, 'Elaborazione file nella radice...', totalProcessed, totalProcessed);
  const rootFiles: File[] = [];
  
  for (const { entry, folderName } of fileEntries) {
    if (!folderName) {
      // È un file nella radice
      try {
        await new Promise<void>((resolve) => {
          entry.file((file: File) => {
            rootFiles.push(file);
            allFiles.push(file);
            totalProcessed++;
            resolve();
          }, () => {
            resolve();
          });
        });
      } catch (error) {
        console.error('Errore nella lettura di un file nella radice:', error);
      }
    }
  }
  
  // Crea PhotoWithChapter per tutti i file
  const photosWithChapters: PhotoWithChapter[] = [];
  let position = 0;
  
  updateProgress(70, 'Assegnazione file ai capitoli...', totalProcessed, 0);
  let assignedCount = 0;
  
  // Prima assegna i file delle cartelle ai rispettivi capitoli
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const files = folderFiles.get(chapter.title) || [];
    
    for (let j = 0; j < files.length; j++) {
      const file = files[j];
      photosWithChapters.push({
        id: `photo-${Date.now()}-${position}`,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        chapterId: chapter.id,
        position: position++
      });
      
      assignedCount++;
      if (assignedCount % 20 === 0) {
        updateProgress(
          70 + Math.min(20, (assignedCount / Math.max(totalProcessed, 1)) * 20),
          `Assegnazione file ai capitoli (${assignedCount}/${totalProcessed})...`,
          totalProcessed,
          assignedCount
        );
      }
    }
  }
  
  // Se ci sono file nella radice, aggiungili al capitolo predefinito
  if (rootFiles.length > 0) {
    // Aggiungi il capitolo predefinito
    chapters.push(defaultChapter);
    
    // Assegna i file della radice al capitolo predefinito
    for (let i = 0; i < rootFiles.length; i++) {
      const file = rootFiles[i];
      photosWithChapters.push({
        id: `photo-${Date.now()}-${position}`,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        chapterId: defaultChapter.id,
        position: position++
      });
      
      assignedCount++;
    }
  }
  
  updateProgress(95, 'Completamento elaborazione...', totalProcessed, totalProcessed);
  
  // Statistiche
  const chapterStats = new Map<string, number>();
  chapters.forEach(chapter => {
    const count = photosWithChapters.filter(p => p.chapterId === chapter.id).length;
    chapterStats.set(chapter.id, count);
    console.log(`Capitolo "${chapter.title}": ${count} foto`);
  });
  
  updateProgress(100, 'Elaborazione completata!', totalProcessed, totalProcessed);
  
  return {
    files: allFiles,
    chapters,
    photosWithChapters
  };
}