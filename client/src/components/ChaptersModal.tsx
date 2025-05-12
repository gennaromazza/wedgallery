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
        
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            Salva galleria
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}