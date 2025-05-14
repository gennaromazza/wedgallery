import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { compressImages } from '@/lib/imageCompression';
import ImageCompressionInfo from '@/components/ImageCompressionInfo';
import { extractChaptersFromFolders } from '@/lib/folderChapterMapper';

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

  // Gestisce l'evento di drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      
      // Controlla se multiple è abilitato
      if (!multiple && newFiles.length > 1) {
        // Se multiple è false, accetta solo un file
        alert('Puoi caricare solo un file.');
        return;
      }
      
      try {
        // Comprime le immagini se l'opzione è abilitata
        if (enableCompression) {
          // Imposta lo stato di compressione per mostrare il caricamento
          const fileNames = newFiles.map(file => file.name);
          setCompressingFiles([...compressingFiles, ...fileNames]);
          
          // Memorizza le dimensioni originali
          const originalSizes: {[filename: string]: number} = {};
          newFiles.forEach(file => {
            originalSizes[file.name] = file.size;
          });
          
          // Comprime le immagini
          const compressedFiles = await Promise.all(newFiles.map(async (file) => {
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
          onFilesSelected(newFiles);
        }
      } catch (error) {
        console.error("Errore durante la compressione delle immagini:", error);
        // Rimuovi lo stato di compressione in caso di errore
        setCompressingFiles([]);
        // Fallback ai file originali in caso di errore
        onFilesSelected(newFiles);
      }
    }
  };

  // Gestisce la selezione dei file tramite il file input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Nessun controllo sul numero massimo di file
      
      try {
        // Comprime le immagini se l'opzione è abilitata
        if (enableCompression) {
          // Imposta lo stato di compressione per mostrare il caricamento
          const fileNames = newFiles.map(file => file.name);
          setCompressingFiles([...compressingFiles, ...fileNames]);
          
          // Memorizza le dimensioni originali
          const originalSizes: {[filename: string]: number} = {};
          newFiles.forEach(file => {
            originalSizes[file.name] = file.size;
          });
          
          // Comprime le immagini
          const compressedFiles = await Promise.all(newFiles.map(async (file) => {
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
          onFilesSelected(newFiles);
        }
      } catch (error) {
        console.error("Errore durante la compressione delle immagini:", error);
        // Rimuovi lo stato di compressione in caso di errore
        setCompressingFiles([]);
        // Fallback ai file originali in caso di errore
        onFilesSelected(newFiles);
      }
      
      // Reset dell'input file per permettere di selezionare lo stesso file più volte
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
            : "border-muted-foreground/25 hover:border-primary/50",
          "flex flex-col items-center justify-center gap-2"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <Upload className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          Trascina le foto qui o{" "}
          <span className="text-primary">selezionane dal computer</span>
        </p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {multiple 
              ? "Carica quante immagini desideri" 
              : "Puoi caricare una sola immagine"}
          </p>
          <p className="text-xs">
            Formato consigliato: max 2000px di lato lungo, max 5MB, 72-300 DPI
          </p>
          <p className="text-xs">
            Immagini più grandi saranno compresse automaticamente
          </p>
        </div>
      </div>

      {/* Input file nascosto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple={multiple}
        accept={accept}
        className="hidden"
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