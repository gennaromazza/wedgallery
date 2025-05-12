import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CoupleIllustration, FloralCorner, FloralDivider, HeartFrameWithRings, BackgroundDecoration } from '@/components/WeddingIllustrations';

const requestSchema = z.object({
  firstName: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  lastName: z.string().min(2, "Il cognome deve contenere almeno 2 caratteri"),
  email: z.string().email("Inserisci un'email valida"),
  relation: z.string().min(1, "Seleziona una relazione"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function RequestPassword() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [galleryExists, setGalleryExists] = useState<boolean | null>(null);
  const [galleryName, setGalleryName] = useState("");
  const { toast } = useToast();

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      relation: "",
    },
  });

  // Check if the gallery exists on component mount
  useEffect(() => {
    async function checkGallery() {
      if (!id) return;
      
      try {
        const galleriesRef = collection(db, "galleries");
        const q = query(galleriesRef, where("code", "==", id));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setGalleryExists(false);
          return;
        }
        
        const galleryData = querySnapshot.docs[0].data();
        setGalleryName(galleryData.name);
        setGalleryExists(true);
      } catch (error) {
        console.error("Error checking gallery:", error);
        toast({
          title: "Errore",
          description: "Non è stato possibile verificare la galleria.",
          variant: "destructive",
        });
      }
    }
    
    checkGallery();
  }, [id, toast]);

  const onSubmit = async (data: RequestFormData) => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      // Check if the gallery exists
      const galleriesRef = collection(db, "galleries");
      const q = query(galleriesRef, where("code", "==", id));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          title: "Galleria non trovata",
          description: "La galleria richiesta non esiste o è stata rimossa.",
          variant: "destructive",
        });
        return;
      }
      
      const galleryDoc = querySnapshot.docs[0];
      const galleryId = galleryDoc.id;
      const galleryData = galleryDoc.data();
      
      // Add the request to the passwordRequests collection
      await addDoc(collection(db, "passwordRequests"), {
        galleryId,
        galleryCode: id,
        galleryName: galleryData.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        relation: data.relation,
        status: "completed",
        createdAt: serverTimestamp(),
      });
      
      // Redirect to password result page
      window.location.href = `/password-result/${id}`;
    } catch (error) {
      console.error("Error requesting password:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio della richiesta.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white flex flex-col relative">
      {/* Decorazioni */}
      <div className="absolute top-0 left-0 w-40 h-40 opacity-10 pointer-events-none">
        <FloralCorner position="top-left" />
      </div>
      <div className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none">
        <FloralCorner position="top-right" />
      </div>
      <div className="absolute bottom-0 left-0 w-40 h-40 opacity-10 pointer-events-none">
        <FloralCorner position="bottom-left" />
      </div>
      <div className="absolute bottom-0 right-0 w-40 h-40 opacity-10 pointer-events-none">
        <FloralCorner position="bottom-right" />
      </div>
      
      <Navigation />
      
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 relative z-10">
          {galleryExists === false ? (
            <Card className="border-sage/20 shadow-md overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <BackgroundDecoration />
              </div>
              <CardContent className="pt-8 relative z-10">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 opacity-15">
                    <CoupleIllustration />
                  </div>
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
          ) : success ? (
            <Card className="border-sage/20 shadow-md overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <BackgroundDecoration />
              </div>
              <CardContent className="pt-8 relative z-10">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6">
                    <HeartFrameWithRings />
                  </div>
                  <h2 className="text-2xl font-bold text-blue-gray font-playfair mb-2">
                    Richiesta inviata
                  </h2>
                  <p className="text-gray-600 mb-6">
                    La tua richiesta è stata inviata con successo. Riceverai la password via email a breve.
                  </p>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                    <Link href={`/gallery/${id}`}>
                      <Button className="btn-primary">Torna alla Galleria</Button>
                    </Link>
                    <Link href="/">
                      <Button variant="outline">Torna alla Home</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-sage/20 shadow-md overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <BackgroundDecoration />
              </div>
              <CardContent className="pt-8 relative z-10">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 mx-auto mb-4 opacity-60">
                    <HeartFrameWithRings />
                  </div>
                  <h2 className="text-2xl font-bold text-blue-gray font-playfair">
                    Richiedi la Password
                  </h2>
                  {galleryName && (
                    <p className="mt-2 text-gray-600">
                      Galleria: <span className="font-medium">{galleryName}</span>
                    </p>
                  )}
                  <p className="mt-2 text-gray-600">
                    Compila il form per ricevere la password della galleria
                  </p>
                  <div className="w-full max-w-xs mx-auto h-8 opacity-20 my-6">
                    <FloralDivider />
                  </div>
                </div>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-blue-gray">
                        Nome
                      </label>
                      <div className="mt-1">
                        <Input
                          id="firstName"
                          {...form.register("firstName")}
                          className="w-full border-beige rounded-md py-3 px-4 focus:ring-sage focus:border-sage"
                        />
                        {form.formState.errors.firstName && (
                          <p className="mt-1 text-sm text-red-500">{form.formState.errors.firstName.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-blue-gray">
                        Cognome
                      </label>
                      <div className="mt-1">
                        <Input
                          id="lastName"
                          {...form.register("lastName")}
                          className="w-full border-beige rounded-md py-3 px-4 focus:ring-sage focus:border-sage"
                        />
                        {form.formState.errors.lastName && (
                          <p className="mt-1 text-sm text-red-500">{form.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-blue-gray">
                      Email
                    </label>
                    <div className="mt-1">
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        className="w-full border-beige rounded-md py-3 px-4 focus:ring-sage focus:border-sage"
                      />
                      {form.formState.errors.email && (
                        <p className="mt-1 text-sm text-red-500">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="relation" className="block text-sm font-medium text-blue-gray">
                      Relazione con gli sposi
                    </label>
                    <div className="mt-1">
                      <Select onValueChange={(value) => form.setValue("relation", value)}>
                        <SelectTrigger className="w-full border-beige rounded-md focus:ring-sage focus:border-sage">
                          <SelectValue placeholder="Seleziona..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">Famiglia</SelectItem>
                          <SelectItem value="friend">Amico/a</SelectItem>
                          <SelectItem value="colleague">Collega</SelectItem>
                          <SelectItem value="other">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.relation && (
                        <p className="mt-1 text-sm text-red-500">{form.formState.errors.relation.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full btn-primary py-3 relative group overflow-hidden"
                      disabled={isLoading}
                    >
                      <span className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity">
                        <BackgroundDecoration />
                      </span>
                      <span className="relative z-10">
                        {isLoading ? "Invio in corso..." : "Richiedi Password"}
                      </span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}