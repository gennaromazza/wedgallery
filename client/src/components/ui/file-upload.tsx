import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { compressImages } from '@/lib/imageCompression';
import ImageCompressionInfo from '@/components/ImageCompressionInfo';
import { extractChaptersFromFolders } from '@/lib/folderChapterMapper';
import { Chapter, PhotoWithChapter } from '@/components/ChaptersManager';
import { processItemsWithFolders, createChaptersFromFolderStructure } from '@/lib/folderReader';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
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

export function FileUpload({
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

  // Processa i file (compressione e callback)
  const processFiles = async (files: File[]) => {
    try {
      // Comprime le immagini se l'opzione è abilitata
      if (enableCompression) {
        // Imposta lo stato di compressione per mostrare il caricamento
        const fileNames = files.map(file => file.name);
        setCompressingFiles([...compressingFiles, ...fileNames]);
        
        // Memorizza le dimensioni originali
        const originalSizes: {[filename: string]: number} = {};
        files.forEach(file => {
          originalSizes[file.name] = file.size;
        });
        
        // Comprime le immagini
        const compressedFiles = await Promise.all(files.map(async (file) => {
          // Per ogni file, se è un'immagine comprimi, altrimenti mantieni originale
          if (file.type.startsWith('image/')) {
            try {
              // Usa il metodo di compressione singolo per avere più controllo
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
        
        // Rimuovi lo stato di compressione
        setCompressingFiles(prev => prev.filter(name => !fileNames.includes(name)));
        
        onFilesSelected(compressedFiles);
      } else {
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
      
      // Se abbiamo cartelle e il supporto è abilitato, usa la nuova implementazione avanzata
      if (enableFolderUpload && hasDirectories && onChaptersExtracted && e.dataTransfer.items) {
        console.log("Utilizzo del processore avanzato di cartelle...");
        
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
          
          // Aggiorna lo stato iniziale
          updateProgress(5, 'Analisi delle cartelle in corso...', 0, 0);
          
          // Utilizziamo il nuovo metodo avanzato per processare le cartelle
          const { files, folderMap } = await processItemsWithFolders(Array.from(e.dataTransfer.items), updateProgress);
          console.log(`Processore avanzato ha trovato ${files.length} file in ${folderMap.size} cartelle`);
          
          // Aggiorna lo stato dopo aver trovato i file
          updateProgress(50, 'Creazione capitoli in corso...', files.length, 0);
          
          // Se abbiamo trovato file e cartelle
          if (files.length > 0 && folderMap.size > 0) {
            // Crea capitoli e assegna foto in base alla struttura delle cartelle
            const result = createChaptersFromFolderStructure(files, folderMap, updateProgress);
            console.log(`Creati ${result.chapters.length} capitoli con ${result.photosWithChapters.length} foto`);
            
            // Aggiorna lo stato
            updateProgress(75, 'Preparazione foto per caricamento...', files.length, files.length);
            
            // Notifica i capitoli estratti attraverso il callback
            onChaptersExtracted(result);
            
            // Procedi con la compressione e l'upload di tutti i file
            updateProgress(85, 'Compressione e caricamento foto...', files.length, files.length);
            await processFiles(files);
            
            // Operazione completata
            updateProgress(100, 'Elaborazione cartelle completata!', files.length, files.length);
            setTimeout(() => setIsProcessingFolders(false), 1000); // Nascondi il loader dopo 1 secondo
            return;
          } else {
            console.log("Nessuna struttura di cartelle trovata, passaggio alla creazione manuale.");
            updateProgress(50, 'Nessuna struttura di cartelle trovata, passaggio alla creazione manuale...', 0, 0);
          }
        } catch (error) {
          console.error("Errore durante l'elaborazione avanzata delle cartelle:", error);
          setProcessingStatus(`Errore: ${(error as any).message || 'Errore sconosciuto'}`);
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
        
        // Se abbiamo percorsi relativi e il supporto per cartelle è abilitato, elabora come cartelle
        if (enableFolderUpload && hasWebkitRelativePaths && onChaptersExtracted) {
          console.log("Rilevata selezione di cartella da input, estrazione capitoli in corso...");
          
          // Raggruppa i file per cartella
          const folderMap = new Map<string, { files: File[]; folderName: string }>();
          
          for (const file of webkitFilesWithPaths) {
            // Ottieni il percorso relativo
            const path = (file as any).webkitRelativePath;
            if (path && path.includes('/')) {
              // Estrai il nome della cartella principale
              const folderName = path.split('/')[0];
              
              // Aggiungi il file alla cartella appropriata
              if (!folderMap.has(folderName)) {
                folderMap.set(folderName, {
                  files: [file],
                  folderName
                });
              } else {
                folderMap.get(folderName)!.files.push(file);
              }
            }
          }
          
          console.log(`Trovate ${folderMap.size} cartelle dalla selezione`);
          
          if (folderMap.size > 0) {
            // Crea capitoli e assegna foto in base alla struttura delle cartelle
            const result = createChaptersFromFolderStructure(newFiles, folderMap);
            console.log(`Creati ${result.chapters.length} capitoli con ${result.photosWithChapters.length} foto`);
            
            // Notifica i capitoli estratti attraverso il callback
            onChaptersExtracted(result);
            
            // Procedi con la compressione e l'upload
            await processFiles(newFiles);
          } else {
            // Se non abbiamo trovato cartelle, usa l'approccio tradizionale
            console.log("Nessuna struttura di cartelle trovata, utilizzo tradizionale");
            const result = extractChaptersFromFolders(newFiles);
            
            if (result.chapters.length > 0) {
              console.log("Capitoli estratti dal metodo tradizionale:", result.chapters);
              onChaptersExtracted(result);
              await processFiles(result.photosWithChapters.map(p => p.file));
            } else {
              // Nessun capitolo, upload standard
              await processFiles(newFiles);
            }
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