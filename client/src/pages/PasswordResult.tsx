import { useState, useEffect } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PasswordResult() {
  const [, params] = useRoute('/password-result/:code');
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState<any>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    async function fetchGallery() {
      if (!params?.code) {
        navigate('/');
        return;
      }

      setLoading(true);
      try {
        // Cerca la galleria usando l'ID
        const galleriesRef = collection(db, 'galleries');
        const galleryDoc = doc(galleriesRef, params.code);
        const gallerySnap = await getDoc(galleryDoc);

        if (gallerySnap.exists()) {
          setGallery({
            id: gallerySnap.id,
            ...gallerySnap.data()
          });
        } else {
          console.log('Galleria non trovata con ID, provo con codice');
          
          // Se non troviamo per ID, proviamo a cercare per codice galleria
          const q = query(galleriesRef, where('code', '==', params.code));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const galleryData = querySnapshot.docs[0];
            setGallery({
              id: galleryData.id,
              ...galleryData.data()
            });
          } else {
            toast({
              title: 'Errore',
              description: 'Galleria non trovata',
              variant: 'destructive'
            });
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Error fetching gallery:', error);
        toast({
          title: 'Errore',
          description: 'Si è verificato un errore nel recupero della galleria',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchGallery();
  }, [params?.code, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-sage border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-2xl font-semibold text-blue-gray">Caricamento informazioni galleria...</h2>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-blue-gray">Galleria non trovata</h2>
            <p className="mt-2 text-gray-500">La galleria richiesta non esiste o è stata rimossa.</p>
            <div className="mt-6">
              <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sage hover:bg-dark-sage focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage">
                Torna alla Home
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-lg mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-blue-gray">Accesso alla Galleria</h2>
              <p className="mt-2 text-gray-500">Ecco le informazioni di accesso per la galleria richiesta</p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium text-blue-gray">Informazioni Galleria</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 divide-y divide-gray-200">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Nome galleria:</span>
                    <span className="font-medium text-blue-gray">{gallery.name}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Data evento:</span>
                    <span className="font-medium text-blue-gray">{gallery.date}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Password:</span>
                    <span className="font-mono bg-cream px-2 py-1 rounded font-medium text-blue-gray">{gallery.password}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Link href={`/gallery/${gallery.code}`} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sage hover:bg-dark-sage focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage">
                  Vai alla Galleria
                </Link>
                <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage">
                  Torna alla Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}