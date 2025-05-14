import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { createUrl } from "@/lib/basePath";
import Navigation from "@/components/Navigation";
import ImageLightbox from "@/components/ImageLightbox";
import { Skeleton } from "@/components/ui/skeleton";
import SimpleChaptersView from "@/components/SimpleChaptersView";
import GalleryHeader from "@/components/gallery/GalleryHeader";
import YouTubeEmbed from "@/components/gallery/YouTubeEmbed";
import LoadMoreButton from "@/components/gallery/LoadMoreButton";
import { useGalleryData } from "@/hooks/use-gallery-data";

export default function Gallery() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Carica dati galleria usando il custom hook
  const { 
    gallery, 
    photos, 
    chapters, 
    isLoading, 
    hasMorePhotos, 
    loadingMorePhotos,
    loadMorePhotos 
  } = useGalleryData(id || "");

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = () => {
      const admin = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(admin);
    };
    
    checkAdmin();
  }, []);
  
  // Verifica autenticazione
  useEffect(() => {
    const checkAuth = () => {
      const isAuth = localStorage.getItem(`gallery_auth_${id}`);
      if (!isAuth && !isAdmin) {
        navigate(createUrl(`/access/${id}`));
      }
    };
    
    checkAuth();
  }, [id, isAdmin, navigate]);

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem(`gallery_auth_${id}`);
    navigate(createUrl("/"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sage-50">
        <Navigation galleryOwner={gallery?.name} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-32" />
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-40 sm:h-52 lg:h-64 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Galleria non trovata</h1>
          <p className="mb-4">La galleria che stai cercando non esiste o è stata rimossa.</p>
          <button 
            className="px-4 py-2 bg-sage-600 text-white rounded-md hover:bg-sage-700"
            onClick={() => navigate(createUrl("/"))}
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sage-50 pb-12">
      <Navigation galleryOwner={gallery.name} />
      
      <main>
        {/* Intestazione galleria */}
        <GalleryHeader 
          name={gallery.name}
          date={gallery.date}
          location={gallery.location}
          description={gallery.description}
        />
        
        {/* Video YouTube se presente */}
        <YouTubeEmbed videoUrl={gallery.youtubeUrl || ""} />
        
        {/* Contenuto principale - visualizzazione foto organizzate per capitoli */}
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-6">
          <div className="px-4 py-4">
            {/* Componente per visualizzare le foto organizzate per capitoli */}
            <SimpleChaptersView 
              chapters={chapters}
              photos={photos}
              openLightbox={openLightbox}
            />
            
            {/* Pulsante per caricare altre foto */}
            <LoadMoreButton 
              onClick={loadMorePhotos}
              isLoading={loadingMorePhotos}
              hasMore={hasMorePhotos}
            />
          </div>
        </div>
      </main>
      
      {/* Lightbox per visualizzare le foto a schermo intero */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        photos={photos}
        initialIndex={currentPhotoIndex}
      />
    </div>
  );
}