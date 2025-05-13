import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./context/AuthContext";
import { StudioProvider } from "./context/StudioContext";
import { ThemeProvider } from "next-themes";
import { trackPageView } from "./lib/analytics";
import { useEffect } from "react";
import { getBasePath } from "./lib/basePathFixed"; // Uso del nuovo modulo

import Home from "@/pages/Home";
import GalleryAccess from "@/pages/GalleryAccess";
import Gallery from "@/pages/Gallery";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import RequestPassword from "@/pages/RequestPassword";
import PasswordResult from "@/pages/PasswordResult";
import NotFound from "@/pages/not-found";

// Hook per tracciare le visualizzazioni delle pagine
function useAnalytics() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Traccia il cambio di pagina
    trackPageView(location);
    console.log(`[useAnalytics] tracking page view: ${location}`);
  }, [location]);
  
  return null;
}

// Router personalizzato con basePath
function Router() {
  // Utilizza il hook per tracciare le navigazioni
  useAnalytics();
  
  console.log("[Router] Initializing router with all routes");
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery/:id" component={GalleryAccess} />
      <Route path="/view/:id" component={Gallery} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/request-password/:id" component={RequestPassword} />
      <Route path="/password-result/:id" component={PasswordResult} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Configura il base path per il router
  const basePath = getBasePath();
  console.log(`[App] Using base path: "${basePath}"`);
  
  // Gestione avanzata dell'ambiente con logging dettagliato
  useEffect(() => {
    if (import.meta.env.PROD) {
      console.log('[App] Running in production mode');
      console.log('[App] Base URL:', window.location.origin);
      console.log('[App] Pathname:', window.location.pathname);
      console.log('[App] Base Path:', basePath);
      
      // Controlla se l'URL corrente contiene già /wedgallery/wedgallery
      if (window.location.pathname.includes('/wedgallery/wedgallery')) {
        console.error('[App] ATTENZIONE: URL contiene percorso duplicato /wedgallery/wedgallery');
        console.log('[App] URL corrente:', window.location.href);
      }
    } else {
      console.log('[App] Running in development mode');
    }
  }, [basePath]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <StudioProvider>
              <Toaster />
              <WouterRouter base={basePath.endsWith('/') ? basePath.slice(0, -1) : basePath}>
                <Router />
              </WouterRouter>
            </StudioProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
