import { 
  galleries, type Gallery, type InsertGallery,
  passwordRequests, type PasswordRequest, type InsertPasswordRequest 
} from "@shared/schema";

export interface IStorage {
  // Gallery methods
  getAllGalleries(): Promise<Gallery[]>;
  getGallery(id: number): Promise<Gallery | undefined>;
  getGalleryByCode(code: string): Promise<Gallery | undefined>;
  createGallery(gallery: InsertGallery): Promise<Gallery>;
  updateGallery(id: number, gallery: Partial<Gallery>): Promise<Gallery | undefined>;
  deleteGallery(id: number): Promise<void>;
  
  // Password Request methods
  createPasswordRequest(request: InsertPasswordRequest): Promise<PasswordRequest>;
  getPasswordRequestsByGalleryId(galleryId: number): Promise<PasswordRequest[]>;
}

export class MemStorage implements IStorage {
  private galleries: Map<number, Gallery>;
  private passwordRequests: Map<number, PasswordRequest>;
  private galleryCurrentId: number;
  private passwordRequestCurrentId: number;

  constructor() {
    this.galleries = new Map();
    this.passwordRequests = new Map();
    this.galleryCurrentId = 1;
    this.passwordRequestCurrentId = 1;
  }

  // Gallery methods
  async getAllGalleries(): Promise<Gallery[]> {
    return Array.from(this.galleries.values());
  }

  async getGallery(id: number): Promise<Gallery | undefined> {
    return this.galleries.get(id);
  }

  async getGalleryByCode(code: string): Promise<Gallery | undefined> {
    return Array.from(this.galleries.values()).find(
      (gallery) => gallery.code === code
    );
  }

  async createGallery(insertGallery: InsertGallery): Promise<Gallery> {
    const id = this.galleryCurrentId++;
    const now = new Date();
    const gallery: Gallery = { 
      ...insertGallery, 
      id, 
      photoCount: 0,
      active: true,
      createdAt: now
    };
    this.galleries.set(id, gallery);
    return gallery;
  }

  async updateGallery(id: number, galleryData: Partial<Gallery>): Promise<Gallery | undefined> {
    const gallery = this.galleries.get(id);
    
    if (!gallery) {
      return undefined;
    }
    
    const updatedGallery = { ...gallery, ...galleryData };
    this.galleries.set(id, updatedGallery);
    
    return updatedGallery;
  }

  async deleteGallery(id: number): Promise<void> {
    this.galleries.delete(id);
  }

  // Password Request methods
  async createPasswordRequest(insertRequest: InsertPasswordRequest): Promise<PasswordRequest> {
    const id = this.passwordRequestCurrentId++;
    const now = new Date();
    const request: PasswordRequest = { ...insertRequest, id, createdAt: now };
    this.passwordRequests.set(id, request);
    return request;
  }

  async getPasswordRequestsByGalleryId(galleryId: number): Promise<PasswordRequest[]> {
    return Array.from(this.passwordRequests.values()).filter(
      (request) => request.galleryId === galleryId
    );
  }
}

export const storage = new MemStorage();
