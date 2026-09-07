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
import ErrorBoundary from "./components/ErrorBoundary";

/**
 * Seiten werden erst beim Aufruf nachgeladen. Schlägt das fehl – typischerweise
 * weil die Website in der Zwischenzeit aktualisiert und die alten Programmteile
 * gelöscht wurden –, wird genau einmal neu geladen. Ohne diese Behandlung
 * bleibt die Seite weiß, und ein Neuladen von Hand ist die einzige Rettung.
 */
const lazyPage = <P extends object>(load: () => Promise<{ default: React.ComponentType<P> }>) =>
  lazy(() =>
    load().catch((err) => {
      const alreadyRetried = sessionStorage.getItem("chunk-retry");
      if (!alreadyRetried) {
        sessionStorage.setItem("chunk-retry", "1");
        window.location.reload();
      }
      throw err;
    })
  );

// Startseite und Fehlerseite bleiben im Haupt-Bundle: Die eine ist der
// häufigste Einstieg, die andere muss immer sofort verfügbar sein.
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Alle übrigen Seiten werden erst beim Aufruf nachgeladen. Das hält vor allem
// den Mitgliederbereich aus dem ersten Laden heraus – dort hängen Leaflet
// (Mitgliederkarte), Drag-and-drop (Formular-Baukasten, Verwaltung) und der
// Markdown-Renderer (Pinnwand) dran, die ein Gast nie braucht.
const EpochMedieval        = lazyPage(() => import("./pages/EpochMedieval"));
const EpochWW1             = lazyPage(() => import("./pages/EpochWW1"));
const Epoch1815            = lazyPage(() => import("./pages/Epoch1815"));
const About                = lazyPage(() => import("./pages/About"));
const Kontakt              = lazyPage(() => import("./pages/Kontakt"));
const FuerVeranstalter     = lazyPage(() => import("./pages/FuerVeranstalter"));
const Impressum            = lazyPage(() => import("./pages/Impressum"));
const Datenschutz          = lazyPage(() => import("./pages/Datenschutz"));
const Login                = lazyPage(() => import("./pages/Login"));
const ResetPassword        = lazyPage(() => import("./pages/ResetPassword"));
const EventRegistration    = lazyPage(() => import("./pages/EventRegistration"));
const MembershipApplication = lazyPage(() => import("./pages/MembershipApplication"));

const Dashboard            = lazyPage(() => import("./pages/intern/Dashboard"));
const Profile              = lazyPage(() => import("./pages/intern/Profile"));
const Sources              = lazyPage(() => import("./pages/intern/Sources"));
const Announcements        = lazyPage(() => import("./pages/intern/Announcements"));
const Elections            = lazyPage(() => import("./pages/intern/Elections"));
const EventsPage           = lazyPage(() => import("./pages/intern/Events"));
const Admin                = lazyPage(() => import("./pages/intern/Admin"));
const AuditLog             = lazyPage(() => import("./pages/intern/AuditLog"));
const RolesPermissions     = lazyPage(() => import("./pages/intern/RolesPermissions"));
const Documents            = lazyPage(() => import("./pages/intern/Documents"));
const Contributions        = lazyPage(() => import("./pages/intern/Contributions"));
const MemberMap            = lazyPage(() => import("./pages/intern/MemberMap"));
// Formular und Anmeldungen liegen auf einer Seite mit zwei Reitern. Beide
// Adressen bleiben gueltig und waehlen nur den Reiter vor.
const EventFormPage        = lazyPage(() => import("./pages/intern/EventFormPage"));
// Anmeldung fuer Mitglieder – gleiches Formular, aber im Mitgliederbereich
// statt auf der oeffentlichen Seite.
const EventRegistrationInternal = lazyPage(() => import("./pages/intern/EventRegistrationInternal"));
const Auswertungen         = lazyPage(() => import("./pages/intern/Auswertungen"));

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

// Nach einem erfolgreichen Start darf der naechste Fehlschlag wieder einmal
// neu laden – sonst bleibt es beim einmaligen Versuch fuer die ganze Sitzung.
if (typeof window !== "undefined") {
  window.addEventListener("load", () => sessionStorage.removeItem("chunk-retry"));
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Layout>
            <ErrorBoundary>
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
                <Route path="/intern/veranstaltungen/:eventId/formular" element={<ProtectedRoute><EventFormPage initialTab="formular" /></ProtectedRoute>} />
                <Route path="/intern/veranstaltungen/:eventId/auswertung" element={<ProtectedRoute><EventFormPage initialTab="anmeldungen" /></ProtectedRoute>} />
                <Route path="/intern/veranstaltungen/:eventId/anmeldung" element={<ProtectedRoute><EventRegistrationInternal /></ProtectedRoute>} />
                <Route path="/intern/auswertungen" element={<ProtectedRoute><Auswertungen /></ProtectedRoute>} />

                <Route path="/anmeldung/:token" element={<EventRegistration />} />
                <Route path="/mitglied-werden" element={<MembershipApplication />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
