import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navigation from "@/components/Navigation";
import ImageLightbox from "@/components/ImageLightbox";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Photo } from "@shared/schema";

interface GalleryData {
  id: string;
  name: string;
  date: string;
  location: string;
}

interface PhotoData extends Photo {
  id: string;
  name: string;
  url: string;
  contentType: string;
  size?: number;
  createdAt?: any;
}

export default function Gallery() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { toast } = useToast();

  // Check authentication and fetch gallery data
  // Check if current user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    // Controlla se l'utente è un amministratore
    const checkAdmin = () => {
      const admin = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(admin);
    };
    
    checkAdmin();
  }, []);
  
  useEffect(() => {
    async function fetchGallery() {
      // Check if user is authenticated for this gallery or is admin
      const isAuth = localStorage.getItem(`gallery_auth_${id}`);
      if (!isAuth && !isAdmin) {
        navigate(`/access/${id}`);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch gallery
        const galleriesRef = collection(db, "galleries");
        const q = query(galleriesRef, where("code", "==", id));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          toast({
            title: "Galleria non trovata",
            description: "La galleria richiesta non esiste o è stata rimossa.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        
        const galleryDoc = querySnapshot.docs[0];
        const galleryData = galleryDoc.data();
        setGallery({
          id: galleryDoc.id,
          name: galleryData.name,
          date: galleryData.date,
          location: galleryData.location,
        });
        
        // Fetch photos for the gallery
        const photosRef = collection(db, "galleries", galleryDoc.id, "photos");
        const photosSnapshot = await getDocs(photosRef);
        
        const photosData = photosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PhotoData[];
        
        setPhotos(photosData);
      } catch (error) {
        console.error("Error fetching gallery:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore nel caricamento della galleria.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchGallery();
  }, [id]);

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem(`gallery_auth_${id}`);
    navigate("/");
  };

  // Display loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-off-white">
        <Navigation galleryOwner="Caricamento..." />
        <div className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-10 w-80 mb-2" />
            <Skeleton className="h-6 w-60 mb-8" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-blue-gray font-playfair mb-4">
            Galleria non disponibile
          </h2>
          <p className="text-gray-600 mb-6">
            La galleria richiesta non è disponibile o è stata rimossa.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-md btn-primary"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white">
      <Navigation galleryOwner={gallery.name.split(' - ')[0]} />

      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-blue-gray font-playfair">
              {gallery.name}
            </h1>
            <p className="mt-2 text-gray-500">
              {gallery.date} • {gallery.location}
            </p>
          </div>
        </header>
        
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8">
              {photos.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-playfair text-blue-gray mb-2">
                    Nessuna foto disponibile
                  </h3>
                  <p className="text-gray-500">
                    Non ci sono ancora foto in questa galleria.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="gallery-image"
                      onClick={() => openLightbox(index)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.name || `Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Photo Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        photos={photos}
        initialIndex={currentPhotoIndex}
      />
    </div>
  );
}
