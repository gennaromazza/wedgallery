import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useStudio } from "@/context/StudioContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function AdminSetupPage() {
  const { toast } = useToast();
  const { studioSettings } = useStudio();
  const [settings, setSettings] = useState({...studioSettings});
  const [isLoading, setIsLoading] = useState(false);

  const handleSettingsChange = (
    field: string, 
    value: string,
    nestedField?: string
  ) => {
    if (nestedField) {
      setSettings(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev] as object,
          [nestedField]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

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
      setIsLoading(true);
      // Riferimento allo storage per il logo
      const logoRef = ref(storage, `settings/logo`);
      
      // Upload del file
      await uploadBytes(logoRef, file);
      
      // Ottieni URL di download
      const downloadUrl = await getDownloadURL(logoRef);
      
      // Aggiorna lo stato delle impostazioni
      setSettings(prev => ({
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
    } finally {
      setIsLoading(false);
    }
  };

  const saveStudioSettings = async () => {
    try {
      setIsLoading(true);
      const settingsRef = doc(db, "settings", "studio");
      await setDoc(settingsRef, settings);
      
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Impostazioni Studio</h1>
      <p className="text-center text-gray-500 mb-8">
        Configura le informazioni del tuo studio fotografico che verranno visualizzate sul sito.
      </p>

      <div className="space-y-6 max-w-4xl mx-auto">
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
                  value={settings.name} 
                  onChange={(e) => handleSettingsChange('name', e.target.value)}
                  placeholder="Es. Studio Fotografico Rossi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studioSlogan">Slogan / Tagline</Label>
                <Input 
                  id="studioSlogan" 
                  value={settings.slogan} 
                  onChange={(e) => handleSettingsChange('slogan', e.target.value)}
                  placeholder="Es. Catturiamo i momenti più belli della vita"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="studioAbout">Chi siamo</Label>
              <Textarea 
                id="studioAbout" 
                value={settings.about} 
                onChange={(e) => handleSettingsChange('about', e.target.value)}
                placeholder="Inserisci una breve descrizione del tuo studio"
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="studioLogo">Logo dello studio</Label>
              <div className="flex items-start space-x-4">
                {settings.logo && (
                  <div className="w-24 h-24 border rounded overflow-hidden">
                    <img 
                      src={settings.logo} 
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
                  value={settings.address} 
                  onChange={(e) => handleSettingsChange('address', e.target.value)}
                  placeholder="Es. Via Roma 123, Milano"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studioPhone">Telefono</Label>
                <Input 
                  id="studioPhone" 
                  value={settings.phone} 
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
                  value={settings.email} 
                  onChange={(e) => handleSettingsChange('email', e.target.value)}
                  placeholder="Es. info@studiofotografico.it"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studioWebsite">Sito Web</Label>
                <Input 
                  id="studioWebsite" 
                  value={settings.websiteUrl} 
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
                  value={settings.socialLinks?.facebook || ''} 
                  onChange={(e) => handleSettingsChange('socialLinks', e.target.value, 'facebook')}
                  placeholder="Es. https://facebook.com/tuostudio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studioInstagram">Instagram</Label>
                <div className="space-y-1">
                  <Input 
                    id="studioInstagram" 
                    value={settings.socialLinks?.instagram || ''} 
                    onChange={(e) => {
                      // Rimuovi eventuali URL completi e prendi solo lo username
                      const value = e.target.value;
                      const usernameOnly = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
                      handleSettingsChange('socialLinks', usernameOnly, 'instagram');
                    }}
                    placeholder="Es. tuostudio (solo username, senza URL)"
                  />
                  <p className="text-xs text-muted-foreground">Inserisci solo lo username (es: "fotografo_mario"), non l'URL completo</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="studioTwitter">Twitter</Label>
                <Input 
                  id="studioTwitter" 
                  value={settings.socialLinks?.twitter || ''} 
                  onChange={(e) => handleSettingsChange('socialLinks', e.target.value, 'twitter')}
                  placeholder="Es. https://twitter.com/tuostudio"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={saveStudioSettings}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Salvataggio in corso..." : "Salva impostazioni"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}