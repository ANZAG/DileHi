import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users, Image, BookOpen, Mail, Eye, Shield, FileText, ClipboardList, ListChecks, ScrollText, Code2, MessagesSquare } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import GalleryAdmin from "@/components/admin/GalleryAdmin";
import SourcesAdmin from "@/components/admin/SourcesAdmin";
import VisitorHighlightsAdmin from "@/components/admin/VisitorHighlightsAdmin";
import SiteImagesAdmin from "@/components/admin/SiteImagesAdmin";
import MemberRegistry from "@/components/admin/MemberRegistry";
import ContactMessages from "@/components/admin/ContactMessages";
import RolesPermissionsPanel from "@/components/admin/RolesPermissionsPanel";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import MemberApplicationsAdmin from "@/components/admin/MemberApplicationsAdmin";
import FormTemplateAdmin from "@/components/admin/FormTemplateAdmin";
import PersonaPublishAdmin from "@/components/admin/PersonaPublishAdmin";
import EmbedAdmin from "@/components/admin/EmbedAdmin";
import ForumCategoriesAdmin from "@/components/admin/ForumCategoriesAdmin";
import SitePagesAdmin from "@/components/admin/SitePagesAdmin";
import ErscheinungsbildAdmin from "@/components/admin/ErscheinungsbildAdmin";
import MenueAdmin from "@/components/admin/MenueAdmin";
import KategorienAdmin from "@/components/admin/KategorienAdmin";

type AdminTab = "members" | "applications" | "gallery" | "siteimages" | "sources" | "visitor" | "messages" | "permissions" | "audit" | "formtemplate" | "personas" | "embed" | "forum" | "sitepages" | "menue" | "kategorien" | "erscheinungsbild";


