import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";

// Startseite und Fehlerseite bleiben im Haupt-Bundle: Die eine ist der
// häufigste Einstieg, die andere muss immer sofort verfügbar sein.
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Alle übrigen Seiten werden erst beim Aufruf nachgeladen. Das hält vor allem
// den Mitgliederbereich aus dem ersten Laden heraus – dort hängen Leaflet
// (Mitgliederkarte), Drag-and-drop (Formular-Baukasten, Verwaltung) und der
// Markdown-Renderer (Pinnwand) dran, die ein Gast nie braucht.
const EpochMedieval        = lazy(() => import("./pages/EpochMedieval"));
const EpochWW1             = lazy(() => import("./pages/EpochWW1"));
const Epoch1815            = lazy(() => import("./pages/Epoch1815"));
const About                = lazy(() => import("./pages/About"));
const Kontakt              = lazy(() => import("./pages/Kontakt"));
const FuerVeranstalter     = lazy(() => import("./pages/FuerVeranstalter"));
const Impressum            = lazy(() => import("./pages/Impressum"));
const Datenschutz          = lazy(() => import("./pages/Datenschutz"));
const Login                = lazy(() => import("./pages/Login"));
const ResetPassword        = lazy(() => import("./pages/ResetPassword"));
const EventRegistration    = lazy(() => import("./pages/EventRegistration"));
const MembershipApplication = lazy(() => import("./pages/MembershipApplication"));

const Dashboard            = lazy(() => import("./pages/intern/Dashboard"));
const Profile              = lazy(() => import("./pages/intern/Profile"));
const Sources              = lazy(() => import("./pages/intern/Sources"));
const Announcements        = lazy(() => import("./pages/intern/Announcements"));
const Elections            = lazy(() => import("./pages/intern/Elections"));
const EventsPage           = lazy(() => import("./pages/intern/Events"));
const Admin                = lazy(() => import("./pages/intern/Admin"));
const AuditLog             = lazy(() => import("./pages/intern/AuditLog"));
const RolesPermissions     = lazy(() => import("./pages/intern/RolesPermissions"));
const Documents            = lazy(() => import("./pages/intern/Documents"));
const Contributions        = lazy(() => import("./pages/intern/Contributions"));
const MemberMap            = lazy(() => import("./pages/intern/MemberMap"));
const Steckbriefe          = lazy(() => import("./pages/intern/Steckbriefe"));
const EventFormBuilder     = lazy(() => import("./pages/intern/EventFormBuilder"));
const EventFormEvaluation  = lazy(() => import("./pages/intern/EventFormEvaluation"));
const Auswertungen         = lazy(() => import("./pages/intern/Auswertungen"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Platzhalter, während eine Seite nachgeladen wird – gleiche Optik wie ProtectedRoute. */
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    <span className="sr-only">Seite wird geladen …</span>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/epochen/mittelalter" element={<EpochMedieval />} />
                <Route path="/epochen/wk1" element={<EpochWW1 />} />
                <Route path="/epochen/1815" element={<Epoch1815 />} />
                <Route path="/fuer-veranstalter" element={<FuerVeranstalter />} />

                <Route path="/verein" element={<About />} />
                <Route path="/kontakt" element={<Kontakt />} />
                <Route path="/impressum" element={<Impressum />} />
                <Route path="/datenschutz" element={<Datenschutz />} />
                <Route path="/login" element={<Login />} />
                <Route path="/passwort-zuruecksetzen" element={<ResetPassword />} />
                <Route path="/intern" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/intern/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/intern/quellen" element={<ProtectedRoute><Sources /></ProtectedRoute>} />
                <Route path="/intern/pinnwand" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
                <Route path="/intern/veranstaltungen" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
                <Route path="/intern/abstimmungen" element={<ProtectedRoute><Elections /></ProtectedRoute>} />
                <Route path="/intern/verwaltung" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/intern/verwaltung/protokoll" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
                <Route path="/intern/verwaltung/berechtigungen" element={<ProtectedRoute><RolesPermissions /></ProtectedRoute>} />
                <Route path="/intern/dokumente" element={<ProtectedRoute><Documents /></ProtectedRoute>} />

                <Route path="/intern/beitraege" element={<ProtectedRoute><Contributions /></ProtectedRoute>} />
                <Route path="/intern/karte" element={<ProtectedRoute><MemberMap /></ProtectedRoute>} />
                <Route path="/intern/steckbriefe" element={<ProtectedRoute><Steckbriefe /></ProtectedRoute>} />
                <Route path="/intern/veranstaltungen/:eventId/formular" element={<ProtectedRoute><EventFormBuilder /></ProtectedRoute>} />
                <Route path="/intern/veranstaltungen/:eventId/auswertung" element={<ProtectedRoute><EventFormEvaluation /></ProtectedRoute>} />
                <Route path="/intern/auswertungen" element={<ProtectedRoute><Auswertungen /></ProtectedRoute>} />

                <Route path="/anmeldung/:token" element={<EventRegistration />} />
                <Route path="/mitglied-werden" element={<MembershipApplication />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
