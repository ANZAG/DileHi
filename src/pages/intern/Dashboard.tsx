import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Megaphone, Vote, LogOut, Settings, User, CalendarDays,
  FileText, Coins, MapPin, ClipboardList, ScrollText,
} from "lucide-react";
import BirthdayBanner from "@/components/birthday-banner/BirthdayBanner";

const baseCards = [
  { title: "Veranstaltungen", desc: "Termine planen, zusagen und Kalender synchronisieren.", icon: CalendarDays, path: "/intern/veranstaltungen" },
  { title: "Versammlungen", desc: "Ankündigungen, MV-Einladungen und Protokolle.", icon: Megaphone, path: "/intern/pinnwand" },
  { title: "Abstimmungen", desc: "Wahlen und Beschlüsse der MV.", icon: Vote, path: "/intern/abstimmungen" },
  { title: "Dokumente", desc: "Satzung, Ordnungen und Tätigkeitsberichte.", icon: FileText, path: "/intern/dokumente" },
  { title: "Quellensammlung", desc: "Quellen nach Epoche durchsuchen und hinzufügen.", icon: BookOpen, path: "/intern/quellen" },
  { title: "Mitgliederkarte", desc: "Wohnorte der Mitglieder auf einer Karte.", icon: MapPin, path: "/intern/karte" },
];

const Dashboard = () => {
  const { user, signOut, roles, roleLabels, hasPermission } = useAuth();
  const canAdmin = hasPermission("admin.access");

  // Veranstaltungs-Auswertungen: zeigen, wenn Vorstand ODER Organisator eines aktuellen/zukünftigen Events
  const { data: organizedEvents = [] } = useQuery({
    queryKey: ["my-organized-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const todayIso = new Date().toISOString().slice(0, 10);

      // Nur Events mit existierendem event_form (inner join via select)
      const query = supabase
        .from("events")
        .select("id, title, start_date, end_date, created_by, event_forms!inner(id)")
        .gte("start_date", todayIso)
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

  const showEvalCard = organizedEvents.length > 0;
  const cards = showEvalCard
    ? [
        ...baseCards.slice(0, 1),
        {
          title: "Anmeldungen",
          desc: "Wer kommt, und was dafür gebraucht wird.",
          icon: ClipboardList,
          path: "/intern/auswertungen",
        },
        ...baseCards.slice(1),
      ]
    : baseCards;

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">Mitgliederbereich</h1>
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
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              <User size={16} /> Profil
            </Link>
            {canAdmin && (
              <Link
                to="/intern/verwaltung"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
              >
                <Settings size={16} /> Verwaltung
              </Link>
            )}
            <Link
              to="/intern/beitraege"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              <Coins size={16} /> Beiträge
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              <LogOut size={16} /> Abmelden
            </button>
          </div>
        </div>

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
