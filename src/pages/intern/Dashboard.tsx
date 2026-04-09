import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Megaphone, Vote, LogOut, Settings, User, CalendarDays, FileText, Coins, MapPin, MessageSquare } from "lucide-react";


const baseCards = [
  { title: "Veranstaltungen", desc: "Termine planen, zusagen und Kalender synchronisieren.", icon: CalendarDays, path: "/intern/veranstaltungen" },
  { title: "Versammlungen", desc: "Ankündigungen, MV-Einladungen und Protokolle.", icon: Megaphone, path: "/intern/pinnwand" },
  { title: "Abstimmungen", desc: "Wahlen und Beschlüsse der MV.", icon: Vote, path: "/intern/abstimmungen" },
  { title: "Dokumente", desc: "Satzung, Ordnungen und Tätigkeitsberichte.", icon: FileText, path: "/intern/dokumente" },
  { title: "Forum", desc: "Diskussionen und Austausch.", icon: MessageSquare, path: "/intern/forum" },
  { title: "Quellensammlung", desc: "Quellen nach Epoche durchsuchen und hinzufügen.", icon: BookOpen, path: "/intern/quellen" },
];

const Dashboard = () => {
  const { user, signOut, isVorstand, isHerold, isSchatzmeister, hasPermission } = useAuth();
  const canAdmin = hasPermission("admin.access");
  const cards = baseCards;

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
          {cards.map((card, i) => (
            <motion.div
              key={card.path}
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