const Admin = () => {
  const { hasPermission } = useAuth();
  const canAdmin = hasPermission("admin.access");
  const canMembers = hasPermission("members.manage");
  const canRoles = hasPermission("roles.manage");
  const canAudit = hasPermission("audit.view");

  const defaultTab: AdminTab = canMembers ? "members" : "gallery";
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);
  // Welcher Reiter offen ist. null heisst „der, in dem das Geöffnete liegt".
  const [offeneGruppeTitel, setOffeneGruppeTitel] = useState<string | null>(null);

  if (!canAdmin) return <Navigate to="/intern" replace />;

  /**
   * Die Kacheln, nach Gruppen sortiert.
   *
   * Dreizehn Kacheln in einem Raster sind kein Überblick mehr, sondern eine
   * Wand – und es werden mehr. Die Gruppen entsprechen der Frage, die jemand
   * im Kopf hat, wenn er hierher kommt: „Es geht um eine Person", „es geht um
   * die öffentliche Seite", „es geht um den Mitgliederbereich", „es geht um
   * die Technik". Versteckt wird nichts: Der Überblick ist ja gerade der
   * Vorteil dieser Seite.
   */
  const alleTabs = [
    ...(canMembers ? [
      { id: "members" as const, gruppe: "personen", label: "Mitglieder", icon: Users, desc: "Register, Einladungen und Rollen" },
      { id: "applications" as const, gruppe: "personen", label: "Anträge", icon: ClipboardList, desc: "Mitgliedsanträge prüfen" },
    ] : []),
    { id: "messages" as const, gruppe: "personen", label: "Kontaktanfragen", icon: Mail, desc: "Nachrichten vom Kontaktformular" },
    ...(hasPermission("site.content_edit") || hasPermission("site.layout_edit") ? [
      { id: "sitepages" as const, gruppe: "website", label: "Seiten", icon: FileText, desc: "Öffentliche Seiten zusammenstellen" },
    ] : []),
    ...(hasPermission("site.layout_edit") ? [
      { id: "menue" as const, gruppe: "website", label: "Menü", icon: ListChecks, desc: "Punkte in der Kopfzeile" },
    ] : []),
    ...(hasPermission("gallery.manage") ? [
      { id: "gallery" as const, gruppe: "website", label: "Galerie", icon: Image, desc: "Bilder verwalten" },
    ] : []),
    ...(hasPermission("site.content_edit") || hasPermission("gallery.manage") ? [
      { id: "kategorien" as const, gruppe: "website", label: "Kategorien", icon: BookOpen, desc: "Ordnen Galerien und Quellen" },
    ] : []),
    ...(hasPermission("site_images.manage") ? [
      { id: "siteimages" as const, gruppe: "website", label: "Seitenbilder", icon: Image, desc: "Bilder auf allen Seiten pflegen" },
    ] : []),
    ...(hasPermission("epoch_sources.manage") ? [
      { id: "sources" as const, gruppe: "website", label: "Quellen", icon: BookOpen, desc: "Epochen-Quellenangaben pflegen" },
    ] : []),
    ...(hasPermission("visitor_highlights.manage") ? [
      { id: "visitor" as const, gruppe: "website", label: "Besucher-Highlights", icon: Eye, desc: "Stichpunkte für Besuchersektion" },
    ] : []),
    ...(hasPermission("personas.publish") ? [
      { id: "personas" as const, gruppe: "website", label: "Darstellungen", icon: ScrollText, desc: "Für die Website freigeben" },
    ] : []),
    ...(hasPermission("system.integrations") ? [
      { id: "embed" as const, gruppe: "website", label: "Einbindung", icon: Code2, desc: "Inhalte auf fremden Seiten zeigen" },
    ] : []),
    ...(hasPermission("forum.categories_manage") ? [
      { id: "forum" as const, gruppe: "intern", label: "Forum-Rubriken", icon: MessagesSquare, desc: "Rubriken und Rechte" },
    ] : []),
    ...(hasPermission("events.moderate") ? [
      { id: "formtemplate" as const, gruppe: "intern", label: "Umfrage-Vorlage", icon: ListChecks, desc: "Standardvorlage für Anmeldungen" },
    ] : []),
    ...(hasPermission("system.settings") ? [
      { id: "erscheinungsbild" as const, gruppe: "system", label: "Erscheinungsbild", icon: Image, desc: "Name, Logo, Farben, Schriften, E-Mail" },
    ] : []),
    ...(canRoles ? [
      { id: "permissions" as const, gruppe: "system", label: "Berechtigungen", icon: Shield, desc: "Rollen & Rechte verwalten" },
    ] : []),
    ...(canAudit ? [
      { id: "audit" as const, gruppe: "system", label: "Audit-Log", icon: FileText, desc: "Abstimmungsprotokoll einsehen" },
    ] : []),
  ];

  const gruppen: { titel: string; tabs: typeof alleTabs }[] = [];
  for (const [schluessel, titel] of [
    ["personen", "Mitglieder und Anfragen"],
    ["website", "Öffentliche Website"],
    ["intern", "Mitgliederbereich"],
    ["system", "System"],
  ] as const) {
    const tabs = alleTabs.filter((t) => t.gruppe === schluessel);
    // Eine Überschrift ohne Kacheln darunter wäre nur Rauschen – wer die
    // Rechte für eine Gruppe nicht hat, sieht sie gar nicht erst.
    if (tabs.length > 0) gruppen.push({ titel, tabs });
  }

  const offeneGruppe =
    gruppen.find((g) => g.titel === offeneGruppeTitel) ??
    gruppen.find((g) => g.tabs.some((t) => t.id === activeTab)) ??
    gruppen[0];

  /** Reiter wechseln zeigt gleich dessen erste Kachel – wie man es von
   *  Reitern erwartet. Nur umschalten und darunter den alten Inhalt stehen
   *  lassen wäre die verwirrendere Hälfte. */
  const oeffneGruppe = (gruppe: (typeof gruppen)[number]) => {
    setOffeneGruppeTitel(gruppe.titel);
    if (!gruppe.tabs.some((t) => t.id === activeTab) && gruppe.tabs[0]) {
      setActiveTab(gruppe.tabs[0].id);
    }
  };

  return (
    <div className={`container py-8 sm:py-12 px-4 ${activeTab === "formtemplate" ? "max-w-6xl" : "max-w-4xl"}`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6">
          <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <h1 className="font-serif text-2xl font-bold">Verwaltung</h1>
        </div>

        {/* Die Gruppen als Reiter. Nach dem Gruppieren standen dreizehn Kacheln
            untereinander und schoben den eigentlichen Inhalt weit nach unten –
            der Ueberblick war gewonnen, der Platz verloren. So ist beides da:
            vier Reiter in einer Zeile, darunter nur die Kacheln der offenen
            Gruppe. */}
        <div className="mb-4 flex flex-wrap gap-1 border-b">
          {gruppen.map((gruppe) => {
            const aktiv = gruppe === offeneGruppe;
            return (
              <button
                key={gruppe.titel}
                type="button"
                onClick={() => oeffneGruppe(gruppe)}
                aria-current={aktiv ? "true" : undefined}
                className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
                  aktiv
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {gruppe.titel}
              </button>
            );
          })}
        </div>

        <div className="mb-8">
          {offeneGruppe && (
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {offeneGruppe.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={activeTab === tab.id ? "page" : undefined}
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
            </section>
          )}
        </div>

        <div className="p-5 rounded-lg border bg-card">
          {activeTab === "members" && canMembers && <MemberRegistry />}
          {activeTab === "applications" && canMembers && <MemberApplicationsAdmin />}
          {activeTab === "messages" && <ContactMessages />}
          {activeTab === "sitepages" && (hasPermission("site.content_edit") || hasPermission("site.layout_edit")) && <SitePagesAdmin />}
          {activeTab === "menue" && hasPermission("site.layout_edit") && <MenueAdmin />}
          {activeTab === "kategorien" && (hasPermission("site.content_edit") || hasPermission("gallery.manage")) && <KategorienAdmin />}
          {activeTab === "erscheinungsbild" && hasPermission("system.settings") && <ErscheinungsbildAdmin />}
          {activeTab === "gallery" && hasPermission("gallery.manage") && <GalleryAdmin />}
          {activeTab === "siteimages" && hasPermission("site_images.manage") && <SiteImagesAdmin />}
          {activeTab === "sources" && hasPermission("epoch_sources.manage") && <SourcesAdmin />}
          {activeTab === "visitor" && hasPermission("visitor_highlights.manage") && <VisitorHighlightsAdmin />}
          {activeTab === "personas" && hasPermission("personas.publish") && <PersonaPublishAdmin />}
          {activeTab === "embed" && hasPermission("system.integrations") && <EmbedAdmin />}
          {activeTab === "forum" && hasPermission("forum.categories_manage") && <ForumCategoriesAdmin />}
          {activeTab === "permissions" && canRoles && <RolesPermissionsPanel />}
          {activeTab === "audit" && canAudit && <AuditLogPanel />}
          {activeTab === "formtemplate" && hasPermission("events.moderate") && <FormTemplateAdmin />}

        </div>
      </motion.div>
    </div>
  );
};

export default Admin;
