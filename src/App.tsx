import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import EpochMedieval from "./pages/EpochMedieval";
import EpochWW1 from "./pages/EpochWW1";
import Epoch1815 from "./pages/Epoch1815";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Login from "./pages/Login";
import Dashboard from "./pages/intern/Dashboard";
import Sources from "./pages/intern/Sources";
import Announcements from "./pages/intern/Announcements";
import Elections from "./pages/intern/Elections";
import Admin from "./pages/intern/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/epochen/mittelalter" element={<EpochMedieval />} />
              <Route path="/epochen/wk1" element={<EpochWW1 />} />
              <Route path="/epochen/1815" element={<Epoch1815 />} />
              <Route path="/galerie" element={<Gallery />} />
              <Route path="/verein" element={<About />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/login" element={<Login />} />
              <Route path="/intern" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/intern/quellen" element={<ProtectedRoute><Sources /></ProtectedRoute>} />
              <Route path="/intern/pinnwand" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
              <Route path="/intern/abstimmungen" element={<ProtectedRoute><Elections /></ProtectedRoute>} />
              <Route path="/intern/verwaltung" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
