
# Collections and Variables Documentation

## Database Collections

### Galleries Collection
Main collection for storing gallery information.

Fields:
- `id`: Serial primary key
- `name`: Text (gallery name)
- `code`: Text (unique gallery code)
- `password`: Text (gallery access password)
- `date`: Text (event date)
- `location`: Text (event location)
- `photoCount`: Integer (number of photos, default: 0)
- `active`: Boolean (gallery status, default: true)
- `createdAt`: Timestamp (creation date)

### Password Requests Collection 
Collection for managing gallery access requests.

Fields:
- `id`: Serial primary key
- `galleryId`: Integer (reference to gallery)
- `firstName`: Text
- `lastName`: Text
- `email`: Text
- `relation`: Text (relationship to event)
- `status`: Text (request status)
- `createdAt`: Timestamp

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

### Chapters
Chapter organization structure:
- `id`: String (unique identifier)
- `title`: String
- `description`: String (optional)
- `position`: Number (order position)

## Environment Variables

### Server Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `SENDGRID_API_KEY`: SendGrid API key for email notifications
- `NODE_ENV`: Application environment (development/production)

### Firebase Configuration
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`

### Application Settings
- `PRODUCTION_BASE_PATH`: Base URL path in production ('/wedgallery/')
- `VITE_FIREBASE_CONFIG`: Firebase client configuration
- `VITE_GOOGLE_ANALYTICS_ID`: Google Analytics tracking ID

## Type Definitions

### Gallery Type
```typescript
type Gallery = {
  id: number;
  name: string;
  code: string;
  password: string;
  date: string;
  location: string;
  photoCount: number;
  active: boolean;
  createdAt: Date;
}
```

### Password Request Type
```typescript
type PasswordRequest = {
  id: number;
  galleryId: number;
  firstName: string;
  lastName: string;
  email: string;
  relation: string;
  status: string;
  createdAt: Date;
}
```

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
