import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Gallery schema
export const galleries = pgTable("galleries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  password: text("password").notNull(),
  date: text("date").notNull(),
  location: text("location").notNull(),
  photoCount: integer("photo_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGallerySchema = createInsertSchema(galleries).pick({
  name: true,
  code: true,
  password: true,
  date: true,
  location: true,
}).extend({
  name: z.string().min(3, "Il nome deve contenere almeno 3 caratteri"),
  code: z.string().min(3, "Il codice deve contenere almeno 3 caratteri").regex(/^[a-z0-9-]+$/, "Il codice può contenere solo lettere minuscole, numeri e trattini"),
  password: z.string().min(4, "La password deve contenere almeno 4 caratteri"),
  date: z.string().min(1, "La data è obbligatoria"),
  location: z.string().min(1, "Il luogo è obbligatorio"),
});

export type InsertGallery = z.infer<typeof insertGallerySchema>;
export type Gallery = typeof galleries.$inferSelect;

// Photo schema
export interface Photo {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: any;
}

// Password Request schema
export const passwordRequests = pgTable("password_requests", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  relation: text("relation").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordRequestSchema = createInsertSchema(passwordRequests).pick({
  galleryId: true,
  firstName: true,
  lastName: true,
  email: true,
  relation: true,
  status: true,
});

export type InsertPasswordRequest = z.infer<typeof insertPasswordRequestSchema>;
export type PasswordRequest = typeof passwordRequests.$inferSelect;
