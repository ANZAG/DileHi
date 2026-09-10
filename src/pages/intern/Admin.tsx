import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
// Jede Kachel ein eigenes Symbol: Sechs Paare teilten sich vorher eines, und
// beim Suchen zaehlt die Form, bevor man den Text liest.
import {
  ArrowLeft, Users, UserCog, Image, Palette, BookOpen, Tags, Mail, MailPlus,
  Eye, Shield, FileText, FileSignature, History, ClipboardList, ListChecks,
  Menu as MenuIcon, ScrollText, Code2, MessagesSquare, PackageOpen, Compass,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import GalleryAdmin from "@/components/admin/GalleryAdmin";
import SourcesAdmin from "@/components/admin/SourcesAdmin";
import VisitorHighlightsAdmin from "@/components/admin/VisitorHighlightsAdmin";
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
import VorlagenAdmin from "@/components/admin/VorlagenAdmin";
import AufnahmeantragAdmin from "@/components/admin/AufnahmeantragAdmin";
import ProfilfelderAdmin from "@/components/admin/ProfilfelderAdmin";
import ModuleAdmin from "@/components/admin/ModuleAdmin";
import { useModule, nurAktive } from "@/hooks/useModule";
import MenueAdmin from "@/components/admin/MenueAdmin";
import KategorienAdmin from "@/components/admin/KategorienAdmin";
import OnboardingAdmin from "@/components/admin/OnboardingAdmin";
import { SEITE } from "@/lib/layout";

type AdminTab = "members" | "applications" | "gallery" | "sources" | "visitor" | "messages" | "permissions" | "audit" | "formtemplate" | "personas" | "embed" | "forum" | "sitepages" | "menue" | "kategorien" | "erscheinungsbild" | "vorlagen" | "aufnahmeantrag" | "profilfelder" | "module" | "erstesschritte";


const Admin = () => {
  const { hasPermission } = useAuth();
  const canAdmin = hasPermission("admin.access");
  const canMembers = hasPermission("members.manage");
  const canRoles = hasPermission("roles.manage");
  const canAudit = hasPermission("audit.view");
  // Ganz oben, nicht erst bei den Kacheln: Unter dieser Zeile steht ein
  // vorzeitiges return fuer Leute ohne Zugang, und ein Hook dahinter liefe
  // nicht bei jedem Aufbau.
  const { data: module } = useModule();

  const defaultTab: AdminTab = canMembers ? "members" : "gallery";
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);
  // Welcher Reiter offen ist. null heisst „der, in dem das Geöffnete liegt".
  const [offeneGruppeTitel, setOffeneGruppeTitel] = useState<string | null>(null);

  /*
   * Die Führung zeigt auf eine Kachel, die hinter einem Reiter liegt.
   *
   * Sie sagt vorher an, worauf sie zielt („tour-anker"). Liegt das Ziel hier,
   * wird der Reiter geöffnet, damit es überhaupt im Dokument steht – sonst
   * suchte die Hervorhebung ein Element, das es gerade nicht gibt.
   */
  useEffect(() => {
    const hoeren = (e: Event) => {
      const anker = (e as CustomEvent<{ anker?: string }>).detail?.anker;
      if (!anker?.startsWith("kachel-")) return;
      setActiveTab(anker.slice("kachel-".length) as AdminTab);
      setOffeneGruppeTitel(null);
    };
    window.addEventListener("tour-anker", hoeren);
    return () => window.removeEventListener("tour-anker", hoeren);
  }, []);

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
      { id: "applications" as const, gruppe: "personen", label: "Anträge", icon: ClipboardList, desc: "Mitgliedsanträge prüfen" , modul: "applications"},
    ] : []),
    { id: "messages" as const, gruppe: "personen", label: "Kontaktanfragen", icon: Mail, desc: "Nachrichten vom Kontaktformular" , modul: "contact"},
    ...(hasPermission("site.content_edit") || hasPermission("site.layout_edit") ? [
      { id: "sitepages" as const, gruppe: "website", label: "Seiten", icon: FileText, desc: "Öffentliche Seiten zusammenstellen" },
    ] : []),
    ...(hasPermission("site.layout_edit") ? [
      { id: "menue" as const, gruppe: "website", label: "Menü", icon: MenuIcon, desc: "Punkte in der Kopfzeile" },
    ] : []),
    ...(hasPermission("gallery.manage") ? [
      { id: "gallery" as const, gruppe: "website", label: "Galerie", icon: Image, desc: "Bilder der Website verwalten" , modul: "gallery"},
    ] : []),
    ...(hasPermission("epoch_sources.manage") ? [
      { id: "sources" as const, gruppe: "website", label: "Quellen", icon: BookOpen, desc: "Quellenangaben je Kategorie" , modul: "sources"},
    ] : []),
    ...(hasPermission("visitor_highlights.manage") ? [
      { id: "visitor" as const, gruppe: "website", label: "Besucher-Highlights", icon: Eye, desc: "Stichpunkte je Kategorie" , modul: "besucher_highlights"},
    ] : []),
    ...(hasPermission("personas.publish") ? [
      { id: "personas" as const, gruppe: "website", label: "Darstellungen", icon: ScrollText, desc: "Steckbriefe für die Website" , modul: "personas"},
    ] : []),
    ...(hasPermission("site.content_edit") || hasPermission("gallery.manage") ? [
      { id: "kategorien" as const, gruppe: "website", label: "Kategorien", icon: Tags, desc: "Ordnen Bilder, Quellen und Stichpunkte" },
    ] : []),
    ...(hasPermission("system.integrations") ? [
      { id: "embed" as const, gruppe: "website", label: "Einbindung", icon: Code2, desc: "Inhalte auf fremden Seiten zeigen" , modul: "einbindung"},
    ] : []),
    ...(hasPermission("system.settings") ? [
      { id: "erscheinungsbild" as const, gruppe: "system", label: "Erscheinungsbild", icon: Palette, desc: "Name, Logo, Farben, Schriften, E-Mail" },
      { id: "vorlagen" as const, gruppe: "system", label: "E-Mail-Vorlagen", icon: MailPlus, desc: "Texte der versendeten Mails" },
      { id: "aufnahmeantrag" as const, gruppe: "system", label: "Aufnahmeantrag", icon: FileSignature, desc: "Felder, Texte und Satzungsverweis" , modul: "applications"},
      { id: "profilfelder" as const, gruppe: "system", label: "Mitgliederprofil", icon: UserCog, desc: "Welche Angaben Mitglieder pflegen" },
      { id: "erstesschritte" as const, gruppe: "system", label: "Erste Schritte", icon: Compass, desc: "Die Einführung für neue Mitglieder" },
    ] : []),
    ...(hasPermission("forum.categories_manage") ? [
      { id: "forum" as const, gruppe: "system", label: "Forum-Rubriken", icon: MessagesSquare, desc: "Rubriken und wer darin schreiben darf" , modul: "forum"},
    ] : []),
    ...(hasPermission("events.moderate") ? [
      { id: "formtemplate" as const, gruppe: "system", label: "Umfrage-Vorlage", icon: ListChecks, desc: "Standardfragen für neue Anmeldungen" , modul: "event_forms"},
    ] : []),
    ...(hasPermission("system.modules") ? [
      { id: "module" as const, gruppe: "system", label: "Module", icon: PackageOpen, desc: "Welche Bereiche der Verein nutzt" },
    ] : []),
    ...(canRoles ? [
      { id: "permissions" as const, gruppe: "system", label: "Berechtigungen", icon: Shield, desc: "Rollen und ihre Rechte" },
    ] : []),
    ...(canAudit ? [
      { id: "audit" as const, gruppe: "system", label: "Audit-Log", icon: History, desc: "Wer hat was geändert" },
    ] : []),
  ];

  // Kacheln abgeschalteter Module fallen hier weg – an einer Stelle, nicht in
  // jeder Zeile der Liste darueber.
  const sichtbareTabs = nurAktive(alleTabs, module);

  const gruppen: { titel: string; tabs: typeof alleTabs }[] = [];
  for (const [schluessel, titel] of [
    ["personen", "Mitglieder und Anfragen"],
    ["website", "Öffentliche Website"],
    ["system", "Allgemeine Einstellungen"],
  ] as const) {
    const tabs = sichtbareTabs.filter((t) => t.gruppe === schluessel);
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
    <div className={SEITE}>
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
                    // Ziel der Hervorhebung in der Fuehrung. Die Kachel liegt
                    // hinter einem Reiter, deshalb oeffnet die Fuehrung die
                    // Gruppe selbst, bevor sie sucht (siehe unten).
                    data-tour={`kachel-${tab.id}`}
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
          {activeTab === "vorlagen" && hasPermission("system.settings") && <VorlagenAdmin />}
          {activeTab === "aufnahmeantrag" && hasPermission("system.settings") && <AufnahmeantragAdmin />}
          {activeTab === "profilfelder" && hasPermission("system.settings") && <ProfilfelderAdmin />}
          {activeTab === "module" && hasPermission("system.modules") && <ModuleAdmin />}
          {activeTab === "erstesschritte" && hasPermission("system.settings") && <OnboardingAdmin />}
          {activeTab === "gallery" && hasPermission("gallery.manage") && <GalleryAdmin />}
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
