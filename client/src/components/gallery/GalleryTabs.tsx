import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeddingImage } from '@/components/WeddingImages';
import { FloralDivider, BackgroundDecoration } from '@/components/WeddingIllustrations';

interface ChapterData {
  id: string;
  title: string;
  description?: string;
  position: number;
}

interface PhotoData {
  id: string;
  name: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: any;
  chapterId?: string | null;
  chapterPosition?: number;
}

interface GalleryTabsProps {
  chapters: ChapterData[];
  photos: PhotoData[];
  openLightbox: (index: number) => void;
}

export default function GalleryTabs({
  chapters,
  photos,
  openLightbox
}: GalleryTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("all");

  // Impostiamo 'all' come tab di default quando i capitoli cambiano
  useEffect(() => {
    if (chapters.length > 0 && (!activeTab || activeTab === '')) {
      setActiveTab('all');
    }
  }, [chapters, activeTab]);

  // Se non ci sono foto, mostriamo un messaggio
  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 mb-6">
            <WeddingImage type="heart-balloon" alt="Immagine decorativa di sposi" className="w-full h-auto opacity-40" />
          </div>
          <h3 className="text-xl font-playfair text-blue-gray mb-2">
            Nessuna foto disponibile
          </h3>
          <p className="text-gray-500">
            Non ci sono ancora foto in questa galleria.
          </p>
        </div>
      </div>
    );
  }

  // Se ci sono foto ma non ci sono capitoli, mostriamo solo la griglia di foto
  if (chapters.length === 0) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-sage/5 to-transparent opacity-50 pointer-events-none"></div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="gallery-image h-40 sm:h-52 lg:h-64 relative overflow-hidden rounded-md shadow-sm transition-transform duration-300 hover:scale-[1.02] hover:shadow-md"
              onClick={() => openLightbox(index)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity z-10 pointer-events-none"></div>
              <img
                src={photo.url}
                alt={photo.name || `Foto ${index + 1}`}
                className="w-full h-full object-cover transition-all duration-300 opacity-0 hover:brightness-105"
                loading="lazy"
                onLoad={(e) => {
                  // Imposta l'opacità a 1 quando l'immagine è caricata
                  (e.target as HTMLImageElement).classList.replace('opacity-0', 'opacity-100');
                }}
                style={{ 
                  backgroundColor: '#f3f4f6',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
      <div className="mb-8 border-b border-sage/20">
        <TabsList className="relative flex overflow-x-auto pb-2 bg-transparent gap-2 border-b border-sage/20 w-full scrollbar-thin scrollbar-thumb-sage/20 scrollbar-track-transparent">
          <TabsTrigger 
            value="all" 
            className="flex-shrink-0 text-blue-gray/70 bg-sage/5 data-[state=active]:bg-sage/10 data-[state=active]:text-sage-700 hover:text-sage-700 rounded-t-lg border-b-2 border-transparent data-[state=active]:border-sage-500 transition-all px-6 py-2.5 font-medium"
          >
            Tutte le foto ({photos.length})
          </TabsTrigger>
          
          <TabsTrigger 
            value="unassigned" 
            className="flex-shrink-0 text-blue-gray/70 bg-sage/5 data-[state=active]:bg-sage/10 data-[state=active]:text-sage-700 hover:text-sage-700 rounded-t-lg border-b-2 border-transparent data-[state=active]:border-sage-500 transition-all px-6 py-2.5 font-medium"
          >
            Non assegnate ({photos.filter(p => !p.chapterId).length})
          </TabsTrigger>
          
          {chapters.map(chapter => (
            <TabsTrigger 
              key={chapter.id} 
              value={chapter.id} 
              className="flex-shrink-0 text-blue-gray/70 bg-sage/5 data-[state=active]:bg-sage/10 data-[state=active]:text-sage-700 hover:text-sage-700 rounded-t-lg border-b-2 border-transparent data-[state=active]:border-sage-500 transition-all px-6 py-2.5 font-medium"
            >
              {chapter.title} ({photos.filter(p => p.chapterId === chapter.id).length}) <span className="hidden">{chapter.id}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="h-0.5 w-full bg-gradient-to-r from-sage/30 via-sage/50 to-sage/30"></div>
      </div>
      
      <TabsContent value="all" className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="gallery-image h-40 sm:h-52 lg:h-64"
              onClick={() => openLightbox(photos.findIndex(p => p.id === photo.id))}
            >
              <img
                src={photo.url}
                alt={photo.name || `Foto ${index + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300 opacity-0 hover:opacity-95"
                loading="lazy"
                onLoad={(e) => {
                  // Imposta l'opacità a 1 quando l'immagine è caricata
                  (e.target as HTMLImageElement).classList.replace('opacity-0', 'opacity-100');
                }}
                style={{ 
                  backgroundColor: '#f3f4f6',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
        </div>
      </TabsContent>
      
      <TabsContent value="unassigned" className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {photos.filter(p => !p.chapterId).map((photo, index) => (
            <div
              key={photo.id}
              className="gallery-image h-40 sm:h-52 lg:h-64"
              onClick={() => openLightbox(photos.findIndex(p => p.id === photo.id))}
            >
              <img
                src={photo.url}
                alt={photo.name || `Foto ${index + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300 opacity-0 hover:opacity-95"
                loading="lazy"
                onLoad={(e) => {
                  // Imposta l'opacità a 1 quando l'immagine è caricata
                  (e.target as HTMLImageElement).classList.replace('opacity-0', 'opacity-100');
                }}
                style={{ 
                  backgroundColor: '#f3f4f6',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
        </div>
      </TabsContent>
      
      {chapters.map(chapter => (
        <TabsContent key={chapter.id} value={chapter.id} className="mt-6">
          {chapter.description && (
            <p className="text-blue-gray italic mb-4 md:mb-6 text-sm md:text-base">{chapter.description}</p>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
            {photos.filter(p => p.chapterId === chapter.id).map((photo, index) => (
              <div
                key={photo.id}
                className="gallery-image h-40 sm:h-52 lg:h-64 relative overflow-hidden rounded-md shadow-sm transition-transform duration-300 hover:scale-[1.02] hover:shadow-md"
                onClick={() => openLightbox(photos.findIndex(p => p.id === photo.id))}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity z-10 pointer-events-none"></div>
                <img
                  src={photo.url}
                  alt={photo.name || `Foto ${index + 1}`}
                  className="w-full h-full object-cover transition-all duration-300 opacity-0"
                  loading="lazy"
                  onLoad={(e) => {
                    (e.target as HTMLImageElement).classList.replace('opacity-0', 'opacity-100');
                  }}
                  style={{ 
                    backgroundColor: '#f3f4f6',
                    objectFit: 'cover',
                  }}
                />
              </div>
            ))}
          </div>
          
          {photos.filter(p => p.chapterId === chapter.id).length === 0 && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 mb-4">
                  <WeddingImage type="wedding-cake" alt="Immagine decorativa torta nuziale" className="w-full h-auto opacity-30" />
                </div>
                <p className="text-gray-500 italic">Nessuna foto in questo capitolo</p>
              </div>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}