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
import { getBasePath } from "./lib/basePath";

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
  }, [location]);
  
  return null;
}

// Router personalizzato con basePath
function Router() {
  // Utilizza il hook per tracciare le navigazioni
  useAnalytics();
  
  // Ottiene il base path configurato
  const basePath = getBasePath();
  
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
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <StudioProvider>
              <Toaster />
              <WouterRouter base={basePath}>
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
