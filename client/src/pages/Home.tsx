import { useState, FormEvent } from "react";
import { useLocation } from 'wouter';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { trackPasswordRequest } from '@/lib/analytics';
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import GallerySearch from "@/components/GallerySearch";
import HeroSlideshow from "@/components/HeroSlideshow";

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<any>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Form data state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    relation: '',
    gallerySearch: ''
  });
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If changing gallery search, search for galleries
    if (name === 'gallerySearch' && value.length >= 3) {
      searchGalleries(value);
    } else if (name === 'gallerySearch' && value.length < 3) {
      setSearchResults([]);
      setSelectedGallery(null);
    }
  };
  
  // Search galleries by name
  const searchGalleries = async (searchTerm: string) => {
    if (searchTerm.length < 3) return;
    
    try {
      const galleryRef = collection(db, 'galleries');
      const q = query(galleryRef, where('active', '==', true));
      const querySnapshot = await getDocs(q);
      
      // Filter galleries based on search term
      const results: any[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const galleryName = data.name.toLowerCase();
        const searchTermLower = searchTerm.toLowerCase();
        
        // Check if gallery name contains search term
        if (galleryName.includes(searchTermLower)) {
          results.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching galleries:', error);
    }
  };
  
  // Handle gallery selection
  const handleGallerySelect = (gallery: any) => {
    setSelectedGallery(gallery);
    setFormData(prev => ({ ...prev, gallerySearch: gallery.name }));
    setSearchResults([]);
  };
  
  // Submit form to request password
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!selectedGallery) {
      toast({
        title: 'Errore',
        description: 'Seleziona una galleria valida.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.relation) {
      toast({
        title: 'Errore',
        description: 'Compila tutti i campi richiesti.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Salva la richiesta in Firestore
      const passwordRequestsRef = collection(db, "passwordRequests");
      await addDoc(passwordRequestsRef, {
        galleryId: selectedGallery.id,
        galleryCode: selectedGallery.code,
        galleryName: selectedGallery.name,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        relation: formData.relation,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      // Track password request in analytics
      trackPasswordRequest(selectedGallery.code);
      
      // Show success message
      toast({
        title: 'Richiesta ricevuta',
        description: 'Password visualizzata. Le tue informazioni sono state salvate.',
      });
      
      // Redirect to password result page
      navigate(`/password-result/${selectedGallery.id}`);
    } catch (error) {
      console.error('Error saving password request:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore nell\'invio della richiesta. Riprova più tardi.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <div className="relative bg-light-mint">
        <HeroSlideshow />
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-blue-gray sm:text-5xl lg:text-6xl font-playfair animate-slide-up">
            Ricordi preziosi, <br />custoditi con cura
          </h1>
          <p className="mt-6 text-xl text-blue-gray max-w-2xl font-sans animate-slide-up" style={{ animationDelay: "100ms" }}>
            Le tue gallerie fotografiche private, accessibili in modo sicuro e semplice su qualsiasi dispositivo.
          </p>
          <div className="mt-10 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <a href="#access-gallery" className="px-8 py-3 bg-blue-gray text-off-white font-medium rounded-md shadow hover:bg-dark-sage transition inline-block">
              Accedi alla tua galleria
            </a>
          </div>
        </div>
      </div>

      {/* Access Gallery Form */}
      <section id="access-gallery" className="py-16 bg-off-white">
        <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden animate-fade-in">
          <div className="px-6 py-8">
            <h2 className="text-center text-2xl font-bold text-blue-gray font-playfair mb-4">
              Accedi alla tua Galleria
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Cerca la galleria usando il nome degli sposi
            </p>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-sage text-white mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <div className="mt-1">
                  <GallerySearch />
                </div>
              </div>
              
              <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-beige"></div>
                <span className="flex-shrink mx-4 text-gray-500">oppure</span>
                <div className="flex-grow border-t border-beige"></div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Non trovi la galleria o non hai la password?
                </p>
                <a href="#request-password" className="inline-block px-4 py-2 rounded border border-sage text-sage hover:bg-sage hover:text-white transition duration-200">
                  Richiedi la password
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Request Password Section */}
      <section id="request-password" className="py-16 bg-cream">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-blue-gray font-playfair mb-2">
            Richiedi la Password
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Compila il form per ricevere la password della galleria via email
          </p>
          
          <div className="bg-white shadow-lg rounded-lg p-8 space-y-6">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-sage text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                <div className="sm:col-span-2 relative">
                  <label htmlFor="gallerySearch" className="block text-sm font-medium text-blue-gray">
                    Nome Galleria/Sposi
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="gallerySearch"
                      name="gallerySearch"
                      placeholder="Es. Maria & Luca"
                      value={formData.gallerySearch}
                      onChange={handleInputChange}
                      className="w-full border-beige rounded-md py-3 px-4 focus:ring-sage focus:border-sage"
                      autoComplete="off"
                    />
                    <p className="mt-1 text-xs text-gray-500">Inserisci il nome degli sposi o della galleria</p>
                  </div>
                  
                  {/* Search results dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                      <ul className="py-1">
                        {searchResults.map(gallery => (
                          <li 
                            key={gallery.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                            onClick={() => handleGallerySelect(gallery)}
                          >
                            <span className="font-medium">{gallery.name}</span>
                            <span className="text-sm text-gray-500">Data: {gallery.date}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-blue-gray">
                    Nome
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full border-beige rounded-md py-3 px-4 focus:ring-sage focus:border-sage"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-blue-gray">
                    Cognome
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full border-beige rounded-md py-3 px-4 focus:ring-sage focus:border-sage"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-blue-gray">
                    Email
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full border-beige rounded-md py-3 px-4 focus:ring-sage focus:border-sage"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="relation" className="block text-sm font-medium text-blue-gray">
                    Relazione con gli sposi
                  </label>
                  <div className="mt-1">
                    <select
                      id="relation"
                      name="relation"
                      value={formData.relation}
                      onChange={handleInputChange}
                      className="w-full border-beige rounded-md py-3 px-4 focus:ring-sage focus:border-sage"
                    >
                      <option value="">Seleziona...</option>
                      <option value="family">Famiglia</option>
                      <option value="friend">Amico/a</option>
                      <option value="colleague">Collega</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-gray hover:bg-dark-sage focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage btn-primary disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Invio in corso...
                      </>
                    ) : (
                      'Richiedi Password'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-terracotta font-semibold tracking-wide uppercase">
              Come Funziona
            </h2>
            <p className="mt-2 text-3xl leading-8 font-bold tracking-tight text-blue-gray sm:text-4xl font-playfair">
              Gallerie private accessibili ovunque
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Un modo elegante e sicuro per condividere i tuoi momenti più preziosi con chi ami.
            </p>
          </div>

          <div className="mt-16">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              {/* Feature 1 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-sage text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-blue-gray font-playfair">
                    Accesso sicuro
                  </h3>
                  <p className="mt-2 text-base text-gray-500">
                    Ogni galleria è protetta da password e accessibile solo a chi possiede le credenziali.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-sage text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-blue-gray font-playfair">
                    Gallerie di alta qualità
                  </h3>
                  <p className="mt-2 text-base text-gray-500">
                    Le tue foto vengono visualizzate con la massima qualità su qualsiasi dispositivo.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-sage text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg leading-6 font-medium text-blue-gray font-playfair">
                    Facile condivisione
                  </h3>
                  <p className="mt-2 text-base text-gray-500">
                    Condividi facilmente il link della galleria con gli invitati che potranno richiedere la password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-mint py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto md:max-w-none md:grid md:grid-cols-2 md:gap-8">
            <div>
              <h2 className="text-2xl font-bold text-blue-gray font-playfair sm:text-3xl">
                Contattaci
              </h2>
              <div className="mt-3">
                <p className="text-lg text-gray-500">
                  Hai domande o desideri maggiori informazioni sui nostri servizi? Contattaci, siamo qui per aiutarti.
                </p>
              </div>
              <div className="mt-9">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="ml-3 text-base text-gray-500">
                    <p>+39 123 456 7890</p>
                  </div>
                </div>
                <div className="mt-6 flex">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3 text-base text-gray-500">
                    <p>info@memoriesospese.it</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 sm:mt-16 md:mt-0">
              <h2 className="text-2xl font-bold text-blue-gray font-playfair sm:text-3xl">
                Inviaci un messaggio
              </h2>
              
              <form className="mt-9 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label htmlFor="contact-first-name" className="block text-sm font-medium text-blue-gray">
                    Nome
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="contact-first-name"
                      name="contact-first-name"
                      className="block w-full rounded-md border-beige py-3 px-4 text-gray-900 focus:ring-sage focus:border-sage"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="contact-last-name" className="block text-sm font-medium text-blue-gray">
                    Cognome
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="contact-last-name"
                      name="contact-last-name"
                      className="block w-full rounded-md border-beige py-3 px-4 text-gray-900 focus:ring-sage focus:border-sage"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="contact-email" className="block text-sm font-medium text-blue-gray">
                    Email
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      id="contact-email"
                      name="contact-email"
                      className="block w-full rounded-md border-beige py-3 px-4 text-gray-900 focus:ring-sage focus:border-sage"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="contact-message" className="block text-sm font-medium text-blue-gray">
                    Messaggio
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="contact-message"
                      name="contact-message"
                      rows={4}
                      className="block w-full rounded-md border-beige py-3 px-4 text-gray-900 focus:ring-sage focus:border-sage"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-gray hover:bg-dark-sage focus:outline-none btn-primary"
                  >
                    Invia
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
