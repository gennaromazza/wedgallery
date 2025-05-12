import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertGallerySchema, insertPasswordRequestSchema } from "@shared/schema";
import { sendPasswordEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
  // Galleries routes
  app.get("/api/galleries", async (req, res) => {
    try {
      const galleries = await storage.getAllGalleries();
      res.json(galleries);
    } catch (error) {
      console.error("Error getting galleries:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/galleries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const gallery = await storage.getGallery(parseInt(id));
      
      if (!gallery) {
        return res.status(404).json({ message: "Gallery not found" });
      }
      
      res.json(gallery);
    } catch (error) {
      console.error("Error getting gallery:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/galleries/code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const gallery = await storage.getGalleryByCode(code);
      
      if (!gallery) {
        return res.status(404).json({ message: "Gallery not found" });
      }
      
      res.json(gallery);
    } catch (error) {
      console.error("Error getting gallery by code:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/galleries", async (req, res) => {
    try {
      const validationResult = insertGallerySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid gallery data", 
          errors: validationResult.error.errors 
        });
      }
      
      const gallery = await storage.createGallery(validationResult.data);
      res.status(201).json(gallery);
    } catch (error) {
      console.error("Error creating gallery:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/galleries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedGallery = await storage.updateGallery(parseInt(id), req.body);
      
      if (!updatedGallery) {
        return res.status(404).json({ message: "Gallery not found" });
      }
      
      res.json(updatedGallery);
    } catch (error) {
      console.error("Error updating gallery:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/galleries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGallery(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting gallery:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password requests routes
  app.post("/api/password-requests", async (req, res) => {
    try {
      const validationResult = insertPasswordRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid password request data", 
          errors: validationResult.error.errors 
        });
      }
      
      const passwordRequest = await storage.createPasswordRequest(validationResult.data);
      res.status(201).json(passwordRequest);
    } catch (error) {
      console.error("Error creating password request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Authentication verification endpoint
  app.post("/api/verify-gallery-access", async (req, res) => {
    try {
      const { code, password } = req.body;
      
      if (!code || !password) {
        return res.status(400).json({ message: "Code and password are required" });
      }
      
      const gallery = await storage.getGalleryByCode(code);
      
      if (!gallery) {
        return res.status(404).json({ message: "Gallery not found" });
      }
      
      if (gallery.password !== password) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      res.json({ success: true, galleryId: gallery.id });
    } catch (error) {
      console.error("Error verifying gallery access:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint per inviare la password via email
  app.post("/api/send-gallery-password", async (req, res) => {
    try {
      const { galleryId, firstName, lastName, email, relation } = req.body;
      
      if (!galleryId || !firstName || !lastName || !email || !relation) {
        return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
      }
      
      // Recupera la galleria
      const gallery = await storage.getGallery(parseInt(galleryId));
      
      if (!gallery) {
        return res.status(404).json({ message: "Galleria non trovata" });
      }
      
      // Salva la richiesta nel database
      const passwordRequest = await storage.createPasswordRequest({
        galleryId: gallery.id,
        firstName,
        lastName,
        email,
        status: 'completed',
        relation
      });
      
      // Invia l'email con la password
      const emailSent = await sendPasswordEmail({
        galleryName: gallery.name,
        galleryCode: gallery.code,
        galleryPassword: gallery.password,
        recipientEmail: email,
        recipientName: `${firstName} ${lastName}`,
        siteUrl: process.env.SITE_URL || 'https://your-domain.com'
      });
      
      if (!emailSent) {
        return res.status(500).json({ message: "Errore nell'invio dell'email" });
      }
      
      res.json({ success: true, message: "Password inviata con successo" });
    } catch (error) {
      console.error("Errore nell'invio della password:", error);
      res.status(500).json({ message: "Errore del server" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
