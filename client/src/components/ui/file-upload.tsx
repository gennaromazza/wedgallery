import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { compressImages } from '@/lib/imageCompression';
import ImageCompressionInfo from '@/components/ImageCompressionInfo';
import { extractChaptersFromFolders } from '@/lib/folderChapterMapper';
import { Chapter, PhotoWithChapter } from '@/components/ChaptersManager';
// Importa il nuovo lettore di cartelle semplificato
import { processFilesFromFolders } from '@/lib/simpleFolderReader';

// Esportiamo l'interfaccia PhotoWithChapter per compatibilità
export type { PhotoWithChapter } from '@/components/ChaptersManager';

interface FileUploadProps {
  onFilesSelected: (files: File[] | PhotoWithChapter[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
  className?: string;
  currentFiles?: File[];
  previews?: string[];
  onRemoveFile?: (index: number) => void;
  enableCompression?: boolean;
  compressionOptions?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
  };
  enableFolderUpload?: boolean;
  onChaptersExtracted?: (result: { 
    chapters: any[]; 
    photosWithChapters: any[];
  }) => void;
}

export default function FileUpload({
  onFilesSelected,
  multiple = false,
  maxFiles = 10,
  accept = 'image/*',
  className,
  currentFiles = [],
  previews = [],
  onRemoveFile,
  enableCompression = true,
  compressionOptions = { maxSizeMB: 1, maxWidthOrHeight: 1920 },
  enableFolderUpload = false,
  onChaptersExtracted
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [compressingFiles, setCompressingFiles] = useState<string[]>([]);
  const [compressionData, setCompressionData] = useState<{[filename: string]: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  }}>({});
  // Stati per il caricamento delle cartelle
  const [isProcessingFolders, setIsProcessingFolders] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [totalFilesFound, setTotalFilesFound] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Gestisce l'evento di drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  // Gestisce l'evento di drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Processa i file con gestione ottimizzata della memoria
  const processFiles = async (files: File[]) => {
    try {
      // Per evitare problemi di memoria con molti file, processiamo in batch
      const BATCH_SIZE = 20; // Numero di file da processare in ogni batch
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);
      
      console.log(`Processando ${files.length} file in ${totalBatches} batch di ${BATCH_SIZE}`);
      
      if (enableCompression) {
        // Array per memorizzare tutti i file compressi
        const allCompressedFiles: File[] = [];
        
        // Processa i file in batch
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
          const batchFiles = files.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          
          console.log(`Processando batch ${batchNumber}/${totalBatches} (${batchFiles.length} file)`);
          
          // Imposta lo stato di compressione per questo batch
          const batchFileNames = batchFiles.map(file => file.name);
          setCompressingFiles(prev => [...prev, ...batchFileNames]);
          
          // Comprimi i file di questo batch
          const batchCompressedFiles = await Promise.all(batchFiles.map(async (file) => {
            if (file.type.startsWith('image/')) {
              try {
                // Usa il metodo di compressione singolo
                const compressedFile = await import('@/lib/imageCompression').then(
                  module => module.compressImage(file, compressionOptions)
                );
                
                // Memorizza le informazioni sulla compressione
                setCompressionData(prev => ({
                  ...prev,
                  [file.name]: {
                    originalSize: file.size,
                    compressedSize: compressedFile.size,
                    compressionRatio: file.size / compressedFile.size
                  }
                }));
                
                return compressedFile;
              } catch (error) {
                console.error(`Errore durante la compressione di ${file.name}:`, error);
                return file;
              }
            } else {
              return file;
            }
          }));
          
          // Aggiungi i file compressi all'array complessivo
          allCompressedFiles.push(...batchCompressedFiles);
          
          // Rimuovi lo stato di compressione per questo batch
          setCompressingFiles(prev => prev.filter(name => !batchFileNames.includes(name)));
          
          // Piccola pausa tra i batch per aiutare il garbage collector
          if (batchNumber < totalBatches) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        console.log(`Compressione completata per ${allCompressedFiles.length} file`);
        onFilesSelected(allCompressedFiles);
      } else {
        // Se la compressione non è abilitata, passa i file originali
        onFilesSelected(files);
      }
    } catch (error) {
      console.error("Errore durante la compressione delle immagini:", error);
      // Rimuovi lo stato di compressione in caso di errore
      setCompressingFiles([]);
      // Fallback ai file originali in caso di errore
      onFilesSelected(files);
    }
  };

