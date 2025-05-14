
import { useState, useEffect } from 'react';
import { Chapter, PhotoWithChapter } from '@/components/ChaptersManager';
import { extractChaptersFromFolders, combineChapters, combinePhotos } from '@/lib/folderChapterMapper';

interface UseChaptersProps {
  initialChapters?: Chapter[];
  initialPhotos?: PhotoWithChapter[];
}

export function useChapters({ initialChapters = [], initialPhotos = [] }: UseChaptersProps = {}) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [photos, setPhotos] = useState<PhotoWithChapter[]>(initialPhotos);

  // Update photos chapter assignment
  const assignPhotoToChapter = (photoId: string, chapterId: string | undefined) => {
    const photoToUpdate = photos.find(p => p.id === photoId);
    if (!photoToUpdate) return;

    const targetChapterPhotos = photos.filter(p => p.chapterId === chapterId);
    const newPosition = targetChapterPhotos.length;
    
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, chapterId, position: photo.position, chapterPosition: newPosition } 
        : photo
    );
    
    setPhotos(updatedPhotos);
  };

  // Bulk assign photos to chapter
  const assignMultiplePhotosToChapter = (photoIds: string[], chapterId: string | undefined) => {
    const updatedPhotos = photos.map(photo => 
      photoIds.includes(photo.id)
        ? { ...photo, chapterId } 
        : photo
    );
    
    setPhotos(updatedPhotos);
  };

  // Process folders to create chapters
  const processNewFolders = (files: File[]) => {
    const { chapters: newChapters, photosWithChapters: newPhotos } = extractChaptersFromFolders(files);
    const combinedChapters = combineChapters(chapters, newChapters);
    const combinedPhotos = combinePhotos(photos, newPhotos, combinedChapters);
    
    setChapters(combinedChapters);
    setPhotos(combinedPhotos);
  };

  // Add new chapter
  const addChapter = () => {
    const newChapter: Chapter = {
      id: `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `Capitolo ${chapters.length + 1}`,
      description: '',
      position: chapters.length
    };
    
    setChapters([...chapters, newChapter]);
    return newChapter;
  };

  // Remove chapter
  const removeChapter = (chapterId: string) => {
    const updatedChapters = chapters.filter(c => c.id !== chapterId)
      .map((c, index) => ({ ...c, position: index }));
    
    const updatedPhotos = photos.map(photo => 
      photo.chapterId === chapterId 
        ? { ...photo, chapterId: undefined } 
        : photo
    );
    
    setChapters(updatedChapters);
    setPhotos(updatedPhotos);
  };

  // Update chapter
  const updateChapter = (chapterId: string, updates: Partial<Chapter>) => {
    const updatedChapters = chapters.map(chapter =>
      chapter.id === chapterId
        ? { ...chapter, ...updates }
        : chapter
    );
    
    setChapters(updatedChapters);
  };

  // Move chapter position
  const moveChapter = (chapterId: string, direction: 'up' | 'down') => {
    const chapterIndex = chapters.findIndex(c => c.id === chapterId);
    if (chapterIndex === -1) return;
    
    const newChapters = [...chapters];
    
    if (direction === 'up' && chapterIndex > 0) {
      const temp = { ...newChapters[chapterIndex] };
      newChapters[chapterIndex] = { ...newChapters[chapterIndex - 1], position: chapterIndex };
      newChapters[chapterIndex - 1] = { ...temp, position: chapterIndex - 1 };
    } else if (direction === 'down' && chapterIndex < newChapters.length - 1) {
      const temp = { ...newChapters[chapterIndex] };
      newChapters[chapterIndex] = { ...newChapters[chapterIndex + 1], position: chapterIndex };
      newChapters[chapterIndex + 1] = { ...temp, position: chapterIndex + 1 };
    }
    
    setChapters(newChapters);
  };

  return {
    chapters,
    photos,
    setChapters,
    setPhotos,
    addChapter,
    removeChapter,
    updateChapter,
    moveChapter,
    assignPhotoToChapter,
    assignMultiplePhotosToChapter,
    processNewFolders
  };
}
