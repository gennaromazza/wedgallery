
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeddingImage } from '@/components/WeddingImages';

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

  // Ordina i capitoli per posizione
  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position);

  // Se non ci sono foto, mostra un messaggio
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

  // Se non ci sono capitoli, mostra solo la griglia di foto
  if (chapters.length === 0) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-sage/5 to-transparent opacity-50 pointer-events-none"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {photos.map((photo, index) => (
            <PhotoGridItem
              key={`photo-${photo.id}-${index}`}
              photo={photo}
              index={index}
              openLightbox={openLightbox}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
      <div className="mb-8 border-b border-sage/20">
        <div className="relative bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-sage/10 p-3 mb-6">
        <TabsList className="relative flex flex-wrap justify-center gap-2 bg-transparent">
          <TabsTrigger 
            value="all" 
            className="flex-shrink-0 text-blue-gray/80 bg-sage/5 data-[state=active]:bg-sage/15 data-[state=active]:text-sage-800 hover:text-sage-700 rounded-lg border border-sage/20 data-[state=active]:border-sage/40 transition-all px-4 py-2 text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Tutte le foto ({photos.length})
            </span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="unassigned" 
            className="flex-shrink-0 text-blue-gray/80 bg-sage/5 data-[state=active]:bg-sage/15 data-[state=active]:text-sage-800 hover:text-sage-700 rounded-lg border border-sage/20 data-[state=active]:border-sage/40 transition-all px-4 py-2 text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                <path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                <path d="M16 2v6h6"></path>
                <line x1="12" y1="12" x2="12" y2="12"></line>
              </svg>
              Non assegnate ({photos.filter(p => !p.chapterId).length})
            </span>
          </TabsTrigger>
          
          {sortedChapters.map(chapter => (
            <TabsTrigger 
              key={`tab-${chapter.id}`}
              value={chapter.id} 
              className="flex-shrink-0 text-blue-gray/80 bg-sage/5 data-[state=active]:bg-sage/15 data-[state=active]:text-sage-800 hover:text-sage-700 rounded-lg border border-sage/20 data-[state=active]:border-sage/40 transition-all px-4 py-2 text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <path d="M12 3L2 12h3v8h14v-8h3L12 3z"></path>
                </svg>
                {chapter.title} ({photos.filter(p => p.chapterId === chapter.id).length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Decorative element */}
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-32 h-6 flex justify-center opacity-30">
          <svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-sage-500">
            <path d="M50,5 C60,15 70,15 80,5 C70,25 60,25 50,15 C40,25 30,25 20,5 C30,15 40,15 50,5 Z" />
          </svg>
        </div>
      </div>
      </div>

      <TabsContent value="all" className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {photos
            .sort((a, b) => (a.chapterPosition || 0) - (b.chapterPosition || 0))
            .map((photo, index) => (
              <PhotoGridItem
                key={`all-${photo.id}-${index}`}
                photo={photo}
                index={index}
                openLightbox={openLightbox}
              />
            ))}
        </div>
      </TabsContent>

      <TabsContent value="unassigned" className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {photos
            .filter(p => !p.chapterId)
            .map((photo, index) => (
              <PhotoGridItem
                key={`unassigned-${photo.id}-${index}`}
                photo={photo}
                index={index}
                openLightbox={openLightbox}
              />
            ))}
        </div>
      </TabsContent>

      {sortedChapters.map(chapter => (
        <TabsContent key={`content-${chapter.id}`} value={chapter.id} className="mt-6">
          {chapter.description && (
            <p className="text-blue-gray italic mb-4 md:mb-6 text-sm md:text-base">
              {chapter.description}
            </p>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
            {photos
              .filter(p => p.chapterId === chapter.id)
              .sort((a, b) => {
                const posA = typeof a.chapterPosition === 'number' ? a.chapterPosition : a.position || 0;
                const posB = typeof b.chapterPosition === 'number' ? b.chapterPosition : b.position || 0;
                return posA - posB;
              })
              .map((photo, index) => (
                <PhotoGridItem
                  key={`chapter-${chapter.id}-${photo.id}-${index}`}
                  photo={photo}
                  index={photos.findIndex(p => p.id === photo.id)}
                  openLightbox={openLightbox}
                />
              ))}
          </div>

          {photos.filter(p => p.chapterId === chapter.id).length === 0 && (
            <EmptyChapterMessage />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Componente per il singolo elemento della griglia di foto
function PhotoGridItem({ photo, index, openLightbox }: { 
  photo: PhotoData; 
  index: number;
  openLightbox: (index: number) => void;
}) {
  return (
    <div
      className="gallery-image h-40 sm:h-52 lg:h-64 relative overflow-hidden rounded-md shadow-sm transition-transform duration-300 hover:scale-[1.02] hover:shadow-md"
      onClick={() => openLightbox(index)}
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
  );
}

// Componente per il messaggio di capitolo vuoto
function EmptyChapterMessage() {
  return (
    <div className="text-center py-8">
      <div className="flex flex-col items-center">
        <div className="w-32 h-32 mb-4">
          <WeddingImage type="wedding-cake" alt="Immagine decorativa torta nuziale" className="w-full h-auto opacity-30" />
        </div>
        <p className="text-gray-500 italic">Nessuna foto in questo capitolo</p>
      </div>
    </div>
  );
}
