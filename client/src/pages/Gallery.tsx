import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStudio } from "@/context/StudioContext";
import { trackGalleryView } from "@/lib/analytics";
import Navigation from "@/components/Navigation";
import ImageLightbox from "@/components/ImageLightbox";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Photo } from "@shared/schema";

interface GalleryData {
  id: string;
  name: string;
  date: string;
  location: string;
  description?: string;
  coverImageUrl?: string;
  hasChapters?: boolean;
}

// Non estendere da Photo ma definiamo i nostri campi
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

interface ChapterData {
  id: string;
  title: string;
  description?: string;
  position: number;
}

export default function Gallery() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { toast } = useToast();
  const { studioSettings } = useStudio();

  // Check authentication and fetch gallery data
  // Check if current user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Assicuriamoci che activeTab sia impostato correttamente quando i capitoli cambiano
  useEffect(() => {
    if (chapters.length > 0 && (!activeTab || activeTab === '')) {
      setActiveTab('all');
    }
  }, [chapters, activeTab]);

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
          description: galleryData.description || "",
          coverImageUrl: galleryData.coverImageUrl || "",
          hasChapters: galleryData.hasChapters || false
        });
        
        // Fetch chapters if the gallery has them
        if (galleryData.hasChapters) {
          try {
            const chaptersRef = collection(db, "galleries", galleryDoc.id, "chapters");
            const chaptersQuery = query(chaptersRef, orderBy("position", "asc"));
            const chaptersSnapshot = await getDocs(chaptersQuery);
            
            if (!chaptersSnapshot.empty) {
              const chaptersData = chaptersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as ChapterData[];
              
              setChapters(chaptersData);
              console.log(`Caricati ${chaptersData.length} capitoli`);
            }
          } catch (chaptersError) {
            console.error("Errore nel caricamento dei capitoli:", chaptersError);
          }
        }
        
        // Fetch photos for the gallery
        const photosRef = collection(db, "galleries", galleryDoc.id, "photos");
        let photosSnapshot;
        
        // Create query based on hasChapters
        if (galleryData.hasChapters) {
          const q = query(photosRef, orderBy("chapterPosition", "asc"));
          photosSnapshot = await getDocs(q);
        } else {
          photosSnapshot = await getDocs(photosRef);
        }
        
        let photosData = photosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PhotoData[];
        
        // Se non ci sono foto nella sottocollezione "photos" ma è indicato che ci sono foto (photoCount > 0),
        // potrebbe essere che le foto siano state caricate nello Storage ma i metadati non siano stati salvati
        // in Firestore. In questo caso, tentiamo di recuperare le foto dallo Storage.
        if (photosData.length === 0 && galleryData.photoCount > 0) {
          console.log("Nessuna foto trovata nella sottocollezione, ma photoCount è", galleryData.photoCount);
          console.log("Tentativo di recupero dallo Storage...");
          
          try {
            // Importiamo ciò che serve da firebase/storage
            const { ref, listAll, getDownloadURL, getMetadata } = await import("firebase/storage");
            const { storage } = await import("@/lib/firebase");
            
            // Percorso nella cartella di Storage per questa galleria
            // Controlla prima il percorso diretto alla galleria
            const storageRef = ref(storage, `galleries/${galleryDoc.id}`);
            
            console.log("Verifico percorso Storage:", `galleries/${galleryDoc.id}`);
            
            // Elenca tutti i file nella cartella
            let listResult = await listAll(storageRef);
            
            // Se non ci sono file, prova percorsi alternativi
            if (listResult.items.length === 0) {
              console.log("Nessun file trovato, provo percorsi alternativi");
              
              // Prova con un possibile spazio nel path (come indicato dall'utente)
              const pathWithSpace = ref(storage, `galleries/ ${galleryDoc.id}`);
              console.log("Provo con path con spazio:", `galleries/ ${galleryDoc.id}`);
              try {
                const spaceResult = await listAll(pathWithSpace);
                if (spaceResult.items.length > 0) {
                  console.log("Trovate", spaceResult.items.length, "foto con path con spazio");
                  listResult = spaceResult;
                }
              } catch (e) {
                console.log("Errore con path con spazio:", e);
              }
            }
            
            // Se ancora non ci sono file e l'ID è quello specifico, prova direttamente con il path hardcoded
            if (listResult.items.length === 0 && galleryDoc.id === 'kWraDKOW7MZiM5eHSM11') {
              console.log("Provo con path hardcoded galleries/kWraDKOW7MZiM5eHSM11");
              try {
                const hardCodedRef = ref(storage, `galleries/kWraDKOW7MZiM5eHSM11`);
                const hardCodedResult = await listAll(hardCodedRef);
                if (hardCodedResult.items.length > 0) {
                  console.log("Trovate", hardCodedResult.items.length, "foto con path hardcoded");
                  listResult = hardCodedResult;
                }
              } catch (e) {
                console.log("Errore con path hardcoded:", e);
              }
            }
            
            // Per ogni file, recupera l'URL di download e i metadati
            const photoPromises = listResult.items.map(async (itemRef) => {
              const url = await getDownloadURL(itemRef);
              const metadata = await getMetadata(itemRef);
              
              // Crea oggetto foto
              return {
                id: itemRef.name, // Usa il nome del file come ID
                name: itemRef.name,
                url: url,
                contentType: metadata.contentType || 'image/jpeg',
                size: metadata.size || 0,
                createdAt: metadata.timeCreated || new Date().toISOString()
              };
            });
            
            // Attendiamo tutte le promise
            const photosFromStorage = await Promise.all(photoPromises);
            
            // Aggiorniamo i dati delle foto
            if (photosFromStorage.length > 0) {
              photosData = photosFromStorage;
              console.log("Recuperate", photosFromStorage.length, "foto dallo Storage");
              
              // Salvare i metadati in Firestore per usi futuri
              photosFromStorage.forEach(async (photo) => {
                try {
                  await addDoc(photosRef, {
                    name: photo.name,
                    url: photo.url,
                    contentType: photo.contentType,
                    size: photo.size,
                    createdAt: serverTimestamp()
                  });
                  console.log("Salvati metadati in Firestore per", photo.name);
                } catch (err) {
                  console.error("Errore nel salvare i metadati in Firestore:", err);
                }
              });
            }
          } catch (storageError) {
            console.error("Errore nel recupero dallo Storage:", storageError);
          }
        }
        
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

      {/* Hero Section con immagine di copertina */}
      {gallery.coverImageUrl && (
        <div className="relative w-full">
          <div className="w-full h-64 md:h-96 overflow-hidden">
            <img 
              src={gallery.coverImageUrl} 
              alt={`Copertina per ${gallery.name}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight font-playfair drop-shadow-md">
                {gallery.name}
              </h1>
              <p className="mt-2 text-gray-200 drop-shadow">
                {gallery.date} • {gallery.location}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`py-10 ${gallery.coverImageUrl ? 'pt-6' : ''}`}>
        {/* Mostra l'header solo se non c'è immagine di copertina */}
        {!gallery.coverImageUrl && (
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
        )}
        
        {/* Descrizione della galleria se presente */}
        {gallery.description && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <p className="text-gray-700 italic">{gallery.description}</p>
            </div>
          </div>
        )}
        
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-4">
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
                <>
                  {gallery.hasChapters && chapters.length > 0 ? (
                    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
                      <TabsList className="mb-6 flex overflow-x-auto scrollbar-thin pb-2">
                        <TabsTrigger value="all" className="flex-shrink-0">
                          Tutte le foto ({photos.length})
                        </TabsTrigger>
                        
                        <TabsTrigger value="unassigned" className="flex-shrink-0">
                          Non assegnate ({photos.filter(p => !p.chapterId).length})
                        </TabsTrigger>
                        
                        {chapters.map(chapter => (
                          <TabsTrigger key={chapter.id} value={chapter.id} className="flex-shrink-0">
                            {chapter.title} ({photos.filter(p => p.chapterId === chapter.id).length})
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
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
                                className="w-full h-full object-cover"
                                loading="lazy"
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
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      
                      {chapters.map(chapter => (
                        <TabsContent key={chapter.id} value={chapter.id} className="space-y-4">
                          {chapter.description && (
                            <p className="text-blue-gray italic mb-4 md:mb-6 text-sm md:text-base">{chapter.description}</p>
                          )}
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                            {photos.filter(p => p.chapterId === chapter.id).map((photo, index) => (
                              <div
                                key={photo.id}
                                className="gallery-image h-40 sm:h-52 lg:h-64"
                                onClick={() => openLightbox(photos.findIndex(p => p.id === photo.id))}
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
                          
                          {photos.filter(p => p.chapterId === chapter.id).length === 0 && (
                            <div className="text-center py-8">
                              <p className="text-gray-500 italic">Nessuna foto in questo capitolo</p>
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
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
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Instagram Call to Action */}
      <div className="bg-blue-gray/5 border-t border-blue-gray/10 py-8 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-playfair text-blue-gray font-medium mb-2">Ti piacciono queste foto?</h3>
              <p className="text-gray-600 max-w-lg">
                Segui il nostro profilo Instagram per vedere altri scatti emozionanti e restare aggiornato sulle nostre novità.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <a 
                href={studioSettings.socialLinks.instagram ? 
                  (studioSettings.socialLinks.instagram.startsWith('http') ? 
                    studioSettings.socialLinks.instagram : 
                    `https://instagram.com/${studioSettings.socialLinks.instagram}`) 
                  : '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full transition-transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Seguici su Instagram
              </a>
            </div>
          </div>
          
          <div className="mt-10 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} {studioSettings.name}. Tutti i diritti riservati.</p>
            <p className="mt-2">
              <span>{studioSettings.address} | Tel: {studioSettings.phone} | Email: {studioSettings.email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Photo Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        photos={photos.map(photo => ({
          id: photo.id,
          name: photo.name,
          url: photo.url,
          size: photo.size || 0,
          contentType: photo.contentType,
          createdAt: photo.createdAt || new Date()
        }))}
        initialIndex={currentPhotoIndex}
      />
    </div>
  );
}
