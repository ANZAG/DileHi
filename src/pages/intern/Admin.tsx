import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users, Image, BookOpen, Mail, Eye, Shield, FileText, MessageSquare } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import GalleryAdmin from "@/components/admin/GalleryAdmin";
import SourcesAdmin from "@/components/admin/SourcesAdmin";
import VisitorHighlightsAdmin from "@/components/admin/VisitorHighlightsAdmin";
import SiteImagesAdmin from "@/components/admin/SiteImagesAdmin";
import MemberRegistry from "@/components/admin/MemberRegistry";
import ContactMessages from "@/components/admin/ContactMessages";
import RolesPermissionsPanel from "@/components/admin/RolesPermissionsPanel";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import ForumCategoriesAdmin from "@/components/admin/ForumCategoriesAdmin";

type AdminTab = "members" | "gallery" | "siteimages" | "sources" | "visitor" | "messages" | "permissions" | "audit" | "forum";

const Admin = () => {
  const { hasPermission } = useAuth();
  const canAdmin = hasPermission("admin.access");
  const canMembers = hasPermission("members.manage");
  const canRoles = hasPermission("roles.manage");
  const canAudit = hasPermission("audit.view");
  const canForumCategories = hasPermission("forum.categories_manage");

  const defaultTab: AdminTab = canMembers ? "members" : "gallery";
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);

  if (!canAdmin) return <Navigate to="/intern" replace />;

  const tabs = [
    ...(canMembers ? [
      { id: "members" as const, label: "Mitglieder", icon: Users, desc: "Register, Einladungen und Rollen" },
    ] : []),
    { id: "messages" as const, label: "Kontaktanfragen", icon: Mail, desc: "Nachrichten vom Kontaktformular" },
    ...(hasPermission("gallery.manage") ? [
      { id: "gallery" as const, label: "Galerie", icon: Image, desc: "Bilder verwalten" },
    ] : []),
    ...(hasPermission("site_images.manage") ? [
      { id: "siteimages" as const, label: "Seitenbilder", icon: Image, desc: "Bilder auf allen Seiten pflegen" },
    ] : []),
    ...(hasPermission("epoch_sources.manage") ? [
      { id: "sources" as const, label: "Quellen", icon: BookOpen, desc: "Epochen-Quellenangaben pflegen" },
    ] : []),
    ...(hasPermission("visitor_highlights.manage") ? [
      { id: "visitor" as const, label: "Besucher-Highlights", icon: Eye, desc: "Stichpunkte für Besuchersektion" },
    ] : []),
    ...(canRoles ? [
      { id: "permissions" as const, label: "Berechtigungen", icon: Shield, desc: "Rollen & Rechte verwalten" },
    ] : []),
    ...(canAudit ? [
      { id: "audit" as const, label: "Audit-Log", icon: FileText, desc: "Abstimmungsprotokoll einsehen" },
    ] : []),
  ];

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6">
          <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <h1 className="font-serif text-2xl font-bold">Verwaltung</h1>
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
          {activeTab === "gallery" && hasPermission("gallery.manage") && <GalleryAdmin />}
          {activeTab === "siteimages" && hasPermission("site_images.manage") && <SiteImagesAdmin />}
          {activeTab === "sources" && hasPermission("epoch_sources.manage") && <SourcesAdmin />}
          {activeTab === "visitor" && hasPermission("visitor_highlights.manage") && <VisitorHighlightsAdmin />}
          {activeTab === "permissions" && canRoles && <RolesPermissionsPanel />}
          {activeTab === "audit" && canAudit && <AuditLogPanel />}
        </div>
      </motion.div>
    </div>
  );
};

export default Admin;
