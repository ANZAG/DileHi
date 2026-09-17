import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import ModuleRoute from "./components/ModuleRoute";
import { zwischenspeicherLeeren } from "./lib/recovery";
import AppUpdatePrompt from "./components/AppUpdatePrompt";
import InstallHint from "./components/InstallHint";

/**
 * Seiten werden erst beim Aufruf nachgeladen. Schlägt das fehl – typischerweise
 * weil die Website in der Zwischenzeit aktualisiert und die alten Programmteile
 * gelöscht wurden –, wird genau einmal neu geladen. Ohne diese Behandlung
 * bleibt die Seite weiß, und ein Neuladen von Hand ist die einzige Rettung.
 */
const RETRY_KEY = "chunk-retry";

const lazyPage = <P extends object>(load: () => Promise<{ default: React.ComponentType<P> }>) =>
  lazy(() =>
    load()
      .then((mod) => {
        // Erst der ERFOLG hebt die Sperre auf. Vorher stand hier ein
        // load-Ereignis, das sie bei jedem Seitenaufbau geloescht hat – damit
        // griff sie nie, und ein einziger fehlgeschlagener Programmteil
        // erzeugte eine Endlosschleife aus Neuladen.
        try { sessionStorage.removeItem(RETRY_KEY); } catch { /* Speicher gesperrt */ }
        return mod;
      })
      .catch(async (err) => {
        let retried = "1";
        try { retried = sessionStorage.getItem(RETRY_KEY) ?? ""; } catch { /* Speicher gesperrt */ }
        if (!retried) {
          try { sessionStorage.setItem(RETRY_KEY, "1"); } catch { /* Speicher gesperrt */ }
          // Vor dem Neuladen den Zwischenspeicher raeumen.
          //
          // Der Service Worker hat frueher die Startseite unter der Adresse des
          // fehlenden Programmteils abgelegt (Status 200, Inhalt HTML). Danach
          // half auch Neuladen nicht mehr: Die Anfrage wurde aus dem
          // Zwischenspeicher beantwortet und nie wieder ans Netz gestellt.
          //
          // Der neue Worker legt so etwas nicht mehr ab – aber er uebernimmt
          // erst, wenn jemand die Aktualisierung bestaetigt. Bis dahin bedient
          // der alte weiter. Deshalb hier von der Seite aus aufraeumen.
          await zwischenspeicherLeeren();
          window.location.reload();
        }
        throw err;
      })
  );

// Startseite und Fehlerseite bleiben im Haupt-Bundle: Die eine ist der
// häufigste Einstieg, die andere muss immer sofort verfügbar sein.
import NotFound from "./pages/NotFound";

// Alle übrigen Seiten werden erst beim Aufruf nachgeladen. Das hält vor allem
// den Mitgliederbereich aus dem ersten Laden heraus – dort hängen Leaflet
// (Mitgliederkarte), Drag-and-drop (Formular-Baukasten, Verwaltung) und der
// Markdown-Renderer (Versammlungen) dran, den ein Gast nie braucht.
const Kontakt              = lazyPage(() => import("./pages/Kontakt"));
const Login                = lazyPage(() => import("./pages/Login"));
const Einrichtung          = lazyPage(() => import("./pages/Einrichtung"));
const ResetPassword        = lazyPage(() => import("./pages/ResetPassword"));
const EventRegistration    = lazyPage(() => import("./pages/EventRegistration"));
const MembershipApplication = lazyPage(() => import("./pages/MembershipApplication"));
const SeiteAnzeigen        = lazyPage(() => import("./pages/SeiteAnzeigen"));

