import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { insertGallerySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

interface NewGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewGalleryModal({ isOpen, onClose }: NewGalleryModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
    resolver: zodResolver(insertGallerySchema),
    defaultValues: {
      name: "",
      code: "",
      password: "",
      date: "",
      location: "",
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

  const uploadPhotos = async (galleryId: string, files: File[]) => {
    const uploadedPhotos = [];
    
    for (const file of files) {
      const storageRef = ref(storage, `galleries/${galleryId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      try {
        // Wait for upload to complete
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            () => {},
            (error) => reject(error),
            () => resolve()
          );
        });
        
        // Get download URL
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        
        uploadedPhotos.push({
          name: file.name,
          url: downloadUrl,
          size: file.size,
          contentType: file.type,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
      }
    }
    
    return uploadedPhotos;
  };

  const onSubmit = async (data: any) => {
    try {
      setUploading(true);
      
      // Create gallery document first
      const galleryData = {
        name: data.name,
        code: data.code,
        password: data.password,
        date: data.date,
        location: data.location,
        createdAt: serverTimestamp(),
        photoCount: selectedFiles.length,
        active: true,
      };
      
      const galleryRef = await addDoc(collection(db, "galleries"), galleryData);
      
      // Upload photos if any are selected
      if (selectedFiles.length > 0) {
        const photos = await uploadPhotos(galleryRef.id, selectedFiles);
        
        // Add photos to the photos subcollection
        const photosCollectionRef = collection(db, "galleries", galleryRef.id, "photos");
        
        for (const photo of photos) {
          await addDoc(photosCollectionRef, photo);
        }
      }
      
      toast({
        title: "Galleria creata",
        description: "La galleria è stata creata con successo.",
      });
      
      // Reset form and state
      form.reset();
      setSelectedFiles([]);
      setPreviews([]);
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
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
                <form onSubmit={form.handleSubmit(onSubmit)}>
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
                      <Label>Carica Foto</Label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-gray hover:text-sage">
                              <span>Carica file</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                multiple
                                className="sr-only"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                              />
                            </label>
                            <p className="pl-1">o trascina qui</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, JPEG fino a 10MB
                          </p>
                        </div>
                      </div>
                      {previews.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {previews.map((preview, index) => (
                            <div key={index} className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden">
                              <img src={preview} alt={`Preview ${index + 1}`} className="object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <Button
                      type="submit"
                      disabled={uploading}
                      className="w-full sm:col-start-2 btn-primary"
                    >
                      {uploading ? "Creazione in corso..." : "Crea Galleria"}
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
  );
}
