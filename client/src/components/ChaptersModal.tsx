import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ChaptersManager, { Chapter, PhotoWithChapter } from './ChaptersManager';

interface ChaptersModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoWithChapter[];
  onPhotosUpdate: (photos: PhotoWithChapter[]) => void;
  chapters: Chapter[];
  onChaptersUpdate: (chapters: Chapter[]) => void;
  onSave: () => void;
}

export default function ChaptersModal({
  isOpen,
  onClose,
  photos,
  onPhotosUpdate,
  chapters,
  onChaptersUpdate,
  onSave
}: ChaptersModalProps) {
  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90%] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Organizza le foto in capitoli</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="mt-4">
          <ChaptersManager
            photos={photos}
            onPhotosUpdate={onPhotosUpdate}
            chapters={chapters}
            onChaptersUpdate={onChaptersUpdate}
          />
        </div>
        
        <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Completa l'organizzazione delle foto e salva la galleria
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button size="lg" onClick={handleSave} className="bg-blue-gray hover:bg-blue-gray/90">
                <span className="mr-2">✓</span> Crea galleria
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}