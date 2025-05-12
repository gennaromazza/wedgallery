import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { compressImages } from '@/lib/imageCompression';

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
  compressionOptions = { maxSizeMB: 1, maxWidthOrHeight: 1920 }
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
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
      
      // Controlla che non si superi il numero massimo di file
      if (multiple) {
        const totalFiles = currentFiles.length + newFiles.length;
        if (totalFiles > maxFiles) {
          alert(`Puoi caricare al massimo ${maxFiles} file.`);
          return;
        }
      } else if (newFiles.length > 1) {
        // Se multiple è false, accetta solo un file
        alert('Puoi caricare solo un file.');
        return;
      }
      
      try {
        // Comprime le immagini se l'opzione è abilitata
        if (enableCompression) {
          const compressedFiles = await compressImages(newFiles, compressionOptions);
          onFilesSelected(compressedFiles);
        } else {
          onFilesSelected(newFiles);
        }
      } catch (error) {
        console.error("Errore durante la compressione delle immagini:", error);
        // Fallback ai file originali in caso di errore
        onFilesSelected(newFiles);
      }
    }
  };

  // Gestisce la selezione dei file tramite il file input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Controlla che non si superi il numero massimo di file
      if (multiple) {
        const totalFiles = currentFiles.length + newFiles.length;
        if (totalFiles > maxFiles) {
          alert(`Puoi caricare al massimo ${maxFiles} file.`);
          return;
        }
      }
      
      try {
        // Comprime le immagini se l'opzione è abilitata
        if (enableCompression) {
          const compressedFiles = await compressImages(newFiles, compressionOptions);
          onFilesSelected(compressedFiles);
        } else {
          onFilesSelected(newFiles);
        }
      } catch (error) {
        console.error("Errore durante la compressione delle immagini:", error);
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
        <p className="text-xs text-muted-foreground">
          {multiple 
            ? `Puoi caricare fino a ${maxFiles} immagini` 
            : "Puoi caricare una sola immagine"}
        </p>
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

      {/* Anteprima dei file selezionati */}
      {(currentFiles.length > 0 || previews.length > 0) && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {currentFiles.map((file, index) => (
            <div key={`file-${index}`} className="relative group">
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
      )}
    </div>
  );
}