import { useState, useEffect, Fragment } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, collectionGroup, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { db, storage, auth } from "@/lib/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatPasswordRequestsForExcel, exportToExcel } from "@/lib/excelExport";
import { ref, listAll, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";
import Navigation from "@/components/Navigation";
import NewGalleryModal from "@/components/NewGalleryModal";
import EditGalleryModal from "@/components/EditGalleryModal";
import SlideshowManager from "@/components/SlideshowManager";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";

interface GalleryItem {
  id: string;
  name: string;
  code: string;
  date: string;
  active: boolean;
  photoCount: number;
  createdAt: any;
}

interface StudioSettings {
  name: string;
  slogan: string;
  address: string;
  phone: string;
  email: string;
  websiteUrl: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  about: string;
  logo?: string;
}

export default function AdminDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<GalleryItem | null>(null);
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'galleries' | 'slideshow' | 'requests' | 'settings'>('galleries');
  const [studioSettings, setStudioSettings] = useState<StudioSettings>({
    name: '',
    slogan: '',
    address: '',
    phone: '',
    email: '',
    websiteUrl: '',
    socialLinks: {
      facebook: '',
      instagram: '',
      twitter: ''
    },
    about: '',
    logo: ''
  });
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication
  useEffect(() => {
    // Verifica se esiste un flag isAdmin nel localStorage
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate("/admin");
    }
  }, [navigate]);

  // Fetch data (galleries, password requests and studio settings)
  useEffect(() => {
    async function loadAllData() {
      // Carica gallerie
      await fetchData();
      
      // Carica richieste password
      try {
        const requestsCollection = collection(db, "passwordRequests");
        const requestsSnapshot = await getDocs(requestsCollection);
        
        const requestsList = requestsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.createdAt?.toDate?.() || new Date()
          };
        });
        
        // Sort by creation date, newest first
        requestsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setPasswordRequests(requestsList);
        console.log(`Caricate ${requestsList.length} richieste di password`);
      } catch (error) {
        console.error("Error fetching password requests:", error);
      }
      
      // Carica impostazioni studio
      try {
        setIsSettingsLoading(true);
        const settingsDoc = doc(db, "settings", "studio");
        const settingsSnapshot = await getDoc(settingsDoc);
        
        if (settingsSnapshot.exists()) {
          const settingsData = settingsSnapshot.data() as StudioSettings;
          setStudioSettings(settingsData);
        }
      } catch (error) {
        console.error("Error fetching studio settings:", error);
      } finally {
        setIsSettingsLoading(false);
      }
    }
    
    if (auth.currentUser) {
      loadAllData();
    }
  }, []);
  
  // Funzione per gestire il cambio di valore nei campi delle impostazioni
  const handleSettingsChange = (
    field: string, 
    value: string,
    nestedField?: string
  ) => {
    if (nestedField) {
      setStudioSettings(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof StudioSettings] as object,
          [nestedField]: value
        }
      }));
    } else {
      setStudioSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  // Funzione per gestire l'upload del logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    // Accetta solo immagini
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo di file non supportato",
        description: "Seleziona un'immagine (PNG, JPG o SVG)",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Riferimento allo storage per il logo
      const logoRef = ref(storage, `settings/logo`);
      
      // Upload del file
      await uploadBytes(logoRef, file);
      
      // Ottieni URL di download
      const downloadUrl = await getDownloadURL(logoRef);
      
      // Aggiorna lo stato delle impostazioni
      setStudioSettings(prev => ({
        ...prev,
        logo: downloadUrl
      }));
      
      toast({
        title: "Logo caricato",
        description: "Il logo è stato caricato con successo."
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento del logo.",
        variant: "destructive"
      });
    }
  };
  
  // Funzione per salvare le impostazioni dello studio
  const saveStudioSettings = async () => {
    try {
      const settingsRef = doc(db, "settings", "studio");
      await setDoc(settingsRef, studioSettings);
      
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni dello studio sono state salvate con successo."
      });
    } catch (error) {
      console.error("Error saving studio settings:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nel salvataggio delle impostazioni.",
        variant: "destructive"
      });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Refresh the gallery list
    fetchData();
  };
  
  const openEditModal = (gallery: GalleryItem) => {
    setSelectedGallery(gallery);
    setIsEditModalOpen(true);
  };
  
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedGallery(null);
    // Refresh the gallery list
    fetchData();
  };
  
  // Funzione di fetch data da usare anche dopo le modifiche
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Carica gallerie
      const galleriesCollection = collection(db, "galleries");
      const gallerySnapshot = await getDocs(galleriesCollection);
      
      const galleryList = gallerySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryItem[];
      
      // Sort by creation date, newest first
      galleryList.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setGalleries(galleryList);
      
      console.log(`Caricate ${galleryList.length} gallerie dal database`);
      console.log("Elenco gallerie:", galleryList.map(g => g.name).join(", "));
    } catch (error) {
      console.error("Error fetching galleries:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nel caricamento delle gallerie.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Esporta le richieste di password in un file Excel
  const exportPasswordRequests = () => {
    try {
      if (passwordRequests.length === 0) {
        toast({
          title: "Nessun dato da esportare",
          description: "Non ci sono richieste di password da esportare.",
          variant: "destructive"
        });
        return;
      }
      
      // Formatta i dati per l'export
      const formattedData = formatPasswordRequestsForExcel(passwordRequests);
      
      // Genera nome file con data corrente
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // formato YYYY-MM-DD
      const fileName = `richieste_password_${dateStr}.xlsx`;
      
      // Esporta in Excel
      exportToExcel(formattedData, fileName, "Richieste Password");
      
      toast({
        title: "Esportazione completata",
        description: `Le richieste sono state esportate in ${fileName}`,
      });
    } catch (error) {
      console.error("Errore durante l'esportazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'esportazione delle richieste.",
        variant: "destructive"
      });
    }
  };

  const toggleGalleryStatus = async (gallery: GalleryItem) => {
    try {
      const galleryRef = doc(db, "galleries", gallery.id);
      await updateDoc(galleryRef, {
        active: !gallery.active
      });
      
      // Update local state
      setGalleries(prev => 
        prev.map(g => g.id === gallery.id ? { ...g, active: !g.active } : g)
      );
      
      toast({
        title: gallery.active ? "Galleria disattivata" : "Galleria attivata",
        description: `La galleria "${gallery.name}" è stata ${gallery.active ? "disattivata" : "attivata"} con successo.`
      });
    } catch (error) {
      console.error("Error toggling gallery status:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile modificare lo stato della galleria.",
        variant: "destructive",
      });
    }
  };

  const deleteGallery = async (gallery: GalleryItem) => {
    if (!window.confirm(`Sei sicuro di voler eliminare la galleria "${gallery.name}"? Questa operazione rimuoverà TUTTE le foto e non può essere annullata.`)) {
      return;
    }
    
    try {
      // 1. Elimina le foto dallo Storage
      try {
        // Percorso nella cartella di Storage per questa galleria
        const storageRef = ref(storage, `galleries/${gallery.id}`);
        console.log("Eliminazione file dallo storage path:", `galleries/${gallery.id}`);
        
        // Elenca tutti i file nella cartella
        const listResult = await listAll(storageRef);
        
        // Elimina tutti i file uno per uno
        const deletePromises = listResult.items.map(async (itemRef) => {
          console.log("Eliminazione file:", itemRef.fullPath);
          return deleteObject(itemRef);
        });
        
        // Attendi che tutte le eliminazioni siano completate
        await Promise.all(deletePromises);
        console.log(`Eliminati ${deletePromises.length} file dallo storage`);
      } catch (storageError) {
        console.error("Errore durante l'eliminazione dei file dallo storage:", storageError);
        // Continuiamo comunque con l'eliminazione del documento
      }
      
      // 2. Elimina eventuali sottocollezioni
      try {
        // Ottieni la sottocollezione 'photos'
        const photosRef = collection(db, "galleries", gallery.id, "photos");
        const photosSnapshot = await getDocs(photosRef);
        
        // Elimina tutti i documenti nella sottocollezione
        const deletePhotoDocsPromises = photosSnapshot.docs.map(photoDoc => 
          deleteDoc(doc(db, "galleries", gallery.id, "photos", photoDoc.id))
        );
        
        await Promise.all(deletePhotoDocsPromises);
        console.log(`Eliminati ${deletePhotoDocsPromises.length} documenti di foto`);
      } catch (subCollectionError) {
        console.error("Errore durante l'eliminazione delle sottocollezioni:", subCollectionError);
        // Continuiamo comunque con l'eliminazione del documento principale
      }
      
      // 3. Elimina il documento principale della galleria
      await deleteDoc(doc(db, "galleries", gallery.id));
      
      // 4. Aggiorna lo stato locale
      setGalleries(prev => prev.filter(g => g.id !== gallery.id));
      
      toast({
        title: "Galleria eliminata",
        description: `La galleria "${gallery.name}" e tutte le sue foto sono state eliminate con successo.`
      });
    } catch (error) {
      console.error("Error deleting gallery:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile eliminare completamente la galleria. Alcune risorse potrebbero essere rimaste.",
        variant: "destructive",
      });
    }
  };
  
  // Funzione per generare una password casuale
  const generateRandomPassword = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Funzione per cambiare rapidamente la password di una galleria
  const changeGalleryPassword = async (galleryId: string, newPassword: string) => {
    const galleryRef = doc(db, "galleries", galleryId);
    
    try {
      await updateDoc(galleryRef, {
        password: newPassword
      });
      
      toast({
        title: "Password aggiornata",
        description: "La password della galleria è stata aggiornata con successo."
      });
      
      // Update local state
      fetchData();
      
      return true;
    } catch (error) {
      console.error("Error changing gallery password:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della password.",
        variant: "destructive"
      });
      
      return false;
    }
  };

  // Verifica se l'utente è autenticato
  if (!currentUser && !localStorage.getItem('isAdmin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-off-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage mx-auto"></div>
          <p className="mt-4 text-blue-gray">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white">
      <Navigation isAdminNav={true} />

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-blue-gray font-playfair sm:text-3xl sm:truncate">
                Pannello Amministrazione
              </h2>
            </div>
            <div className="mt-4 flex space-x-4 md:mt-0 md:ml-4">
              <Button 
                onClick={() => navigate("/")}
                variant="outline"
                className="px-4 py-2"
              >
                Vai al sito
              </Button>
              {activeTab === 'galleries' && (
                <Button 
                  onClick={openModal}
                  className="btn-primary px-4 py-2"
                >
                  Nuova Galleria
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 overflow-x-auto pb-1">
          <div className="flex whitespace-nowrap">
            <button
              className={`py-4 px-3 mr-4 border-b-2 font-medium text-sm ${activeTab === 'galleries' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('galleries')}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Gestione Gallerie</span>
                <span className="sm:hidden">Gallerie</span>
              </span>
            </button>
            <button
              className={`py-4 px-3 mr-4 border-b-2 font-medium text-sm ${activeTab === 'slideshow' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('slideshow')}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Slideshow Homepage</span>
                <span className="sm:hidden">Slideshow</span>
              </span>
            </button>
            <button
              className={`py-4 px-3 mr-4 border-b-2 font-medium text-sm ${activeTab === 'requests' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('requests')}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="hidden sm:inline">Richieste Password</span>
                <span className="sm:hidden">Richieste</span>
              </span>
            </button>
            <button
              className={`py-4 px-3 mr-4 border-b-2 font-medium text-sm ${activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Impostazioni Studio</span>
                <span className="sm:hidden">Impostazioni</span>
              </span>
            </button>
          </div>
        </div>
        
        {/* Galleries Tab */}
        {activeTab === 'galleries' && (
          <div>
            <div className="px-4 sm:px-0">
              <h3 className="text-xl font-medium text-blue-gray font-playfair">Le tue gallerie</h3>
              <p className="mt-1 text-sm text-gray-500">
                Gestisci le tue gallerie fotografiche private
              </p>
            </div>

            <div className="mt-5 bg-white shadow overflow-hidden sm:rounded-md">
              {isLoading ? (
                <div className="p-4 sm:p-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="mb-4">
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-6 w-4/5" />
                    </div>
                  ))}
                </div>
              ) : galleries.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">Non hai ancora creato gallerie.</p>
                  <Button 
                    onClick={openModal}
                    className="mt-4 btn-primary px-4 py-2"
                  >
                    Crea la tua prima galleria
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {galleries.map(gallery => (
                    <li key={gallery.id}>
                      <div className="block hover:bg-gray-50">
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-gray truncate">
                              {gallery.name}
                            </p>
                            <div className="ml-2 flex-shrink-0 flex items-center space-x-2 flex-wrap justify-end">
                              <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${gallery.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {gallery.active ? 'Attiva' : 'Disattivata'}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleGalleryStatus(gallery)}
                                className="mb-1 md:mb-0"
                              >
                                {gallery.active ? 'Disattiva' : 'Attiva'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/gallery/${gallery.code}`)}
                                className="mb-1 md:mb-0"
                              >
                                Visualizza
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(gallery)}
                                className="mb-1 md:mb-0"
                              >
                                Modifica
                              </Button>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mb-1 md:mb-0"
                                  >
                                    Password
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-4">
                                    <h4 className="font-medium">Modifica password</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Genera una nuova password o imposta una password personalizzata per questa galleria.
                                    </p>
                                    <div className="space-y-2">
                                      <Label htmlFor={`password-${gallery.id}`}>Password personalizzata</Label>
                                      <div className="flex gap-2">
                                        <Input 
                                          id={`password-${gallery.id}`} 
                                          placeholder="Inserisci password" 
                                          defaultValue=""
                                          onChange={(e) => {
                                            // Salva il valore nel DOM per recuperarlo al clic
                                            e.currentTarget.dataset.value = e.currentTarget.value;
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            // Recupera il valore dal campo
                                            const input = document.getElementById(`password-${gallery.id}`) as HTMLInputElement;
                                            const value = input.value || input.dataset.value;
                                            if (value) {
                                              changeGalleryPassword(gallery.id, value);
                                            } else {
                                              toast({
                                                title: "Errore",
                                                description: "Inserisci una password valida.",
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          Salva
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const newPassword = generateRandomPassword();
                                          changeGalleryPassword(gallery.id, newPassword);
                                          // Copia negli appunti
                                          navigator.clipboard.writeText(newPassword);
                                          toast({
                                            title: "Password copiata",
                                            description: "La nuova password è stata copiata negli appunti."
                                          });
                                        }}
                                        className="w-full"
                                      >
                                        Genera e salva automaticamente
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteGallery(gallery)}
                                className="mb-1 md:mb-0"
                              >
                                Elimina
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clipRule="evenodd" />
                                </svg>
                                {gallery.photoCount} foto
                              </p>
                              <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                Creata il {gallery.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <p>
                                Codice: {gallery.code}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        
        {/* Slideshow Tab */}
        {activeTab === 'slideshow' && (
          <div>
            <div className="px-4 sm:px-0 mb-6">
              <h3 className="text-lg font-medium text-blue-gray font-playfair">Slideshow Homepage</h3>
              <p className="mt-1 text-sm text-gray-500">
                Gestisci le immagini che verranno mostrate nella slideshow della homepage
              </p>
            </div>
            
            <SlideshowManager />
          </div>
        )}

        {/* Password Requests Tab */}
        {activeTab === 'requests' && (
          <div>
            <div className="px-4 sm:px-0 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-blue-gray font-playfair">Richieste Password</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Visualizza tutte le richieste di password effettuate dagli utenti
                  </p>
                </div>
                <Button 
                  onClick={exportPasswordRequests}
                  variant="outline"
                  className="flex items-center space-x-1"
                  disabled={passwordRequests.length === 0 || isLoading}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Esporta Excel</span>
                </Button>
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {isLoading ? (
                <div className="p-6 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage"></div>
                </div>
              ) : passwordRequests.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nessuna richiesta di password trovata
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {passwordRequests.map((request) => (
                    <li key={request.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-blue-gray truncate">
                            {request.firstName} {request.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.email}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <p className="text-sm font-medium text-blue-gray">
                            {request.galleryName || "Galleria sconosciuta"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.timestamp?.toLocaleString() || "Data sconosciuta"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="text-gray-500">Relazione: </span>
                            <span className="font-medium">{request.relation}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Stato: </span>
                            <span className="font-medium">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Completata
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        
        {/* Studio Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <div className="px-4 sm:px-0 mb-6">
              <h3 className="text-lg font-medium text-blue-gray font-playfair">Impostazioni Studio</h3>
              <p className="mt-1 text-sm text-gray-500">
                Personalizza le informazioni del tuo studio fotografico mostrate nel sito
              </p>
            </div>

            <div className="space-y-6">
              {isSettingsLoading ? (
                <div className="p-6 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage"></div>
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Informazioni di base</CardTitle>
                      <CardDescription>Inserisci le informazioni principali del tuo studio fotografico</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="studioName">Nome dello studio</Label>
                          <Input 
                            id="studioName" 
                            value={studioSettings.name} 
                            onChange={(e) => handleSettingsChange('name', e.target.value)}
                            placeholder="Es. Studio Fotografico Rossi"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="studioSlogan">Slogan / Tagline</Label>
                          <Input 
                            id="studioSlogan" 
                            value={studioSettings.slogan} 
                            onChange={(e) => handleSettingsChange('slogan', e.target.value)}
                            placeholder="Es. Catturiamo i momenti più belli della vita"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="studioAbout">Chi siamo</Label>
                        <Textarea 
                          id="studioAbout" 
                          value={studioSettings.about} 
                          onChange={(e) => handleSettingsChange('about', e.target.value)}
                          placeholder="Inserisci una breve descrizione del tuo studio"
                          rows={4}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="studioLogo">Logo dello studio</Label>
                        <div className="flex items-start space-x-4">
                          {studioSettings.logo && (
                            <div className="w-24 h-24 border rounded overflow-hidden">
                              <img 
                                src={studioSettings.logo} 
                                alt="Logo dello studio" 
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <Input 
                              id="studioLogo" 
                              type="file" 
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Formato consigliato: PNG o SVG con sfondo trasparente, max 500KB
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Contatti</CardTitle>
                      <CardDescription>Informazioni di contatto mostrate sul sito</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="studioAddress">Indirizzo</Label>
                          <Input 
                            id="studioAddress" 
                            value={studioSettings.address} 
                            onChange={(e) => handleSettingsChange('address', e.target.value)}
                            placeholder="Es. Via Roma 123, Milano"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="studioPhone">Telefono</Label>
                          <Input 
                            id="studioPhone" 
                            value={studioSettings.phone} 
                            onChange={(e) => handleSettingsChange('phone', e.target.value)}
                            placeholder="Es. +39 123 456 7890"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="studioEmail">Email</Label>
                          <Input 
                            id="studioEmail" 
                            type="email"
                            value={studioSettings.email} 
                            onChange={(e) => handleSettingsChange('email', e.target.value)}
                            placeholder="Es. info@studiofotografico.it"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="studioWebsite">Sito Web</Label>
                          <Input 
                            id="studioWebsite" 
                            value={studioSettings.websiteUrl} 
                            onChange={(e) => handleSettingsChange('websiteUrl', e.target.value)}
                            placeholder="Es. https://www.studiofotografico.it"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Social Media</CardTitle>
                      <CardDescription>I tuoi profili social (lascia vuoto se non utilizzati)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="studioFacebook">Facebook</Label>
                          <Input 
                            id="studioFacebook" 
                            value={studioSettings.socialLinks.facebook || ''} 
                            onChange={(e) => handleSettingsChange('socialLinks', e.target.value, 'facebook')}
                            placeholder="Es. https://facebook.com/tuostudio"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="studioInstagram">Instagram</Label>
                          <div className="space-y-1">
                            <Input 
                              id="studioInstagram" 
                              value={studioSettings.socialLinks.instagram || ''} 
                              onChange={(e) => {
                                // Rimuovi eventuali URL completi e prendi solo lo username
                                const value = e.target.value;
                                const usernameOnly = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
                                handleSettingsChange('socialLinks', usernameOnly, 'instagram');
                              }}
                              placeholder="Es. tuostudio (solo username, senza URL completo)"
                            />
                            <p className="text-xs text-muted-foreground">Inserisci solo lo username (es: "fotografo_mario"), non l'URL completo</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="studioTwitter">Twitter</Label>
                          <Input 
                            id="studioTwitter" 
                            value={studioSettings.socialLinks.twitter || ''} 
                            onChange={(e) => handleSettingsChange('socialLinks', e.target.value, 'twitter')}
                            placeholder="Es. https://twitter.com/tuostudio"
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={saveStudioSettings}
                        className="w-full md:w-auto"
                      >
                        Salva impostazioni
                      </Button>
                    </CardFooter>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <NewGalleryModal isOpen={isModalOpen} onClose={closeModal} />
      <EditGalleryModal isOpen={isEditModalOpen} onClose={closeEditModal} gallery={selectedGallery} />
    </div>
  );
}