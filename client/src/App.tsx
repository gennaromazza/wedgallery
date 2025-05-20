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

import Home from "@/pages/Home";
import GalleryAccess from "@/pages/GalleryAccess";
import Gallery from "@/pages/Gallery";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import RequestPassword from "@/pages/RequestPassword";
import PasswordResult from "@/pages/PasswordResult";
import DeleteGalleryPage from "@/pages/DeleteGalleryPage";
import NotFound from "@/pages/not-found";

// 🔍 Tracciamento pagine (analytics)
function useAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    trackPageView(location);
    console.log(`[useAnalytics] tracking page view: ${location}`);
  }, [location]);

  return null;
}

// 📍 Routing dichiarativo
function Router() {
  useAnalytics();

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery/:id" component={GalleryAccess} />
      <Route path="/view/:id" component={Gallery} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/delete-gallery" component={DeleteGalleryPage} />
      <Route path="/request-password/:id" component={RequestPassword} />
      <Route path="/password-result/:id" component={PasswordResult} />
      <Route component={NotFound} />
    </Switch>
  );
}

// 🚀 App principale
function App() {
  // ✅ Base dinamico: '/' in sviluppo, '/wedgallery' in produzione
  const basePath = import.meta.env.PROD ? "/wedgallery" : "/";
  console.log(`[App] Using base path: "${basePath}"`);

  useEffect(() => {
    const { origin, pathname, search, href } = window.location;
    const isProduction = import.meta.env.PROD;

    console.log(`[App] Running in ${isProduction ? "production" : "development"} mode`);
    console.log('[App] Current URL:', href);

    // ✅ Normalizza doppi slash
    if (/\/\/+/.test(pathname)) {
      const correctedPath = pathname.replace(/\/\/+/g, '/');
      const correctedUrl = `${origin}${correctedPath}${search}`;
      console.log('[App] Correzione slash multipli:', correctedUrl);
      window.history.replaceState(null, '', correctedUrl);
    }
  }, [basePath]);

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
