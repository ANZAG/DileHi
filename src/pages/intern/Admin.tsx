import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users, Image, BookOpen, Mail, FileText, Eye, Shield } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import GalleryAdmin from "@/components/admin/GalleryAdmin";
import SourcesAdmin from "@/components/admin/SourcesAdmin";
import VisitorHighlightsAdmin from "@/components/admin/VisitorHighlightsAdmin";
import SiteImagesAdmin from "@/components/admin/SiteImagesAdmin";
import MemberRegistry from "@/components/admin/MemberRegistry";
import ContactMessages from "@/components/admin/ContactMessages";

type AdminTab = "members" | "gallery" | "siteimages" | "sources" | "visitor" | "messages";

const Admin = () => {
  const { hasPermission } = useAuth();
  const canAdmin = hasPermission("admin.access");
  const canMembers = hasPermission("members.manage");
  const canRoles = hasPermission("roles.manage");
  const canAudit = hasPermission("audit.view");
  const [activeTab, setActiveTab] = useState<AdminTab>(canMembers ? "members" : "gallery");

  if (!canAdmin) return <Navigate to="/intern" replace />;

  const tabs = [
    ...(canMembers ? [
      { id: "members" as const, label: "Mitglieder", icon: Users, desc: "Register, Einladungen und Rollen" },
    ] : []),
    { id: "messages" as const, label: "Kontaktanfragen", icon: Mail, desc: "Nachrichten vom Kontaktformular" },
    { id: "gallery" as const, label: "Galerie", icon: Image, desc: "Bilder verwalten" },
    { id: "siteimages" as const, label: "Seitenbilder", icon: Image, desc: "Bilder auf allen Seiten pflegen" },
    { id: "sources" as const, label: "Quellen", icon: BookOpen, desc: "Epochen-Quellenangaben pflegen" },
    { id: "visitor" as const, label: "Besucher-Highlights", icon: Eye, desc: "Stichpunkte für Besuchersektion" },
  ];

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} /> Zurück
            </Link>
            <h1 className="font-serif text-2xl font-bold">Verwaltung</h1>
          </div>
          <div className="flex items-center gap-2">
            {canRoles && (
              <Link
                to="/intern/verwaltung/berechtigungen"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
              >
                <Shield size={16} /> Berechtigungen
              </Link>
            )}
            {canAudit && (
              <Link
                to="/intern/verwaltung/protokoll"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
              >
                <FileText size={16} /> Audit
              </Link>
            )}
          </div>
        </div>

        {/* Tab cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col p-3 sm:p-4 rounded-lg border text-left transition-all ${
                activeTab === tab.id
                  ? "bg-primary/5 border-primary shadow-sm"
                  : "bg-card hover:shadow-sm"
              }`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? "text-primary" : "text-muted-foreground"} />
              <span className={`text-sm font-semibold mt-2 ${activeTab === tab.id ? "text-primary" : ""}`}>
                {tab.label}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 rounded-lg border bg-card">
          {activeTab === "members" && canMembers && <MemberRegistry />}
          {activeTab === "messages" && <ContactMessages />}
          {activeTab === "gallery" && <GalleryAdmin />}
          {activeTab === "siteimages" && <SiteImagesAdmin />}
          {activeTab === "sources" && <SourcesAdmin />}
          {activeTab === "visitor" && <VisitorHighlightsAdmin />}
        </div>
      </motion.div>
    </div>
  );
};

export default Admin;
