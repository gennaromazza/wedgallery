import { useState } from "react";
import { useParams, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
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
  useState(() => {
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
  }, [id]);

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
      
      // Add the request to the passwordRequests collection
      await addDoc(collection(db, "passwordRequests"), {
        galleryId,
        galleryCode: id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        relation: data.relation,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      
      // Call the sendPasswordEmail function
      const sendPasswordEmail = httpsCallable(functions, 'sendPasswordEmail');
      await sendPasswordEmail({
        galleryId,
        galleryCode: id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      });
      
      setSuccess(true);
      form.reset();
    } catch (error) {
      console.error("Error requesting password:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio della richiesta.",
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
          {galleryExists === false ? (
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
          ) : success ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <svg
                    className="h-12 w-12 text-green-500 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
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
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-blue-gray font-playfair">
                    Richiedi la Password
                  </h2>
                  {galleryName && (
                    <p className="mt-2 text-gray-600">
                      Galleria: {galleryName}
                    </p>
                  )}
                  <p className="mt-2 text-gray-600">
                    Compila il form per ricevere la password della galleria via email
                  </p>
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
                  
                  <Button
                    type="submit"
                    className="w-full btn-primary py-3"
                    disabled={isLoading}
                  >
                    {isLoading ? "Invio in corso..." : "Richiedi Password"}
                  </Button>
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
