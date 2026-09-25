import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { nochAktuellFilter } from "@/components/events/nochAktuell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Megaphone, Vote, LogOut, Settings, User, CalendarDays, MessagesSquare,
  FileText, Coins, MapPin, ClipboardList, ScrollText, Package, Gavel, Receipt, HandCoins,
  Compass,
} from "lucide-react";
import BirthdayBanner from "@/components/birthday-banner/BirthdayBanner";
import { useBranding, useWoerter } from "@/hooks/useBranding";
import { NeuHier, SeitenTitel } from "@/components/onboarding/NeuHier";
import { useModule, onlyActive, moduleOn } from "@/hooks/useModule";
import { SEITE } from "@/lib/layout";

/**
 * Die Kacheln des Mitgliederbereichs.
 *
 * `module` sagt, wozu eine Kachel gehört – gefiltert wird unten an einer
 * Stelle. Eine neue Kachel braucht deshalb keine eigene Abfrage, nur diesen
 * Eintrag.
 */
const baseCards = [
  { title: "Veranstaltungen", desc: "Termine planen, zusagen und Kalender synchronisieren.", icon: CalendarDays, path: "/intern/veranstaltungen", module: "events" },
  { title: "Forum", desc: "Absprachen, Fragen und alles dazwischen.", icon: MessagesSquare, path: "/intern/forum", module: "forum" },
  { title: "Versammlungen", desc: "Ankündigungen, Einladungen und Protokolle.", icon: Megaphone, path: "/intern/versammlungen", module: "announcements" },
  { title: "Abstimmungen", desc: "Wahlen und Abstimmungen, geheim oder offen.", icon: Vote, path: "/intern/abstimmungen", module: "elections" },
  { title: "Beschlüsse", desc: "Was beschlossen wurde – nummeriert und durchsuchbar.", icon: Gavel, path: "/intern/beschluesse", module: "resolutions" },
  { title: "Auslagen", desc: "Auslagen mit Beleg einreichen und erstattet bekommen.", icon: Receipt, path: "/intern/auslagen", module: "expense_claims" },
  { title: "Zuwendungen", desc: "Zuwendungsbestätigungen fürs Finanzamt.", icon: HandCoins, path: "/intern/zuwendungen", module: "donation_receipts" },
  { title: "Dokumente", desc: "Unterlagen zum Nachlesen und Herunterladen.", icon: FileText, path: "/intern/dokumente", module: "documents" },
  { title: "Quellensammlung", desc: "Quellen nach Kategorie durchsuchen und hinzufügen.", icon: BookOpen, path: "/intern/quellen", module: "sources" },
  { title: "Mitgliederkarte", desc: "Wohnorte der Mitglieder auf einer Karte.", icon: MapPin, path: "/intern/karte", module: "member_map" },
  { title: "Inventar", desc: "Was uns gehört, wo es liegt und wer es gerade hat.", icon: Package, path: "/intern/inventar", module: "inventory" },
];

const Dashboard = () => {
  const { user, signOut, roles, roleLabels, hasPermission } = useAuth();
  const canAdmin = hasPermission("admin.access");
  const branding = useBranding();
  const woerter = useWoerter();
  const einrichtungOffen = !branding.setup_done_at;

  // Veranstaltungs-Auswertungen: zeigen, wenn Vorstand ODER Organisator eines aktuellen/zukünftigen Events
  const { data: organizedEvents = [] } = useQuery({
    queryKey: ["my-organized-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Nur Events mit existierendem event_form (inner join via select)
      const query = supabase
        .from("events")
        .select("id, title, start_date, end_date, created_by, event_forms!inner(id)")
        .or(nochAktuellFilter())
        .order("start_date", { ascending: true })
        .limit(10);

      const canModerateEvents = hasPermission("events.moderate");
      const { data, error } = canModerateEvents
        ? await query
        : await query.eq("created_by", user.id);

      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const { data: module } = useModule();

  const showEvalCard = organizedEvents.length > 0 && moduleOn(module, "event_forms");
  const cards = onlyActive(
    showEvalCard
      ? [
          ...baseCards.slice(0, 1),
          {
            title: "Anmeldungen",
            desc: "Wer kommt, und was dafür gebraucht wird.",
            icon: ClipboardList,
            path: "/intern/auswertungen",
            module: "event_forms",
          },
          ...baseCards.slice(1),
        ]
      : baseCards,
    module
  );

  return (
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/*
          Wer als Erster hereinkommt, steht sonst vor einem Bereich, in dem
          nichts steht, und weiss nicht, wo er anfangen soll. Der Streifen
          verschwindet, sobald der Durchlauf beendet ist — und er erscheint nur
          für die, die ihn auch abarbeiten können.
        */}
        {einrichtungOffen && canAdmin ? (
          <Link
            to="/intern/verwaltung?reiter=einrichtung"
            className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm hover:bg-primary/10"
          >
            <Compass size={18} className="text-primary" />
            <span className="font-medium">Die Einrichtung ist noch nicht abgeschlossen.</span>
            <span className="text-muted-foreground">
              Schritt für Schritt durch alles, was {woerter.organisationGenitiv} Installation braucht.
            </span>
            <span className="ml-auto text-primary">Weiter →</span>
          </Link>
        ) : null}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <SeitenTitel tour="start" titel="Rundgang">Mitgliederbereich</SeitenTitel>
            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1 gap-y-1.5">
              <span className="break-all sm:break-normal">Angemeldet als {user?.email}</span>
              {roles.map((r) => (
                <span key={r} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {roleLabels[r] ?? r}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/intern/profil"
              data-tour="knopf-profil"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              <User size={16} /> Profil
            </Link>
            {canAdmin && (
              <Link
                to="/intern/verwaltung"
                data-tour="knopf-verwaltung"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
              >
                <Settings size={16} /> Verwaltung
              </Link>
            )}
            {moduleOn(module, "contributions") && (
            <Link
              to="/intern/beitraege"
              data-tour="knopf-beitraege"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              <Coins size={16} /> Beiträge
            </Link>
            )}
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              <LogOut size={16} /> Abmelden
            </button>
          </div>
        </div>

        <NeuHier tour="start" />

        <BirthdayBanner />

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mt-6">
          {cards.map((card: any, i) => (
            <motion.div
              key={card.path + card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={card.path}
                data-tour={card.module ? `kachel-${card.module}` : undefined}
                className="flex flex-col p-3 sm:p-6 rounded-lg border bg-card hover:shadow-md transition-shadow h-full overflow-hidden"
              >
                <card.icon size={24} className="text-primary mb-2 shrink-0" />
                <h2 className="font-serif text-sm sm:text-lg font-semibold mb-1 break-words hyphens-auto" lang="de">{card.title}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{card.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
