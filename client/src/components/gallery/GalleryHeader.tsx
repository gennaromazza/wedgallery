import React from "react";
import { Calendar as CalendarIcon, MapPin as MapPinIcon } from "lucide-react";
import { formatDateString } from "@/lib/dateFormatter";

interface GalleryHeaderProps {
  name: string;
  date?: string;
  location?: string;
  description?: string;
}

export default function GalleryHeader({ name, date, location, description }: GalleryHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b border-sage-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-blue-gray-900">{name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-2 text-blue-gray-600">
              {date && (
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-sage-600" />
                  <span className="text-sm sm:text-base">{formatDateString(date)}</span>
                </div>
              )}
              
              {location && (
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className="h-4 w-4 text-sage-600" />
                  <span className="text-sm sm:text-base">{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {description && (
          <div className="mt-4">
            <p className="text-gray-700 italic">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
}