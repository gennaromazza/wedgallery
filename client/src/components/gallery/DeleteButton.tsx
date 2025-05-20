import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

interface DeleteButtonProps {
  photoId: string;
  photoName: string;
  galleryId: string;
  onPhotoDeleted: () => void;
}

export default function DeleteButton({ photoId, photoName, galleryId, onPhotoDeleted }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Sei sicuro di voler eliminare questa foto (${photoName})? Questa azione è irreversibile.`)) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      console.log(`Eliminazione foto: ${photoName} (ID: ${photoId})`);
      
      // 1. Elimina il documento da Firestore nella sottocollezione galleries/{galleryId}/photos
      const photoRef = doc(db, "galleries", galleryId, "photos", photoId);
      await deleteDoc(photoRef);
      console.log(`✓ Eliminato documento da galleries/${galleryId}/photos/${photoId}`);
      
      // 2. Trova e elimina il documento corrispondente in gallery-photos
      const galleryPhotosQuery = query(
        collection(db, "gallery-photos"),
        where("galleryId", "==", galleryId),
        where("name", "==", photoName)
      );
      
      const querySnapshot = await getDocs(galleryPhotosQuery);
      if (!querySnapshot.empty) {
        // Elimina tutti i documenti trovati (dovrebbe essere solo uno)
        for (const docSnapshot of querySnapshot.docs) {
          await deleteDoc(docSnapshot.ref);
          console.log(`✓ Eliminato documento da gallery-photos: ${docSnapshot.id}`);
        }
      } else {
        console.warn(`⚠️ Nessun documento trovato in gallery-photos per ${photoName}`);
      }
      
      // 3. Elimina il file da Firebase Storage
      try {
        // Percorso principale
        const storageRef = ref(storage, `gallery-photos/${galleryId}/${photoName}`);
        await deleteObject(storageRef);
        console.log(`✓ Eliminato file da Storage: gallery-photos/${galleryId}/${photoName}`);
      } catch (storageError) {
        console.warn(`⚠️ Errore nell'eliminazione del file da Storage:`, storageError);
        // Proviamo con un percorso alternativo
        try {
          const altStorageRef = ref(storage, `galleries/${galleryId}/photos/${photoName}`);
          await deleteObject(altStorageRef);
          console.log(`✓ Eliminato file dal percorso alternativo: galleries/${galleryId}/photos/${photoName}`);
        } catch (altStorageError) {
          console.error(`❌ Impossibile eliminare il file dallo Storage:`, altStorageError);
        }
      }
      
      toast({
        title: "Foto eliminata",
        description: "La foto è stata eliminata con successo dalla galleria."
      });
      
      // Notifica il componente padre che la foto è stata eliminata
      onPhotoDeleted();
      
    } catch (error) {
      console.error("Errore durante l'eliminazione della foto:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della foto.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      className="absolute top-2 left-2 z-10 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center cursor-pointer hover:bg-red-600"
      onClick={handleDelete}
      disabled={isDeleting}
      title="Elimina foto"
    >
      {isDeleting ? (
        <LoaderCircle className="h-3 w-3 animate-spin" />
      ) : (
        <Trash2 className="h-3 w-3" />
      )}
    </button>
  );
}