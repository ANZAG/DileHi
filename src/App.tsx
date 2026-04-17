import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import EpochMedieval from "./pages/EpochMedieval";
import EpochWW1 from "./pages/EpochWW1";
import Epoch1815 from "./pages/Epoch1815";

import About from "./pages/About";
import Kontakt from "./pages/Kontakt";
import FuerVeranstalter from "./pages/FuerVeranstalter";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/intern/Dashboard";
import Profile from "./pages/intern/Profile";
import Sources from "./pages/intern/Sources";
import Announcements from "./pages/intern/Announcements";
import Elections from "./pages/intern/Elections";
import EventsPage from "./pages/intern/Events";
import Admin from "./pages/intern/Admin";
import AuditLog from "./pages/intern/AuditLog";
import RolesPermissions from "./pages/intern/RolesPermissions";
import Documents from "./pages/intern/Documents";
import Contributions from "./pages/intern/Contributions";
import MemberMap from "./pages/intern/MemberMap";
import EventFormBuilder from "./pages/intern/EventFormBuilder";
import EventFormEvaluation from "./pages/intern/EventFormEvaluation";
// Forum archived – routes & tiles disabled (files retained for future re-activation)
// import Forum from "./pages/intern/Forum";
// import ForumCategory from "./pages/intern/ForumCategory";
// import ForumThread from "./pages/intern/ForumThread";
// import ForumNewThread from "./pages/intern/ForumNewThread";
import EventRegistration from "./pages/EventRegistration";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Layout>
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
              <Route path="/intern/veranstaltungen/:eventId/formular" element={<ProtectedRoute><EventFormBuilder /></ProtectedRoute>} />
              <Route path="/intern/veranstaltungen/:eventId/auswertung" element={<ProtectedRoute><EventFormEvaluation /></ProtectedRoute>} />
              {/* Forum archived – routes deactivated
              <Route path="/intern/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
              <Route path="/intern/forum/:slug" element={<ProtectedRoute><ForumCategory /></ProtectedRoute>} />
              <Route path="/intern/forum/thread/:threadId" element={<ProtectedRoute><ForumThread /></ProtectedRoute>} />
              <Route path="/intern/forum/neu/:slug" element={<ProtectedRoute><ForumNewThread /></ProtectedRoute>} />
              */}
              <Route path="/anmeldung/:token" element={<EventRegistration />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
