import { useState, useRef, ChangeEvent, FormEvent, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { db, storage, auth } from "@/lib/firebase";
import { insertGallerySchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { FileUpload } from "@/components/ui/file-upload";
import ChaptersModal from "@/components/ChaptersModal";
import { Chapter, PhotoWithChapter } from "@/components/ChaptersManager";
import { uploadPhotos as uploadPhotosOptimized, UploadSummary } from "@/lib/photoUploader";
import { LoaderCircle } from "lucide-react";

interface NewGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewGalleryModal({ isOpen, onClose }: NewGalleryModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [creationStep, setCreationStep] = useState<"editing" | "uploading" | "complete">("editing");
  const [progress, setProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stati per la gestione dei capitoli
  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [photosWithChapters, setPhotosWithChapters] = useState<PhotoWithChapter[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  // Resetta gli stati quando il modale principale viene chiuso
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setPreviews([]);
      setCoverImage(null);
      setCoverPreview(null);
      setPhotosWithChapters([]);
      setChapters([]);
      setShowChaptersModal(false);
    }
  }, [isOpen]);
  
  // Gestisce il caricamento dell'immagine di copertina
  const handleCoverImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setCoverImage(null);
      setCoverPreview(null);
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
  
  // Converte i file in PhotoWithChapter quando i file cambiano
  useEffect(() => {
    const newPhotosWithChapters: PhotoWithChapter[] = selectedFiles.map((file, index) => ({
      id: `photo_${Date.now()}_${index}`,
      file,
      url: previews[index] || URL.createObjectURL(file),
      name: file.name,
      position: index,
    }));
    
    setPhotosWithChapters(newPhotosWithChapters);
  }, [selectedFiles, previews]);

  const form = useForm({
    resolver: zodResolver(insertGallerySchema.extend({
      description: z.string().optional(),
    })),
    defaultValues: {
      name: "",
      code: "",
      password: "",
      date: "",
      location: "",
      description: "",
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "File non validi",
        description: "Sono stati rimossi i file non validi o troppo grandi (max 10MB).",
        variant: "destructive",
      });
    }
    
    setSelectedFiles(validFiles);
    
    // Create previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(current => [...newPreviews]);
    
    // Clean up previous preview URLs
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  };

  // Funzione di upload ottimizzata
  const uploadPhotos = async (galleryId: string, files: File[]) => {
    console.log(`Avvio caricamento ottimizzato di ${files.length} foto`);
    setCreationStep("uploading");
    
    try {
      // Utilizza il caricatore ottimizzato con gestione del progresso
      const uploadedPhotos = await uploadPhotosOptimized(
        galleryId,
        files,
        6, // concurrency
        () => {}, // Aggiornamenti individuali dei file non necessari qui
        (summary) => {
          // Aggiorna informazioni di progresso globali
          setUploadProgress(summary);
          
          // Aggiorna il progresso di upload generale
          setProgress(Math.round(summary.avgProgress));
        }
      );
      
      console.log(`Completato il caricamento di ${uploadedPhotos.length} foto`);
      return uploadedPhotos;
    } catch (error) {
      console.error("Errore durante il caricamento delle foto:", error);
      toast({
        title: "Errore di caricamento",
        description: "Si è verificato un errore durante il caricamento delle foto. Riprova.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Gestisce la prima fase: raccolta dati e passaggio al modale dei capitoli
  const handleFirstStep = (data: any) => {
    // Verifica che l'utente sia autenticato
    if (!auth.currentUser) {
      console.error("Utente non autenticato");
      toast({
        title: "Errore di autorizzazione",
        description: "Devi essere autenticato per creare una galleria.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedFiles.length === 0) {
      toast({
        title: "Foto richieste",
        description: "Carica almeno una foto nella galleria",
        variant: "destructive"
      });
      return;
    }
    
    // Passa al modale dei capitoli
    setShowChaptersModal(true);
  };
  
  // Gestisce la creazione completa della galleria dopo l'organizzazione in capitoli
  const onSubmit = async (data: any) => {
    try {
      setUploading(true);
      
      // Verifica che l'utente sia autenticato
      if (!auth.currentUser) {
        console.error("Utente non autenticato");
        toast({
          title: "Errore di autorizzazione",
          description: "Devi essere autenticato per creare una galleria.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }
      
      // Se abbiamo selezionato un'immagine di copertina, la carichiamo prima
      let coverImageUrl = "";
      if (coverImage) {
        try {
          const storageRef = ref(storage, `galleries/covers/${data.code}_cover`);
          await uploadBytesResumable(storageRef, coverImage);
          coverImageUrl = await getDownloadURL(storageRef);
          console.log("Immagine di copertina caricata:", coverImageUrl);
        } catch (error) {
          console.error("Errore nell'upload della copertina:", error);
          // Continuiamo comunque con la creazione della galleria
        }
      }
      
      // Create gallery document first
      const galleryData = {
        name: data.name,
        code: data.code,
        password: data.password,
        date: data.date,
        location: data.location,
        description: data.description || "",
        coverImageUrl,
        createdAt: serverTimestamp(),
        photoCount: selectedFiles.length,
        hasChapters: chapters.length > 0,
        active: true,
        createdBy: auth.currentUser.email,
      };
      
      console.log("Creazione galleria con dati:", galleryData);
      const galleryRef = await addDoc(collection(db, "galleries"), galleryData);
      
      // Se ci sono capitoli, li salviamo nel database
      if (chapters.length > 0) {
        const batch = writeBatch(db);
        
        // Salva i capitoli
        chapters.forEach(chapter => {
          const chapterRef = doc(collection(db, "galleries", galleryRef.id, "chapters"));
          batch.set(chapterRef, {
            title: chapter.title,
            description: chapter.description || "",
            position: chapter.position,
            createdAt: serverTimestamp()
          });
        });
        
        await batch.commit();
      }
      
      // Upload photos if any are selected
      if (selectedFiles.length > 0) {
        try {
          // Usiamo il metodo ottimizzato di upload
          const uploadedPhotos = await uploadPhotos(galleryRef.id, selectedFiles);
          
          // Cambio stato a finalizzazione
          setCreationStep("complete");
          setProgress(0); // Reset progresso per la fase di scrittura dati
          
          // Add photos to the photos subcollection with chapter info
          const photosCollectionRef = collection(db, "galleries", galleryRef.id, "photos");
          
          // Usa batching per migliorare le prestazioni di scrittura database
          const BATCH_SIZE = 500; // Firestore ha un limite di 500 operazioni per batch
          
          console.log(`Scrivendo ${uploadedPhotos.length} documenti foto nel database in batch`);
          
          // Suddividi le foto in batch di massimo 500
          const totalBatches = Math.ceil(uploadedPhotos.length / BATCH_SIZE);
          
          for (let i = 0; i < uploadedPhotos.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const currentBatch = uploadedPhotos.slice(i, i + BATCH_SIZE);
            const currentBatchNumber = Math.floor(i/BATCH_SIZE) + 1;
            
            // Aggiorna progresso di scrittura
            setProgress(Math.round((currentBatchNumber / totalBatches) * 100));
            
            currentBatch.forEach((photo, index) => {
              // Implementiamo una strategia di corrispondenza migliorata per trovare il capitolo corretto
              // 1. Cerca per nome file esatto
              // 2. Cerca per nome file senza percorso 
              // 3. Cerca per nome file normalizzato (senza spazi, case insensitive)
              // 4. Cerca per somiglianza del nome
              
              let photoWithChapter = photosWithChapters.find(p => p.name === photo.name);
              
              if (!photoWithChapter) {
                // Estrai solo il nome del file senza percorso
                const fileName = photo.name.split('/').pop() || photo.name;
                
                // Prova a cercare per nome file senza percorso
                photoWithChapter = photosWithChapters.find(p => {
                  const pFileName = p.name.split('/').pop() || p.name;
                  return pFileName === fileName;
                });
                
                // Se ancora non trovato, prova con normalizzazione (senza spazi, minuscolo)
                if (!photoWithChapter) {
                  const normalizedFileName = fileName.toLowerCase().replace(/\s+/g, '');
                  photoWithChapter = photosWithChapters.find(p => {
                    const pFileName = (p.name.split('/').pop() || p.name).toLowerCase().replace(/\s+/g, '');
                    return pFileName === normalizedFileName;
                  });
                  
                  // Ultima risorsa: cerca per similitudine (il nome termina con)
                  if (!photoWithChapter) {
                    photoWithChapter = photosWithChapters.find(p => p.name.endsWith(fileName));
                  }
                }
              }
              
              // Logging per debug
              if (index === 0 || index === currentBatch.length - 1) {
                if (photoWithChapter) {
                  console.log(`Foto ${photo.name} associata al capitolo ${photoWithChapter.chapterId}`);
                } else {
                  console.log(`⚠️ Foto ${photo.name} non ha trovato corrispondenza`);
                }
              }
              
              const docRef = doc(photosCollectionRef);
              
              batch.set(docRef, {
                ...photo,
                chapterId: photoWithChapter?.chapterId || null,
                chapterPosition: photoWithChapter?.position || (i + index),
                folderPath: photoWithChapter?.folderPath || null
              });
            });
            
            console.log(`Committando batch ${currentBatchNumber}/${totalBatches} (${currentBatch.length} foto)`);
            await batch.commit();
          }
          
          console.log("Tutti i batch di foto sono stati caricati con successo");
        } catch (error) {
          console.error("Errore durante il processo di caricamento o salvataggio delle foto:", error);
          toast({
            title: "Errore di salvataggio",
            description: "Si è verificato un errore durante il salvataggio della galleria. Riprova.",
            variant: "destructive",
          });
          throw error;
        }
      }
      
      toast({
        title: "Galleria creata",
        description: `Galleria "${data.name}" creata con successo${chapters.length > 0 ? ' con ' + chapters.length + ' capitoli' : ''}.`,
      });
      
      // Reset form and state
      form.reset();
      setSelectedFiles([]);
      setPreviews([]);
      setPhotosWithChapters([]);
      setChapters([]);
      setShowChaptersModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      onClose();
    } catch (error) {
      console.error("Error creating gallery:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della galleria.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modale principale per l'inserimento dei dati della galleria */}
      <div className={`fixed inset-0 z-50 overflow-y-auto ${showChaptersModal ? 'hidden' : ''}`}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            <div>
              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-blue-gray font-playfair" id="modal-title">
                  Crea Nuova Galleria
                </h3>
                <div className="mt-6">
                  <form onSubmit={form.handleSubmit(handleFirstStep)}>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="name">Nome Galleria</Label>
                        <div className="mt-1">
                          <Input
                            id="name"
                            placeholder="Es. Maria & Luca - Matrimonio"
                            {...form.register("name")}
                          />
                          {form.formState.errors.name && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="code">Codice Galleria</Label>
                        <div className="mt-1">
                          <Input
                            id="code"
                            placeholder="Es. maria-luca-2023"
                            {...form.register("code")}
                          />
                          <p className="mt-1 text-xs text-gray-500">Questo codice sarà utilizzato nell'URL della galleria.</p>
                          {form.formState.errors.code && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.code.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="mt-1">
                          <Input
                            type="password"
                            id="password"
                            {...form.register("password")}
                          />
                          <p className="mt-1 text-xs text-gray-500">Password per accedere alla galleria.</p>
                          {form.formState.errors.password && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="date">Data Evento</Label>
                        <div className="mt-1">
                          <Input
                            type="date"
                            id="date"
                            {...form.register("date")}
                          />
                          {form.formState.errors.date && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.date.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="location">Luogo</Label>
                        <div className="mt-1">
                          <Input
                            id="location"
                            placeholder="Es. Villa Bella, Toscana"
                            {...form.register("location")}
                          />
                          {form.formState.errors.location && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.location.message}</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Descrizione (opzionale)</Label>
                        <div className="mt-1">
                          <Textarea
                            id="description"
                            placeholder="Inserisci una breve descrizione della galleria"
                            {...form.register("description")}
                            rows={3}
                          />
                          <p className="mt-1 text-xs text-gray-500">Una breve descrizione che sarà visibile nella pagina della galleria.</p>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="coverImage">Immagine di copertina (opzionale)</Label>
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
                              <img 
                                src={coverPreview} 
                                alt="Anteprima copertina" 
                                className="w-full h-48 object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Carica Foto</Label>
                        <div className="mt-2">
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1">
                                <FileUpload
                                  onFilesSelected={(files: File[]) => {
                                    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
                                    const newPreviews = files.map(file => URL.createObjectURL(file));
                                    setPreviews(prevPreviews => [...prevPreviews, ...newPreviews]);
                                  }}
                                  multiple={true}
                                  maxFiles={1000}
                                  accept="image/*"
                                  currentFiles={selectedFiles}
                                  previews={previews}
                                  onRemoveFile={(index: number) => {
                                    if (index < selectedFiles.length) {
                                      const newFiles = [...selectedFiles];
                                      newFiles.splice(index, 1);
                                      setSelectedFiles(newFiles);
                                      
                                      const newPreviews = [...previews];
                                      URL.revokeObjectURL(newPreviews[index]);
                                      newPreviews.splice(index, 1);
                                      setPreviews(newPreviews);
                                    }
                                  }}
                                  enableCompression={true}
                                  enableFolderUpload={true}
                                  onChaptersExtracted={(result) => {
                                    console.log("Capitoli estratti dalle cartelle:", result.chapters);
                                    console.log("Foto con capitoli:", result.photosWithChapters.slice(0, 3), `...e altre ${result.photosWithChapters.length - 3}`);
                                    
                                    // Verifica che i capitoli e le foto siano associati correttamente
                                    const chapterCounts: Record<string, number> = {};
                                    result.chapters.forEach(chapter => {
                                      chapterCounts[chapter.id] = result.photosWithChapters.filter(p => p.chapterId === chapter.id).length;
                                    });
                                    console.log("Foto per capitolo:", chapterCounts);
                                    
                                    // Prepara le foto con informazioni sui capitoli, mantenendo il chapterId originale
                                    const photos: PhotoWithChapter[] = result.photosWithChapters.map((item, index) => {
                                      // Verifica che il chapterId sia definito e valido
                                      const validChapter = item.chapterId && result.chapters.some(c => c.id === item.chapterId);
                                      
                                      return {
                                        id: `temp-${index}`,
                                        file: item.file,
                                        url: URL.createObjectURL(item.file),
                                        name: item.file.name,
                                        chapterId: validChapter ? item.chapterId : undefined,
                                        position: item.position
                                      };
                                    });
                                    
                                    // Imposta i capitoli estratti
                                    setChapters(result.chapters);
                                    
                                    // Imposta le foto con i capitoli assegnati
                                    setPhotosWithChapters(photos);
                                    
                                    // Log per debug
                                    console.log(`PhotosWithChapters dopo l'assegnazione: ${photos.length} foto totali`);
                                    console.log(`- Foto con capitolo assegnato: ${photos.filter(p => p.chapterId).length}`);
                                    console.log(`- Foto senza capitolo assegnato: ${photos.filter(p => !p.chapterId).length}`);
                                    
                                    // Imposta anche i file selezionati e previews
                                    setSelectedFiles(result.photosWithChapters.map(p => p.file));
                                    
                                    // Crea le anteprime
                                    const newPreviews = photos.map(p => p.url);
                                    setPreviews(newPreviews);
                                    
                                    // Mostra un toast di conferma
                                    toast({
                                      title: "Capitoli rilevati",
                                      description: `${result.chapters.length} capitoli estratti automaticamente dalle cartelle.`,
                                    });
                                  }}
                                />
                              </div>
                            </div>
                            
                            {chapters.length > 0 && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                <div className="text-sm text-green-700 flex items-center">
                                  <span className="mr-2">✓</span>
                                  <span>
                                    <strong>{chapters.length} capitoli</strong> creati automaticamente dalle cartelle:
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {chapters.map(chapter => (
                                    <span key={chapter.id} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                      {chapter.title}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Indicatore di progresso caricamento */}
                    {uploading && (
                      <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm font-medium">
                              {creationStep === "uploading" 
                                ? `Caricamento foto (${progress}%)` 
                                : "Finalizzazione galleria..."}
                            </span>
                          </div>
                          {uploadProgress && (
                            <span className="text-xs text-muted-foreground">
                              {uploadProgress.completed}/{uploadProgress.total} foto
                            </span>
                          )}
                        </div>
                        
                        <Progress value={progress} className="h-2 w-full" />
                        
                        {uploadProgress && (
                          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                            <span>
                              {Math.round(uploadProgress.uploadedSize / 1024 / 1024)} / {Math.round(uploadProgress.totalSize / 1024 / 1024)} MB
                            </span>
                            <span>
                              {uploadProgress.failed > 0 && (
                                <span className="text-red-500">{uploadProgress.failed} errori</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                      <Button
                        type="submit"
                        disabled={uploading || selectedFiles.length === 0}
                        className="w-full sm:col-start-2 btn-primary"
                      >
                        Avanti: Organizza Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={uploading}
                        className="mt-3 w-full sm:mt-0 sm:col-start-1"
                      >
                        Annulla
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modale per l'organizzazione dei capitoli */}
      <ChaptersModal
        isOpen={showChaptersModal}
        onClose={() => setShowChaptersModal(false)}
        photos={photosWithChapters}
        onPhotosUpdate={setPhotosWithChapters}
        chapters={chapters}
        onChaptersUpdate={setChapters}
        onSave={() => form.handleSubmit(onSubmit)()}
      />
    </>
  );
}
