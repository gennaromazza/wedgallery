import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navigation from "@/components/Navigation";
import NewGalleryModal from "@/components/NewGalleryModal";
import SlideshowManager from "@/components/SlideshowManager";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function AdminDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'galleries' | 'slideshow' | 'requests'>('galleries');
  const { currentUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication
  useEffect(() => {
    if (!currentUser) {
      navigate("/admin");
    }
  }, [currentUser, navigate]);

  // Fetch galleries
  useEffect(() => {
    async function fetchGalleries() {
      setIsLoading(true);
      try {
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
    }
    
    if (currentUser) {
      fetchGalleries();
    }
  }, [currentUser, toast]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Refresh the gallery list
    queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
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
    if (!window.confirm(`Sei sicuro di voler eliminare la galleria "${gallery.name}"? Questa operazione non può essere annullata.`)) {
      return;
    }
    
    try {
      // Delete the gallery document
      await deleteDoc(doc(db, "galleries", gallery.id));
      
      // Update local state
      setGalleries(prev => prev.filter(g => g.id !== gallery.id));
      
      toast({
        title: "Galleria eliminata",
        description: `La galleria "${gallery.name}" è stata eliminata con successo.`
      });
    } catch (error) {
      console.error("Error deleting gallery:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile eliminare la galleria.",
        variant: "destructive",
      });
    }
  };

  // If user is not authenticated
  if (!currentUser) {
    return null;
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
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'galleries' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('galleries')}
            >
              Gestione Gallerie
            </button>
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'slideshow' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('slideshow')}
            >
              Slideshow Homepage
            </button>
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('requests')}
            >
              Richieste Password
            </button>
          </div>
        </div>
        
        {/* Galleries Tab */}
        {activeTab === 'galleries' && (
          <div>
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium text-blue-gray font-playfair">Le tue gallerie</h3>
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
                            <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                              <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${gallery.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {gallery.active ? 'Attiva' : 'Disattivata'}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleGalleryStatus(gallery)}
                              >
                                {gallery.active ? 'Disattiva' : 'Attiva'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/gallery/${gallery.code}`)}
                              >
                                Visualizza
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteGallery(gallery)}
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
              <h3 className="text-lg font-medium text-blue-gray font-playfair">Richieste Password</h3>
              <p className="mt-1 text-sm text-gray-500">
                Visualizza tutte le richieste di password effettuate dagli utenti
              </p>
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
      </main>

      <NewGalleryModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}