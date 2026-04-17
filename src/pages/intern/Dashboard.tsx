import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Megaphone, Vote, LogOut, Settings, User, CalendarDays,
  FileText, Coins, MapPin, ClipboardList,
} from "lucide-react";

const baseCards = [
  { title: "Veranstaltungen", desc: "Termine planen, zusagen und Kalender synchronisieren.", icon: CalendarDays, path: "/intern/veranstaltungen" },
  { title: "Versammlungen", desc: "Ankündigungen, MV-Einladungen und Protokolle.", icon: Megaphone, path: "/intern/pinnwand" },
  { title: "Abstimmungen", desc: "Wahlen und Beschlüsse der MV.", icon: Vote, path: "/intern/abstimmungen" },
  { title: "Dokumente", desc: "Satzung, Ordnungen und Tätigkeitsberichte.", icon: FileText, path: "/intern/dokumente" },
  { title: "Quellensammlung", desc: "Quellen nach Epoche durchsuchen und hinzufügen.", icon: BookOpen, path: "/intern/quellen" },
  { title: "Mitgliederkarte", desc: "Wohnorte der Mitglieder auf einer Karte.", icon: MapPin, path: "/intern/karte" },
];

const Dashboard = () => {
  const { user, signOut, isVorstand, isHerold, isSchatzmeister, hasPermission } = useAuth();
  const canAdmin = hasPermission("admin.access");

  // Veranstaltungs-Auswertungen: zeigen, wenn Vorstand ODER Organisator eines aktuellen/zukünftigen Events
  const { data: organizedEvents = [] } = useQuery({
    queryKey: ["my-organized-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const todayIso = new Date().toISOString().slice(0, 10);
      const query = supabase
        .from("events")
        .select("id, title, start_date, end_date, created_by")
        .gte("start_date", todayIso)
        .order("start_date", { ascending: true })
        .limit(10);
      // Vorstand sieht alle aktuellen/künftigen, sonst nur eigene
      const { data, error } = isVorstand
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
          title: "Auswertungen",
          desc: "Anmeldungen & Logistik deiner Veranstaltungen.",
          icon: ClipboardList,
          path: `/intern/veranstaltungen/${organizedEvents[0].id}/auswertung`,
          isEval: true as const,
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
            <p className="text-sm text-muted-foreground mt-1 break-all sm:break-normal">
              Angemeldet als {user?.email}
              {isVorstand && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Vorstand</span>}
              {isHerold && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Herold</span>}
              {isSchatzmeister && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Schatzmeister</span>}
            </p>
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

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
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
                {card.isEval && organizedEvents.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
                    {organizedEvents.slice(0, 3).map((ev: any) => (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.preventDefault(); window.location.href = `/intern/veranstaltungen/${ev.id}/auswertung`; }}
                        className="block w-full text-left text-[11px] sm:text-xs text-muted-foreground hover:text-primary truncate"
                      >
                        → {ev.title}
                      </button>
                    ))}
                    {organizedEvents.length > 3 && (
                      <span className="block text-[10px] text-muted-foreground/70">+{organizedEvents.length - 3} weitere</span>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
