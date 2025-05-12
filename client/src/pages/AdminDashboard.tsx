import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, storage, auth } from "@/lib/firebase";
import { ref, listAll, deleteObject } from "firebase/storage";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate("/admin");
    }
  }, [navigate]);

  // Funzione per effettuare il logout
  const handleLogout = async () => {
    try {
      // Esegui logout da Firebase
      await signOut(auth);
      // Rimuovi il flag di amministratore
      localStorage.removeItem('isAdmin');
      // Reindirizza alla pagina di login
      navigate('/admin');
    } catch (error) {
      console.error("Errore durante il logout:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il logout.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-off-white">
      <Navigation isAdminNav={true} />

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-gray">Dashboard amministratore</h1>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard temporanea</h2>
          <p className="mb-4">
            La dashboard è in fase di ricostruzione. Riprovare tra qualche momento.
          </p>
          <p>
            Abbiamo rimosso il limite delle 100 foto e aggiunto i consigli sulle dimensioni, peso e DPI consigliate per le immagini.
          </p>
        </div>
      </main>
    </div>
  );
}