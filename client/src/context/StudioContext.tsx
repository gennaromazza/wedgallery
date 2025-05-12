import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface StudioSettings {
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

const defaultSettings: StudioSettings = {
  name: 'Memorie Sospese',
  slogan: 'Catturiamo momenti, creiamo ricordi',
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
};

interface StudioContextType {
  studioSettings: StudioSettings;
  loading: boolean;
  error: string | null;
}

const StudioContext = createContext<StudioContextType>({
  studioSettings: defaultSettings,
  loading: true,
  error: null
});

export const useStudio = () => useContext(StudioContext);

interface StudioProviderProps {
  children: ReactNode;
}

export function StudioProvider({ children }: StudioProviderProps) {
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudioSettings() {
      try {
        setLoading(true);
        const settingsDoc = doc(db, "settings", "studio");
        const settingsSnapshot = await getDoc(settingsDoc);
        
        if (settingsSnapshot.exists()) {
          const settingsData = settingsSnapshot.data() as StudioSettings;
          setStudioSettings(prev => ({
            ...prev,
            ...settingsData
          }));
        }
      } catch (err) {
        console.error("Error fetching studio settings:", err);
        setError("Impossibile caricare le impostazioni dello studio");
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudioSettings();
  }, []);

  return (
    <StudioContext.Provider value={{ studioSettings, loading, error }}>
      {children}
    </StudioContext.Provider>
  );
}