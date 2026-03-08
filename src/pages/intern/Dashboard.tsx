import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Megaphone, Vote, LogOut, Settings, User, CalendarDays } from "lucide-react";

const cards = [
  { title: "Veranstaltungen", desc: "Termine planen, zusagen und Kalender synchronisieren.", icon: CalendarDays, path: "/intern/veranstaltungen" },
  { title: "Quellensammlung", desc: "Quellen nach Epoche durchsuchen und hinzufügen.", icon: BookOpen, path: "/intern/quellen" },
  { title: "Versammlungen", desc: "Ankündigungen, MV-Einladungen und Protokolle.", icon: Megaphone, path: "/intern/pinnwand" },
  { title: "Abstimmungen", desc: "Wahlen und Beschlüsse für die Mitgliederversammlung.", icon: Vote, path: "/intern/abstimmungen" },
];

const Dashboard = () => {
  const { user, signOut, isVorstand, isHerold } = useAuth();
  const canAdmin = isVorstand || isHerold;

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">Mitgliederbereich</h1>
            <p className="text-sm text-muted-foreground mt-1 break-all sm:break-normal">
              Angemeldet als {user?.email}
              {isVorstand && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Vorstand</span>}
              {isHerold && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Herold</span>}
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
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              <LogOut size={16} /> Abmelden
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={card.path}
                className="flex flex-col p-6 rounded-lg border bg-card hover:shadow-md transition-shadow h-full"
              >
                <card.icon size={28} className="text-primary mb-3" />
                <h2 className="font-serif text-lg font-semibold mb-1">{card.title}</h2>
                <p className="text-sm text-muted-foreground">{card.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
