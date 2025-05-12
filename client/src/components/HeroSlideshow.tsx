import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SlideshowImage {
  id: string;
  url: string;
  alt: string;
  position: number;
}

export default function HeroSlideshow() {
  const [images, setImages] = useState<SlideshowImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSlideshowImages() {
      try {
        const slideshowCollection = collection(db, 'slideshow');
        const slideshowQuery = query(slideshowCollection, where('active', '==', true), orderBy('position'));
        const querySnapshot = await getDocs(slideshowQuery);
        
        const fetchedImages: SlideshowImage[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedImages.push({
            id: doc.id,
            url: data.url,
            alt: data.alt || 'Slideshow image',
            position: data.position || 0
          });
        });
        
        setImages(fetchedImages);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching slideshow images:', error);
        setLoading(false);
      }
    }

    fetchSlideshowImages();
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Cambia immagine ogni 5 secondi

    return () => clearInterval(intervalId);
  }, [images.length]);

  if (loading) {
    return null; // Non mostrare nulla durante il caricamento
  }

  if (images.length === 0) {
    return null; // Non mostrare nulla se non ci sono immagini
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((image, index) => (
        <div
          key={image.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={image.url}
            alt={image.alt}
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-mint/70 to-sage/50 mix-blend-multiply" aria-hidden="true"></div>
        </div>
      ))}
    </div>
  );
}