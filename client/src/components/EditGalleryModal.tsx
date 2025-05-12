import { useState, useEffect } from "react";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  } | null;
}

export default function EditGalleryModal({ isOpen, onClose, gallery }: EditGalleryModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [photos, setPhotos] = useState<PhotoWithChapter[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isChaptersLoading, setIsChaptersLoading] = useState(false);
  const { toast } = useToast();

  // Carica i dati della galleria quando cambia
  useEffect(() => {
    if (gallery) {
      setName(gallery.name || "");
      setDate(gallery.date || "");
      setLocation(gallery.location || "");
      setDescription(gallery.description || "");
      setPassword(gallery.password || "");
      
      // Carica capitoli e foto
      loadChaptersAndPhotos();
    }
  }, [gallery]);
  
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
      const galleryRef = doc(db, "galleries", gallery.id);
      await updateDoc(galleryRef, {
        name,
        date,
        location,
        description,
        password
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
              <Label htmlFor="password">Password galleria</Label>
              <Input
                id="password"
                type="text" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password per l'accesso alla galleria"
              />
              <p className="text-sm text-gray-500">
                Questa password verrà utilizzata per proteggere l'accesso alla galleria.
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