import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, orderBy, limit, startAt, endAt } from "firebase/firestore";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GallerySearchResult {
  id: string;
  name: string;
  code: string;
  date: string;
}

export default function GallerySearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<GallerySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear the previous timeout if the search term changes
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only search if there are at least 3 characters
    if (searchTerm.length < 3) {
      setSearchResults([]);
      return;
    }

    // Debounce the search to avoid making too many requests
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const galleriesRef = collection(db, "galleries");
        
        // Create a query to search for galleries with names that start with the search term
        // This is case sensitive, which may not be ideal, but it's a starting point
        const searchTermUpper = searchTerm.toUpperCase();
        const searchTermLower = searchTerm.toLowerCase();

        // Search by name (both uppercase and lowercase)
        const nameQueryUpper = query(
          galleriesRef,
          where("active", "==", true),
          orderBy("name"),
          startAt(searchTermUpper),
          endAt(searchTermUpper + '\uf8ff'),
          limit(5)
        );

        const nameQueryLower = query(
          galleriesRef,
          where("active", "==", true),
          orderBy("name"),
          startAt(searchTermLower),
          endAt(searchTermLower + '\uf8ff'),
          limit(5)
        );

        // Execute the queries
        const [upperResults, lowerResults] = await Promise.all([
          getDocs(nameQueryUpper),
          getDocs(nameQueryLower)
        ]);

        // Combine and deduplicate results
        const uniqueResults = new Map();
        
        // Process results from the uppercase query
        upperResults.docs.forEach(doc => {
          const data = doc.data();
          uniqueResults.set(doc.id, {
            id: doc.id,
            name: data.name,
            code: data.code,
            date: data.date
          });
        });

        // Process results from the lowercase query
        lowerResults.docs.forEach(doc => {
          const data = doc.data();
          uniqueResults.set(doc.id, {
            id: doc.id,
            name: data.name,
            code: data.code,
            date: data.date
          });
        });

        // Convert the Map values to an array
        setSearchResults(Array.from(uniqueResults.values()));
      } catch (error) {
        console.error("Error searching galleries:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    // Cleanup function to clear the timeout when the component unmounts
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const handleGallerySelect = (code: string) => {
    navigate(`/gallery/${code}`);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Input
          type="text"
          placeholder="Cerca per nome degli sposi (es. Maria & Luca)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-beige rounded-md focus:ring-sage focus:border-sage"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-blue-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {searchResults.length > 0 && (
        <Card className="mt-2 overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-200">
              {searchResults.map((gallery) => (
                <li
                  key={gallery.id}
                  onClick={() => handleGallerySelect(gallery.code)}
                  className="p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex justify-between">
                    <span className="font-medium text-blue-gray">{gallery.name}</span>
                    <span className="text-sm text-gray-500">{gallery.date}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {searchTerm.length >= 3 && searchResults.length === 0 && !isLoading && (
        <p className="mt-2 text-sm text-gray-500">
          Nessun risultato trovato. Prova con un altro nome.
        </p>
      )}
    </div>
  );
}