const Dashboard            = lazyPage(() => import("./pages/intern/Dashboard"));
const SeitenEditor         = lazyPage(() => import("./pages/intern/SeitenEditor"));
const Forum                = lazyPage(() => import("./pages/intern/Forum"));
const ForumCategory        = lazyPage(() => import("./pages/intern/ForumCategory"));
const ForumThread          = lazyPage(() => import("./pages/intern/ForumThread"));
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
const Inventar             = lazyPage(() => import("./pages/intern/Inventar"));
const Beschluesse          = lazyPage(() => import("./pages/intern/Beschluesse"));
const Auslagen             = lazyPage(() => import("./pages/intern/Auslagen"));
const Zuwendungen          = lazyPage(() => import("./pages/intern/Zuwendungen"));
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <ErrorBoundary>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Auch die Startseite kommt aus dem Editor. Die Sammelroute
                    unten kann sie nicht bedienen: „/" hat keinen Namen. */}
                <Route path="/" element={<SeiteAnzeigen slug="startseite" />} />
                <Route path="/kontakt" element={<Kontakt />} />
                <Route path="/login" element={<Login />} />
                {/* Nur in einer frischen Installation erreichbar – die Seite
                    leitet zur Anmeldung um, sobald ein Konto eine Rolle hat. */}
                <Route path="/einrichtung" element={<Einrichtung />} />
                <Route path="/passwort-zuruecksetzen" element={<ResetPassword />} />
                <Route path="/intern" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/intern/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/intern/quellen" element={<ModuleRoute k="sources"><ProtectedRoute><Sources /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/forum" element={<ModuleRoute k="forum"><ProtectedRoute><Forum /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/forum/thema/:threadId" element={<ModuleRoute k="forum"><ProtectedRoute><ForumThread /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/forum/:slug" element={<ModuleRoute k="forum"><ProtectedRoute><ForumCategory /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/versammlungen" element={<ModuleRoute k="announcements"><ProtectedRoute><Announcements /></ProtectedRoute></ModuleRoute>} />
                {/* Die Seite hiess frueher Pinnwand. Wer den alten Link
                    gespeichert hat, landet weiterhin richtig. */}
                <Route path="/intern/pinnwand" element={<Navigate to="/intern/versammlungen" replace />} />
                <Route path="/intern/veranstaltungen" element={<ModuleRoute k="events"><ProtectedRoute><EventsPage /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/abstimmungen" element={<ModuleRoute k="elections"><ProtectedRoute><Elections /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/verwaltung" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/intern/verwaltung/protokoll" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
                <Route path="/intern/verwaltung/berechtigungen" element={<ProtectedRoute><RolesPermissions /></ProtectedRoute>} />
                <Route path="/intern/seiten/:pageId" element={<ProtectedRoute><SeitenEditor /></ProtectedRoute>} />
                <Route path="/intern/dokumente" element={<ModuleRoute k="documents"><ProtectedRoute><Documents /></ProtectedRoute></ModuleRoute>} />

                <Route path="/intern/beitraege" element={<ModuleRoute k="contributions"><ProtectedRoute><Contributions /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/karte" element={<ModuleRoute k="member_map"><ProtectedRoute><MemberMap /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/inventar" element={<ModuleRoute k="inventory"><ProtectedRoute><Inventar /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/beschluesse" element={<ModuleRoute k="resolutions"><ProtectedRoute><Beschluesse /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/auslagen" element={<ModuleRoute k="expense_claims"><ProtectedRoute><Auslagen /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/zuwendungen" element={<ModuleRoute k="donation_receipts"><ProtectedRoute><Zuwendungen /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/veranstaltungen/:eventId/formular" element={<ModuleRoute k="event_forms"><ProtectedRoute><EventFormPage initialTab="formular" /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/veranstaltungen/:eventId/auswertung" element={<ModuleRoute k="event_forms"><ProtectedRoute><EventFormPage initialTab="anmeldungen" /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/veranstaltungen/:eventId/anmeldung" element={<ModuleRoute k="event_forms"><ProtectedRoute><EventRegistrationInternal /></ProtectedRoute></ModuleRoute>} />
                <Route path="/intern/auswertungen" element={<ModuleRoute k="event_forms"><ProtectedRoute><Auswertungen /></ProtectedRoute></ModuleRoute>} />

                <Route path="/anmeldung/:token" element={<ModuleRoute k="event_forms"><EventRegistration /></ModuleRoute>} />
                <Route path="/mitglied-werden" element={<ModuleRoute k="applications"><MembershipApplication /></ModuleRoute>} />
                {/* Ganz am Ende: Was keine feste Route trifft, koennte eine im
                    Editor gebaute Seite sein. Gibt es sie nicht, zeigt
                    SeiteAnzeigen selbst die 404-Seite. */}
                <Route path="*" element={<SeiteAnzeigen />} />
              </Routes>
            </Suspense>
            <AppUpdatePrompt />
            <InstallHint />
          </Layout>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
