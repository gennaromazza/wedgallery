import { useState, useEffect, useRef, ChangeEvent } from "react";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ChaptersManager, { Chapter, PhotoWithChapter } from "@/components/ChaptersManager";

interface EditGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: {
    id: string;
    name: string;
    code: string;
    date: string;
    location?: string;
    description?: string;
    password?: string;
    coverImageUrl?: string;
  } | null;
}

export default function EditGalleryModal({ isOpen, onClose, gallery }: EditGalleryModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [photos, setPhotos] = useState<PhotoWithChapter[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isChaptersLoading, setIsChaptersLoading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Carica i dati della galleria quando cambia
  useEffect(() => {
    if (gallery) {
      setName(gallery.name || "");
      setDate(gallery.date || "");
      setLocation(gallery.location || "");
      setDescription(gallery.description || "");
      setPassword(gallery.password || "");
      setCoverImageUrl(gallery.coverImageUrl || "");
      
      // Se c'è un'immagine di copertina esistente, impostiamo l'anteprima
      if (gallery.coverImageUrl) {
        setCoverPreview(gallery.coverImageUrl);
      } else {
        setCoverPreview(null);
      }
      
      // Carica capitoli e foto
      loadChaptersAndPhotos();
    }
  }, [gallery]);
  
  // Gestisce il caricamento dell'immagine di copertina
  const handleCoverImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo di file non supportato",
        description: "L'immagine di copertina deve essere un'immagine (JPEG, PNG, ecc.)",
        variant: "destructive"
      });
      return;
    }
    
    setCoverImage(file);
    
    // Crea URL anteprima
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);
    
    // Cleanup URL quando il componente viene smontato
    return () => URL.revokeObjectURL(objectUrl);
  };
  
  // Carica i capitoli e le foto dalla galleria
  const loadChaptersAndPhotos = async () => {
    if (!gallery) return;
    
    setIsChaptersLoading(true);
    try {
      // Carica i capitoli
      const chaptersCollection = collection(db, "galleries", gallery.id, "chapters");
      const chaptersSnapshot = await getDocs(chaptersCollection);
      
      const loadedChapters: Chapter[] = chaptersSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description,
        position: doc.data().position || 0
      }));
      
      // Ordina per posizione
      loadedChapters.sort((a, b) => a.position - b.position);
      setChapters(loadedChapters);
      
      // Carica le foto
      const photosCollection = collection(db, "galleries", gallery.id, "photos");
      const photosSnapshot = await getDocs(photosCollection);
      
      const loadedPhotos: PhotoWithChapter[] = photosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          file: new File([], data.name), // File vuoto, usiamo solo per compatibilità
          url: data.url,
          name: data.name,
          chapterId: data.chapterId,
          position: data.position || 0
        };
      });
      
      // Ordina le foto per posizione
      loadedPhotos.sort((a, b) => a.position - b.position);
      setPhotos(loadedPhotos);
    } catch (error) {
      console.error("Error loading chapters and photos:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare capitoli e foto della galleria",
        variant: "destructive"
      });
    } finally {
      setIsChaptersLoading(false);
    }
  };

  // Salva le modifiche alla galleria
  const saveGallery = async () => {
    if (!gallery) return;
    
    setIsLoading(true);
    try {
      // Se c'è una nuova immagine di copertina, la carichiamo prima
      let newCoverImageUrl = coverImageUrl;
      if (coverImage) {
        try {
          const storageRef = ref(storage, `galleries/covers/${gallery.code}_cover`);
          await uploadBytesResumable(storageRef, coverImage);
          newCoverImageUrl = await getDownloadURL(storageRef);
          console.log("Nuova immagine di copertina caricata:", newCoverImageUrl);
        } catch (error) {
          console.error("Errore nell'upload della copertina:", error);
          // Continuiamo comunque con l'aggiornamento della galleria
        }
      }
      
      const galleryRef = doc(db, "galleries", gallery.id);
      await updateDoc(galleryRef, {
        name,
        date,
        location,
        description,
        password,
        coverImageUrl: newCoverImageUrl
      });
      
      toast({
        title: "Galleria aggiornata",
        description: "Le modifiche alla galleria sono state salvate con successo"
      });
      
      onClose();
    } catch (error) {
      console.error("Error updating gallery:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle modifiche",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Salva i capitoli
  const saveChaptersAndPhotos = async () => {
    if (!gallery) return;
    
    setIsLoading(true);
    try {
      // Aggiorna i capitoli
      for (const chapter of chapters) {
        const chapterRef = doc(db, "galleries", gallery.id, "chapters", chapter.id);
        await updateDoc(chapterRef, {
          title: chapter.title,
          description: chapter.description,
          position: chapter.position
        });
      }
      
      // Aggiorna le foto
      for (const photo of photos) {
        const photoRef = doc(db, "galleries", gallery.id, "photos", photo.id);
        await updateDoc(photoRef, {
          chapterId: photo.chapterId,
          position: photo.position
        });
      }
      
      toast({
        title: "Capitoli aggiornati",
        description: "Le modifiche ai capitoli e alle foto sono state salvate con successo"
      });
    } catch (error) {
      console.error("Error updating chapters and photos:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle modifiche",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!gallery) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-playfair">Modifica Galleria</DialogTitle>
          <DialogDescription>
            Modifica i dettagli, la password o l'organizzazione dei capitoli della galleria
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="details" className="flex-1">Dettagli</TabsTrigger>
            <TabsTrigger value="chapters" className="flex-1">Capitoli e Foto</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 min-h-[50vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome della galleria</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es. Matrimonio Marco e Giulia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data evento</Label>
                <Input
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Es. 12 Giugno 2023"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Luogo</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Es. Villa Reale, Monza"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrizione opzionale dell'evento"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="coverImage">Immagine di copertina</Label>
              <div className="mt-1">
                <Input
                  id="coverImage"
                  type="file"
                  accept="image/*"
                  ref={coverInputRef}
                  onChange={handleCoverImageChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Scegli un'immagine di copertina per la tua galleria. Dimensione consigliata: 1920x600px.
                </p>
                
                {coverPreview && (
                  <div className="mt-2 border rounded-md overflow-hidden">
                    <div className="relative">
                      <img 
                        src={coverPreview} 
                        alt="Anteprima copertina" 
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setCoverImage(null);
                          setCoverPreview(null);
                          setCoverImageUrl("");
                        }}
                      >
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password galleria</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  type="button"
                  onClick={() => {
                    // Genera una password casuale (8 caratteri alfanumerici)
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                    let newPassword = '';
                    for (let i = 0; i < 8; i++) {
                      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    setPassword(newPassword);
                  }}
                  className="text-xs"
                >
                  Genera password
                </Button>
              </div>
              <div className="relative flex items-center">
                <Input
                  id="password"
                  type="text" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password per l'accesso alla galleria"
                  className="pr-16"
                />
                {password && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 h-full px-2"
                    onClick={() => {
                      // Copia la password negli appunti
                      navigator.clipboard.writeText(password);
                      toast({
                        title: "Password copiata",
                        description: "La password è stata copiata negli appunti",
                      });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002-2h2a2 2 0 002 2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Questa password verrà utilizzata per proteggere l'accesso alla galleria. Puoi generare una password casuale o inserirne una personalizzata.
              </p>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={onClose}
                className="mr-2"
              >
                Annulla
              </Button>
              <Button
                onClick={saveGallery}
                disabled={isLoading}
              >
                {isLoading ? "Salvataggio in corso..." : "Salva modifiche"}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="chapters" className="min-h-[50vh]">
            {isChaptersLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage"></div>
              </div>
            ) : (
              <>
                <ChaptersManager
                  photos={photos}
                  onPhotosUpdate={setPhotos}
                  chapters={chapters}
                  onChaptersUpdate={setChapters}
                />
                
                <DialogFooter className="mt-6">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="mr-2"
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={saveChaptersAndPhotos}
                    disabled={isLoading}
                  >
                    {isLoading ? "Salvataggio in corso..." : "Salva capitoli"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}