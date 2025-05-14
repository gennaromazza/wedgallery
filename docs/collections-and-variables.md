
# Collections and Variables Documentation

## Storage Structures

### Photos
Gallery photos are stored with the following metadata:
- `id`: String (unique identifier)
- `name`: String (file name)
- `url`: String (access URL)
- `size`: Number (file size)
- `contentType`: String (mime type)
- `createdAt`: Timestamp
- `chapterId`: String (optional, reference to chapter)
- `position`: Number (order position within gallery)
- `chapterPosition`: Number (order position within chapter)

### Chapters
Chapter organization structure:
- `id`: String (unique identifier)
- `title`: String
- `description`: String (optional)
- `position`: Number (order position)

## Environment Variables

### Firebase Configuration
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`

### Application Settings
- `PRODUCTION_BASE_PATH`: Base URL path in production ('/wedgallery/')
- `VITE_FIREBASE_CONFIG`: Firebase client configuration
- `VITE_GOOGLE_ANALYTICS_ID`: Google Analytics tracking ID
- `NODE_ENV`: Application environment (development/production)

## Type Definitions

### Photo Type
```typescript
type Photo = {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: Date;
  chapterId?: string;
  position: number;
  chapterPosition?: number;
}
```

### PhotoWithChapter Type
```typescript
interface PhotoWithChapter {
  id: string;
  file: File;
  url: string;
  name: string;
  chapterId?: string;
  position: number;
  chapterPosition?: number;
  folderPath?: string;
}
```

### Chapter Type
```typescript
type Chapter = {
  id: string;
  title: string;
  description?: string;
  position: number;
}
```

### Gallery Type
```typescript
type Gallery = {
  id: string;
  name: string;
  code: string;
  password: string;
  date: string;
  location: string;
  photoCount: number;
  active: boolean;
  createdAt: Date;
  coverImageUrl?: string;
  youtubeUrl?: string;
  description?: string;
}
```

## Hook Usage

### useChapters Hook
Central hook for managing chapters and photo assignments:

```typescript
const {
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
} = useChapters({
  initialChapters: [],
  initialPhotos: []
});
```

Key features:
- Chapter management (add, remove, update, reorder)
- Photo assignment to chapters
- Bulk photo operations
- Folder processing for automatic chapter creation
