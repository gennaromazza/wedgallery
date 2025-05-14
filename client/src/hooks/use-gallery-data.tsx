import { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, limit, startAfter } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { trackGalleryView } from "@/lib/analytics";

// Tipi dati 
export interface GalleryData {
  id: string;
  name: string;
  date: string;
  location: string;
  description?: string;
  coverImageUrl?: string;
  youtubeUrl?: string;
  hasChapters?: boolean;
}

export interface PhotoData {
  id: string;
  name: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: any;
  chapterId?: string | null;
  chapterPosition?: number;
}

export interface ChapterData {
  id: string;
  title: string;
  description?: string;
  position: number;
}

export function useGalleryData(galleryId: string) {
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false);
  const [photosPerPage, setPhotosPerPage] = useState(20); // Carica 20 foto alla volta
  const { toast } = useToast();

  // Carica i dati della galleria
  useEffect(() => {
    async function fetchGallery() {
      setIsLoading(true);
      try {
        // Fetch gallery
        const galleriesRef = collection(db, "galleries");
        const q = query(galleriesRef, where("code", "==", galleryId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          toast({
            title: "Galleria non trovata",
            description: "La galleria richiesta non esiste o è stata rimossa.",
            variant: "destructive",
          });
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
          youtubeUrl: galleryData.youtubeUrl || "",
          hasChapters: galleryData.hasChapters || false
        });
        
        // Cerchiamo sempre i capitoli, indipendentemente dal flag hasChapters
        console.log("Cerco capitoli per galleria ID:", galleryDoc.id);
        try {
          const chaptersRef = collection(db, "galleries", galleryDoc.id, "chapters");
          const chaptersQuery = query(chaptersRef, orderBy("position", "asc"));
          const chaptersSnapshot = await getDocs(chaptersQuery);
          
          if (!chaptersSnapshot.empty) {
            const chaptersData = chaptersSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as ChapterData[];
            
            // Aggiorniamo hasChapters nella gallery locale se troviamo capitoli
            if (chaptersData.length > 0 && !galleryData.hasChapters) {
              setGallery(prev => prev ? {...prev, hasChapters: true} : null);
              
              // Aggiorniamo anche il documento in Firestore se necessario
              try {
                const galleryRef = doc(db, "galleries", galleryDoc.id);
                await updateDoc(galleryRef, {
                  hasChapters: true
                });
                console.log("Aggiornato stato hasChapters della galleria");
              } catch (updateError) {
                console.error("Errore nell'aggiornamento di hasChapters:", updateError);
              }
            }
            
            setChapters(chaptersData);
            console.log(`Caricati ${chaptersData.length} capitoli`);
          } else {
            console.log("Nessun capitolo trovato per questa galleria");
          }
        } catch (chaptersError) {
          console.error("Errore nel caricamento dei capitoli:", chaptersError);
        }
        
        // Fetch photos for the gallery with pagination
        await loadPhotos(galleryDoc.id, galleryData);
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
  }, [galleryId]);
  
  // Carica le foto della galleria
  const loadPhotos = async (galleryId: string, galleryData: any) => {
    const photosRef = collection(db, "galleries", galleryId, "photos");
    let photosQuery;
    
    // Create query based on hasChapters with pagination
    if (galleryData.hasChapters) {
      photosQuery = query(
        photosRef, 
        orderBy("chapterPosition", "asc"),
        limit(photosPerPage)
      );
    } else {
      photosQuery = query(
        photosRef,
        limit(photosPerPage)
      );
    }
    
    const photosSnapshot = await getDocs(photosQuery);
    
    let photosData = photosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PhotoData[];
    
    // Controlla se ci sono altre foto da caricare
    setHasMorePhotos(photosData.length >= photosPerPage);
    
    // Logica di debug e recupero migliorata: se non ci sono foto o ne abbiamo trovate meno di quelle attese
    // proviamo a recuperarle direttamente dallo Storage
    if (photosData.length < galleryData.photoCount || photosData.length === 0) {
      console.log(`Trovate solo ${photosData.length} foto in Firestore, ma photoCount è ${galleryData.photoCount}`);
      console.log("Tentativo di recupero dallo Storage...");
      
      try {
        // Importiamo ciò che serve da firebase/storage
        const { ref, listAll, getDownloadURL, getMetadata } = await import("firebase/storage");
        const { storage } = await import("@/lib/firebase");
        
        // Usa direttamente l'ID della galleria come riferimento principale
        console.log("Tentativo di recupero delle foto per galleryId:", galleryId);
        
        // Percorsi di storage più comuni
        const possiblePaths = [
          `galleries/${galleryId}`, 
          `galleries/ ${galleryId}`,
          `galleries/${String(galleryId).toLowerCase()}`,
          `galleries/${String(galleryId).toUpperCase()}`,
          `galleries/${galleryId}/photos`
        ];
        
        let listResult = null;
        
        // Prova tutti i percorsi possibili
        for (const path of possiblePaths) {
          if (listResult && listResult.items.length > 0) break;
          
          try {
            console.log("Verifico percorso Storage:", path);
            const pathRef = ref(storage, path);
            const result = await listAll(pathRef);
            
            if (result.items.length > 0) {
              console.log(`Trovate ${result.items.length} foto nel percorso ${path}`);
              listResult = result;
              break;
            }
          } catch (e) {
            console.log(`Percorso ${path} non valido:`, e);
          }
        }
        
        // Se non abbiamo ancora trovato foto, termina
        if (!listResult || listResult.items.length === 0) {
          console.log("Nessuna foto trovata dopo tutti i tentativi di percorso");
          return;
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
  };
  
  // Funzione per caricare più foto
  const loadMorePhotos = useCallback(async () => {
    if (!gallery || !hasMorePhotos || loadingMorePhotos) return;
    
    setLoadingMorePhotos(true);
    try {
      const photosRef = collection(db, "galleries", gallery.id, "photos");
      let photosQuery;
      
      // Create query based on hasChapters with pagination and startAfter
      if (gallery.hasChapters) {
        // Se ci sono capitoli, ordinare per posizione nel capitolo
        // Usa startAfter per caricare dalla foto successiva all'ultima caricata
        if (photos.length > 0) {
          const lastPhoto = photos[photos.length - 1];
          const lastPhotoRef = doc(db, "galleries", gallery.id, "photos", lastPhoto.id);
          const lastPhotoDoc = await getDoc(lastPhotoRef);
          
          photosQuery = query(
            photosRef, 
            orderBy("chapterPosition", "asc"),
            startAfter(lastPhotoDoc),
            limit(photosPerPage)
          );
        } else {
          photosQuery = query(
            photosRef, 
            orderBy("chapterPosition", "asc"),
            limit(photosPerPage)
          );
        }
      } else {
        // Se non ci sono capitoli, usa l'ID come ordinamento predefinito o un altro campo adeguato
        if (photos.length > 0) {
          const lastPhoto = photos[photos.length - 1];
          const lastPhotoRef = doc(db, "galleries", gallery.id, "photos", lastPhoto.id);
          const lastPhotoDoc = await getDoc(lastPhotoRef);
          
          photosQuery = query(
            photosRef,
            startAfter(lastPhotoDoc),
            limit(photosPerPage)
          );
        } else {
          photosQuery = query(
            photosRef,
            limit(photosPerPage)
          );
        }
      }
      
      const photosSnapshot = await getDocs(photosQuery);
      
      if (!photosSnapshot.empty) {
        const newPhotosData = photosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PhotoData[];
        
        // Aggiungi le nuove foto all'array esistente
        setPhotos(prevPhotos => [...prevPhotos, ...newPhotosData]);
        
        // Verifica se ci sono ancora altre foto da caricare
        setHasMorePhotos(newPhotosData.length >= photosPerPage);
      } else {
        setHasMorePhotos(false);
      }
    } catch (error) {
      console.error("Errore nel caricamento di altre foto:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nel caricamento di altre foto.",
        variant: "destructive",
      });
    } finally {
      setLoadingMorePhotos(false);
    }
  }, [gallery, hasMorePhotos, loadingMorePhotos, photos, photosPerPage]);
  
  // Utilizza trackGalleryView per tracciare la visualizzazione della galleria
  useEffect(() => {
    if (gallery) {
      trackGalleryView(gallery.id, gallery.name);
    }
  }, [gallery]);

  return { 
    gallery, 
    photos, 
    chapters, 
    isLoading, 
    hasMorePhotos, 
    loadingMorePhotos,
    loadMorePhotos
  };
}