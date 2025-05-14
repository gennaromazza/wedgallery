import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { FloralCorner, BackgroundDecoration } from '@/components/WeddingIllustrations';
import GoogleMap from '@/components/GoogleMap';

interface GalleryHeaderProps {
  name: string;
  date: string;
  location: string;
  description?: string;
  coverImageUrl?: string;
}

export default function GalleryHeader({ 
  name, 
  date, 
  location, 
  description, 
  coverImageUrl
}: GalleryHeaderProps) {
  // Formatta la data in italiano
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy", { locale: it });
    } catch (error) {
      console.error("Errore nella formattazione della data:", error);
      return dateString;
    }
  };

  return (
    <div className="relative bg-white py-12 sm:py-16 overflow-hidden">
      {/* Decorazioni */}
      <FloralCorner position="top-left" className="absolute top-0 left-0 w-32 h-32 opacity-10 pointer-events-none" />
      <FloralCorner position="top-right" className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none" />
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <BackgroundDecoration />
      </div>
      
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 relative z-10">
        <div className="px-4 text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-gray font-playfair">
            {name}
          </h1>
          <div className="mt-2 text-blue-gray/70 flex justify-center items-center space-x-2">
            <span>{formatDate(date)}</span>
            {location && (
              <>
                <span>•</span>
                <span>{location}</span>
              </>
            )}
          </div>
        </div>
        
        {coverImageUrl && coverImageUrl.trim() !== "" && (
          <div className="px-4 mb-10">
            <div className="max-w-4xl mx-auto overflow-hidden rounded-lg shadow-sm">
              <img 
                src={coverImageUrl} 
                alt={`Copertina: ${name}`} 
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        )}
        
        {/* Mappa e descrizione */}
        {(location || description) && (
          <div className="px-4 flex flex-col md:flex-row gap-8 mb-8">
            {location && (
              <div className="w-full md:w-1/2 h-60 md:h-auto rounded-lg overflow-hidden shadow-sm">
                <GoogleMap 
                  address={location} 
                  className="w-full h-full min-h-[200px]" 
                />
              </div>
            )}
            
            {description && description.trim() !== "" && (
              <div className={`w-full ${location ? 'md:w-1/2' : ''} flex items-center`}>
                <div className="bg-white p-6 rounded-lg shadow-sm w-full">
                  <p className="text-gray-700 italic">{description}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}