  // Gestisce l'evento di drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    try {
      console.log("Inizio gestione drop di file...");
      
      // Controlla se abbiamo file o elementi di directory
      if (!e.dataTransfer.items && (!e.dataTransfer.files || e.dataTransfer.files.length === 0)) {
        console.log("Nessun file o directory trovato nel drop.");
        return;
      }
      
      // Controlla se multiple è abilitato
      if (!multiple && e.dataTransfer.files.length > 1) {
        alert('Puoi caricare solo un file.');
        return;
      }
      
      // Verifica se sono state rilasciate cartelle
      let hasDirectories = false;
      const dirNames: string[] = [];
      
      if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i];
          const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
          
          if (entry?.isDirectory) {
            hasDirectories = true;
            dirNames.push(entry.name);
            console.log("Rilevata cartella:", entry.name);
          }
        }
      }
      
      console.log(`Risultato verifica cartelle: ${hasDirectories ? 'Sì' : 'No'}, cartelle rilevate: ${dirNames.length}`);
      if (dirNames.length > 0) {
        console.log("Nomi cartelle:", dirNames.join(", "));
      }
      
      // Se abbiamo cartelle e il supporto è abilitato, usa l'implementazione semplificata
      if (enableFolderUpload && hasDirectories && onChaptersExtracted && e.dataTransfer.items) {
        console.log("Utilizzo del lettore semplificato di cartelle...");
        
        // Mostra l'indicatore di progresso
        setIsProcessingFolders(true);
        setProcessingProgress(0);
        setProcessingStatus('Inizializzazione elaborazione cartelle...');
        setTotalFilesFound(0);
        setProcessedFiles(0);
        
        try {
          // Callback per aggiornare il progresso
          const updateProgress = (progress: number, status: string, filesFound?: number, filesProcessed?: number) => {
            setProcessingProgress(progress);
            setProcessingStatus(status);
            if (filesFound !== undefined) setTotalFilesFound(filesFound);
            if (filesProcessed !== undefined) setProcessedFiles(filesProcessed);
          };
          
          // Utilizziamo il nuovo metodo semplificato per processare le cartelle
          console.log("Avvio processFilesFromFolders...");
          const result = await processFilesFromFolders(Array.from(e.dataTransfer.items), updateProgress);
          console.log(`Lettore cartelle semplificato ha trovato ${result.files.length} file in ${result.chapters.length} capitoli`);
          
          // Se abbiamo trovato file e capitoli
          if (result.files.length > 0 && result.chapters.length > 0) {
            console.log(`Trovati ${result.photosWithChapters.length} foto assegnate ai capitoli`);
            
            // Notifica i capitoli estratti attraverso il callback
            onChaptersExtracted({
              chapters: result.chapters,
              photosWithChapters: result.photosWithChapters
            });
            
            // Aggiorna lo stato
            updateProgress(85, 'Compressione e caricamento foto...', result.files.length, result.files.length);
            
            // Procedi con la compressione e l'upload di tutti i file
            await processFiles(result.files);
            
            // Operazione completata
            updateProgress(100, 'Elaborazione cartelle completata!', result.files.length, result.files.length);
            setTimeout(() => setIsProcessingFolders(false), 1000); // Nascondi il loader dopo 1 secondo
            return;
          } else {
            console.log("Nessuna struttura di cartelle trovata, passaggio alla creazione manuale.");
            updateProgress(50, 'Nessuna struttura di cartelle trovata, passaggio alla creazione manuale...', 0, 0);
          }
        } catch (error: any) {
          console.error("Errore durante l'elaborazione delle cartelle:", error);
          setProcessingStatus(`Errore: ${error.message || 'Errore sconosciuto'}`);
          // Mostra l'errore per alcuni secondi prima di passare al fallback
          setTimeout(() => {
            // Continua con l'approccio di fallback
            setIsProcessingFolders(false);
          }, 2000);
          return;
        }
      }
      
      // Se il metodo avanzato fallisce o non è disponibile, utilizza un approccio di fallback
      const newFiles = Array.from(e.dataTransfer.files);
      console.log(`Utilizzo metodo di fallback con ${newFiles.length} file`);
      
      // Fallback: se abbiamo cartelle, creiamo manualmente i capitoli
      if (enableFolderUpload && dirNames.length > 0 && onChaptersExtracted) {
        console.log("Creazione manuale capitoli dalle cartelle rilevate:", dirNames);
        
        // Creare capitoli basati sui nomi delle cartelle
        const manualChapters: Chapter[] = dirNames.map((dirName, idx) => ({
          id: `chapter-${Date.now()}-${idx}`,
          title: dirName,
          description: `Foto dalla cartella "${dirName}"`,
          position: idx
        }));
        
        // Distribuisci equamente i file tra i capitoli (fallback semplice)
        const filesPerChapter = Math.ceil(newFiles.length / dirNames.length);
        const manualPhotosWithChapters: PhotoWithChapter[] = [];
        
        newFiles.forEach((file, idx) => {
          const chapterIdx = Math.min(Math.floor(idx / filesPerChapter), dirNames.length - 1);
          manualPhotosWithChapters.push({
            id: `photo-${Date.now()}-${idx}`,
            file,
            url: URL.createObjectURL(file),
            name: file.name,
            chapterId: manualChapters[chapterIdx].id,
            position: idx
          });
        });
        
        // Usa i capitoli creati manualmente
        const manualResult = {
          chapters: manualChapters,
          photosWithChapters: manualPhotosWithChapters
        };
        
        console.log("Capitoli creati dal fallback:", manualChapters);
        onChaptersExtracted(manualResult);
        
        // Procedi con la compressione e l'upload
        await processFiles(newFiles);
        return;
      }
      
      // Fallback senza capitoli: processo standard
      console.log("Utilizzo processo standard senza capitoli");
      await processFiles(newFiles);
    } catch (error: any) {
      console.error("Errore globale nella gestione del drop:", error);
      alert(`Si è verificato un errore durante l'elaborazione dei file: ${error.message || 'Errore sconosciuto'}`);
    }
  };

  // Gestisce la selezione dei file tramite il file input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        console.log("Elaborazione selezione da input file...");
        const newFiles = Array.from(e.target.files);
        console.log(`Selezionati ${newFiles.length} file`);
        
        // Controlla se abbiamo un input di tipo directory
        const webkitFilesWithPaths = newFiles.filter(file => 
          'webkitRelativePath' in file && (file as any).webkitRelativePath
        );
        
        const hasWebkitRelativePaths = webkitFilesWithPaths.length > 0;
        console.log(`File con percorsi relativi: ${webkitFilesWithPaths.length}`);
        
        // Se abbiamo percorsi relativi e il supporto per cartelle è abilitato
        if (enableFolderUpload && hasWebkitRelativePaths && onChaptersExtracted) {
          // Mostra l'indicatore di progresso
          setIsProcessingFolders(true);
          setProcessingProgress(0);
          setProcessingStatus('Inizializzazione elaborazione cartelle...');
          setTotalFilesFound(0);
          setProcessedFiles(0);
          
          // Callback per aggiornare il progresso
          const updateProgress = (progress: number, status: string, filesFound?: number, filesProcessed?: number) => {
            setProcessingProgress(progress);
            setProcessingStatus(status);
            if (filesFound !== undefined) setTotalFilesFound(filesFound);
            if (filesProcessed !== undefined) setProcessedFiles(filesProcessed);
          };
          
          try {
            // Genera automaticamente i capitoli dai file con percorsi relativi
            updateProgress(5, 'Analisi delle cartelle...', newFiles.length, 0);
            
            // Crea una mappa di cartelle in base ai percorsi relativi dei file
            const chapters: Chapter[] = [];
            const photosWithChapters: PhotoWithChapter[] = [];
            const folderMap = new Map<string, File[]>();
            let processedFiles = 0;
            
            // Primo passaggio: raggruppa i file per cartella
            for (const file of webkitFilesWithPaths) {
              // Ottieni il percorso relativo
              const path = (file as any).webkitRelativePath || '';
              if (path && path.includes('/')) {
                // Estrai il nome della cartella principale
                const folderName = path.split('/')[0];
                
                // Aggiungi file al gruppo della cartella
                if (!folderMap.has(folderName)) {
                  folderMap.set(folderName, [file]);
                } else {
                  folderMap.get(folderName)!.push(file);
                }
              }
              
              processedFiles++;
              if (processedFiles % 100 === 0) {
                updateProgress(20, `Analisi file ${processedFiles}/${newFiles.length}...`, newFiles.length, processedFiles);
              }
            }
            
            // Secondo passaggio: crea capitoli per ogni cartella
            updateProgress(40, 'Creazione capitoli...', newFiles.length, processedFiles);
            let position = 0;
            
            Array.from(folderMap.entries()).forEach(([folderName, files], idx) => {
              // Crea un capitolo per questa cartella
              const chapterId = `chapter-${Date.now()}-${idx}`;
              chapters.push({
                id: chapterId,
                title: folderName,
                description: `Foto dalla cartella "${folderName}"`,
                position: idx
              });
              
              // Assegna tutti i file a questo capitolo
              files.forEach((file, fileIdx) => {
                photosWithChapters.push({
                  id: `photo-${Date.now()}-${position}`,
                  file,
                  url: URL.createObjectURL(file),
                  name: file.name,
                  chapterId,
                  position: position++
                });
              });
              
              console.log(`Capitolo "${folderName}" creato con ${files.length} foto`);
            });
            
            // Terzo passaggio: gestisci i file che non hanno percorsi relativi
            const otherFiles = newFiles.filter(file => !webkitFilesWithPaths.includes(file));
            
            if (otherFiles.length > 0) {
              // Crea un capitolo "Altre foto" per i file senza percorso
              const chapterId = `chapter-${Date.now()}-other`;
              chapters.push({
                id: chapterId,
                title: "Altre foto",
                description: "Foto senza categoria specifica",
                position: chapters.length
              });
              
              // Assegna i file rimanenti a questo capitolo
              otherFiles.forEach((file, idx) => {
                photosWithChapters.push({
                  id: `photo-${Date.now()}-${position}`,
                  file,
                  url: URL.createObjectURL(file),
                  name: file.name,
                  chapterId,
                  position: position++
                });
              });
              
              console.log(`Capitolo "Altre foto" creato con ${otherFiles.length} foto`);
            }
            
            updateProgress(70, 'Preparazione per caricamento...', newFiles.length, newFiles.length);
            
            // Notifica i capitoli creati
            if (chapters.length > 0) {
              console.log(`Creati ${chapters.length} capitoli con ${photosWithChapters.length} foto totali`);
              
              onChaptersExtracted({
                chapters,
                photosWithChapters
              });
              
              // Procedi con la compressione e il caricamento
              updateProgress(80, 'Compressione e caricamento foto...', newFiles.length, newFiles.length);
              await processFiles(newFiles);
              
              // Operazione completata
              updateProgress(100, 'Elaborazione cartelle completata!', newFiles.length, newFiles.length);
              setTimeout(() => setIsProcessingFolders(false), 1000);
            } else {
              console.log("Nessun capitolo creato, uso metodo tradizionale");
              
              // Fallback al metodo tradizionale
              updateProgress(60, 'Nessun capitolo rilevato, provo metodo alternativo...', newFiles.length, newFiles.length);
              const result = extractChaptersFromFolders(newFiles);
              
              if (result.chapters.length > 0) {
                onChaptersExtracted(result);
                await processFiles(result.photosWithChapters.map(p => p.file));
              } else {
                await processFiles(newFiles);
              }
              
              setIsProcessingFolders(false);
            }
          } catch (error: any) {
            console.error("Errore durante l'elaborazione delle cartelle:", error);
            setProcessingStatus(`Errore: ${error.message || 'Errore sconosciuto'}`);
            
            // Tenta comunque il metodo tradizionale
            setTimeout(() => {
              setIsProcessingFolders(false);
              processFiles(newFiles).catch(console.error);
            }, 2000);
          }
        } else {
          // Processo standard per i file senza supporto cartelle
          console.log("Upload standard senza capitoli");
          await processFiles(newFiles);
        }
      } catch (error: any) {
        console.error("Errore durante l'elaborazione dei file selezionati:", error);
        // In caso di errore, tenta comunque l'upload standard
        await processFiles(Array.from(e.target.files));
      } finally {
        // Reset dell'input file per permettere di selezionare lo stesso file più volte
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  // Apre il file picker quando si clicca sulla drop area
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Area di drop */}
      <div
        ref={dropAreaRef}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer text-center",
          isDragging 
            ? "border-primary bg-primary/5" 
            : isProcessingFolders
              ? "border-blue-500 bg-blue-50"
              : "border-muted-foreground/25 hover:border-primary/50",
          "flex flex-col items-center justify-center gap-2",
          isProcessingFolders ? "pointer-events-none" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isProcessingFolders ? (
          <div className="w-full text-center">
            <div className="animate-pulse mb-3">
              <Folder className="h-10 w-10 text-blue-500 mx-auto animate-bounce" />
            </div>
            <h3 className="text-lg font-semibold text-blue-700 mb-2">{processingStatus}</h3>
            
            {/* Barra di progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            
            {/* Informazioni sul progresso */}
            <div className="text-sm text-gray-600 flex justify-between items-center">
              <span>{processedFiles} di {totalFilesFound} file</span>
              <span>{processingProgress}%</span>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              L'elaborazione di molte foto può richiedere tempo. Non chiudere questa finestra.
            </p>
          </div>
        ) : (
          <>
            {enableFolderUpload ? <Folder className="h-10 w-10 text-muted-foreground" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
            <p className="text-sm font-medium">
              {enableFolderUpload ? (
                <>Trascina le cartelle qui o <span className="text-primary">selezionane dal computer</span></>
              ) : (
                <>Trascina le foto qui o <span className="text-primary">selezionane dal computer</span></>
              )}
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              {enableFolderUpload ? (
                <p className="font-medium text-green-600">
                  Carica intere cartelle per creare automaticamente i capitoli
                </p>
              ) : (
                <p>
                  {multiple 
                    ? "Carica quante immagini desideri" 
                    : "Puoi caricare una sola immagine"}
                </p>
              )}
              <p className="text-xs">
                Formato consigliato: max 2000px di lato lungo, max 5MB, 72-300 DPI
              </p>
              <p className="text-xs">
                Immagini più grandi saranno compresse automaticamente
              </p>
              {enableFolderUpload && (
                <p className="text-xs font-medium text-blue-500">
                  I nomi delle cartelle ("Sposo", "Sposa", "Cerimonia", ecc.) verranno usati come capitoli
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Input file nascosto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple={multiple}
        accept={accept}
        className="hidden"
        {...(enableFolderUpload ? { webkitdirectory: "", directory: "" } : {})}
      />

      {/* Informazioni sulla compressione e anteprima */}
      {(currentFiles.length > 0 || previews.length > 0 || compressingFiles.length > 0) && (
        <>
          {/* Informazioni sulla compressione */}
          {enableCompression && (currentFiles.length > 0 || compressingFiles.length > 0) && (
            <div className="mt-4 mb-4">
              <h4 className="text-sm font-medium mb-2 text-blue-gray">Informazioni compressione</h4>
              <div className="space-y-2">
                {/* File in fase di compressione */}
                {compressingFiles.map((fileName, idx) => (
                  <ImageCompressionInfo
                    key={`compressing-${fileName}-${idx}`}
                    fileName={fileName}
                    isCompressing={true}
                    originalSize={undefined}
                    compressedSize={undefined}
                  />
                ))}
                
                {/* File con compressione completata */}
                {currentFiles.map((file, index) => {
                  const compressionInfo = compressionData[file.name];
                  return compressionInfo ? (
                    <ImageCompressionInfo
                      key={`compressed-${file.name}-${index}`}
                      fileName={file.name}
                      isCompressing={false}
                      originalSize={compressionInfo.originalSize}
                      compressedSize={compressionInfo.compressedSize}
                      compressionRatio={compressionInfo.compressionRatio}
                    />
                  ) : file.type.startsWith('image/') ? (
                    <ImageCompressionInfo
                      key={`file-${file.name}-${index}`}
                      fileName={file.name}
                      isCompressing={false}
                      originalSize={file.size}
                      compressedSize={file.size}
                      compressionRatio={1}
                    />
                  ) : null;
                }).filter(Boolean)}
              </div>
            </div>
          )}
          
          {/* Anteprima dei file selezionati */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {currentFiles.map((file, index) => (
              <div key={`file-upload-${file.name}-${index}`} className="relative group">
                <div className="relative aspect-square rounded-md overflow-hidden border bg-background">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index}`}
                    className="object-cover w-full h-full"
                  />
                  {onRemoveFile && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Rimuovi anche i dati di compressione
                        setCompressionData(prev => {
                          const newData = {...prev};
                          delete newData[file.name];
                          return newData;
                        });
                        onRemoveFile(index);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs mt-1 truncate">{file.name}</p>
              </div>
            ))}
            {previews.map((preview, index) => (
              <div key={`preview-${index}`} className="relative group">
                <div className="relative aspect-square rounded-md overflow-hidden border bg-background">
                  <img
                    src={preview}
                    alt={`Existing preview ${index}`}
                    className="object-cover w-full h-full"
                  />
                  {onRemoveFile && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(index + currentFiles.length);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}