import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const accessSchema = z.object({
  password: z.string().min(1, "La password è obbligatoria"),
});

type AccessFormData = z.infer<typeof accessSchema>;

export default function GalleryAccess() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [galleryNotFound, setGalleryNotFound] = useState(false);
  const [galleryDetails, setGalleryDetails] = useState<{ name: string; date: string; location: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<AccessFormData>({
    resolver: zodResolver(accessSchema),
    defaultValues: {
      password: "",
    },
  });

  // Check if gallery exists on component mount
  useEffect(() => {
    async function checkGallery() {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const galleriesRef = collection(db, "galleries");
        const q = query(galleriesRef, where("code", "==", id));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setGalleryNotFound(true);
        } else {
          const galleryData = querySnapshot.docs[0].data();
          setGalleryDetails({ 
            name: galleryData.name,
            date: galleryData.date,
            location: galleryData.location
          });
        }
      } catch (error) {
        console.error("Error checking gallery:", error);
        toast({
          title: "Errore",
          description: "Non è stato possibile verificare la galleria.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    checkGallery();
  }, [id]);

  const onSubmit = async (data: AccessFormData) => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const galleriesRef = collection(db, "galleries");
      const q = query(
        galleriesRef, 
        where("code", "==", id),
        where("password", "==", data.password)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          title: "Accesso negato",
          description: "La password inserita non è corretta.",
          variant: "destructive",
        });
        return;
      }
      
      // Successful login, store session and navigate to gallery view
      const galleryDoc = querySnapshot.docs[0];
      localStorage.setItem(`gallery_auth_${id}`, "true");
      localStorage.setItem(`gallery_id_${id}`, galleryDoc.id);
      navigate(`/view/${id}`);
    } catch (error) {
      console.error("Error accessing gallery:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'accesso alla galleria.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      <Navigation />
      
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {galleryNotFound ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-blue-gray font-playfair mb-4">
                    Galleria non trovata
                  </h2>
                  <p className="text-gray-600 mb-6">
                    La galleria che stai cercando non esiste o è stata rimossa.
                  </p>
                  <Link href="/">
                    <Button className="btn-primary">Torna alla Home</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-blue-gray font-playfair">
                    {galleryDetails?.name || "Accedi alla Galleria"}
                  </h2>
                  <p className="mt-2 text-gray-600">
                    Inserisci la password per accedere alle foto
                  </p>
                </div>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-blue-gray mb-1">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Inserisci la password"
                      {...form.register("password")}
                      className="w-full px-3 py-2 border border-beige rounded-md focus:ring-sage focus:border-sage"
                    />
                    {form.formState.errors.password && (
                      <p className="mt-1 text-sm text-red-500">{form.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full btn-primary py-2 rounded-md"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifica in corso..." : "Accedi"}
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <Link href={`/request-password/${id}`}>
                    <a className="text-sm text-blue-gray hover:text-terracotta transition">
                      Non hai la password? Richiedila qui
                    </a>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
