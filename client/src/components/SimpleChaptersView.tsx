import React from "react";
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

interface SimpleChaptersViewProps {
  chapters: ChapterData[];
  photos: PhotoData[];
  openLightbox: (index: number) => void;
}

/**
 * Un componente semplificato per visualizzare le foto raggruppate per capitoli
 * senza utilizzare il componente Tabs che sta causando problemi.
 */
export default function SimpleChaptersView({ 
  chapters, 
  photos, 
  openLightbox 
}: SimpleChaptersViewProps) {
  if (chapters.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
        {photos.length === 0 ? (
          <div className="col-span-full text-center py-12">
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
        ) : (
          photos.map((photo, index) => (
            <div
              key={photo.id}
              className="gallery-image h-40 sm:h-52 lg:h-64"
              onClick={() => openLightbox(index)}
            >
              <img
                src={photo.url}
                alt={photo.name || `Foto ${index + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300 opacity-0 hover:opacity-95"
                loading="lazy"
                onLoad={(e) => {
                  (e.target as HTMLImageElement).classList.replace('opacity-0', 'opacity-100');
                }}
                style={{ backgroundColor: '#f3f4f6' }}
              />
            </div>
          ))
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-16">
      {/* Decorazione floreale */}
      <div className="relative mb-12">
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-40 h-12 flex justify-center opacity-30">
          <svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-sage-500">
            <path d="M50,5 C60,15 70,15 80,5 C70,25 60,25 50,15 C40,25 30,25 20,5 C30,15 40,15 50,5 Z" />
          </svg>
        </div>
        
        <div className="relative z-10 mx-auto max-w-4xl bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-sage/10 p-4">
          <h2 className="text-xl font-playfair text-center mb-4">Tutte le foto ({photos.length})</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
            {photos.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500 italic">Nessuna foto disponibile.</p>
              </div>
            ) : (
              photos.slice(0, 12).map((photo, index) => (
                <div
                  key={photo.id}
                  className="gallery-image h-24 sm:h-28"
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.name || `Foto ${index + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-300 opacity-0 hover:opacity-95"
                    loading="lazy"
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).classList.replace('opacity-0', 'opacity-100');
                    }}
                    style={{ backgroundColor: '#f3f4f6' }}
                  />
                </div>
              ))
            )}
            {photos.length > 12 && (
              <div className="col-span-full text-center mt-2">
                <p className="text-sm text-gray-500">
                  + altre {photos.length - 12} foto
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Capitoli */}
      {chapters.map((chapter) => (
        <div key={chapter.id} className="mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-sage/10 p-4">
            <h2 className="text-xl font-playfair mb-2">{chapter.title}</h2>
            
            {chapter.description && (
              <p className="text-blue-gray italic mb-4 md:mb-6 text-sm md:text-base">{chapter.description}</p>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {photos.filter(p => p.chapterId === chapter.id).length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-500 italic">Nessuna foto in questo capitolo.</p>
                </div>
              ) : (
                photos.filter(p => p.chapterId === chapter.id).map((photo, index) => (
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
                        (e.target as HTMLImageElement).classList.replace('opacity-0', 'opacity-100');
                      }}
                      style={{ backgroundColor: '#f3f4f6', objectFit: 'cover' }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}