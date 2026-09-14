import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, MessageSquare, Plus, Megaphone, CalendarDays, Wrench, BookOpen,
  Users, Lightbulb, Shield, Swords, Target, Hammer, Tent, Coins, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { fetchCategories, fetchCategoryStats, fetchUnreadThreads, saveCategory } from "@/components/forum/api";
import { SEITE } from "@/lib/layout";

/**
 * Auswählbare Symbole für Rubriken.
 *
 * Bewusst eine feste Liste statt `import * as Icons`: Der Sternchen-Import zieht
 * die komplette Icon-Bibliothek ins Bundle – im Forum-Chunk waren das 724 kB
 * für ein knappes Dutzend tatsächlich benutzter Symbole.
 */
const ICONS: Record<string, React.ElementType> = {
  MessageSquare, Megaphone, CalendarDays, Wrench, BookOpen,
  Users, Lightbulb, Shield, Swords, Target, Hammer, Tent, Coins,
};

const iconFor = (name: string) => ICONS[name] ?? MessageSquare;

export default function Forum() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission("forum.categories_manage");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: fetchCategories,
  });

  const [proposing, setProposing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: stats = {} } = useQuery({
    queryKey: ["forum-category-stats", user?.id],
    queryFn: () => fetchCategoryStats(user?.id),
    enabled: !!user,
  });

  /*
   * „Ungelesen" als eigene Ansicht über alle Rubriken.
   *
   * Wer nach ein paar Tagen wiederkommt, will wissen, was los war – nicht
   * sieben Rubriken nacheinander öffnen. Die Ansicht steht in der Adresse,
   * damit „Zurück" aus einem Thema wieder hier landet.
   */
  const [params, setParams] = useSearchParams();
  const nurUngelesen = params.get("ansicht") === "ungelesen";
  const { data: ungelesen = [] } = useQuery({
    queryKey: ["forum-unread", user?.id],
    queryFn: () => fetchUnreadThreads(user!.id),
    enabled: !!user,
  });
  const rubrikName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  // Mitglieder duerfen vorschlagen; freigeschaltet wird in der Verwaltung.
  const propose = useMutation({
    mutationFn: () =>
      saveCategory({
        name: name.trim(),
        description: description.trim() || null,
        status: "vorgeschlagen",
        sort_order: 999,
        created_by: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      setProposing(false); setName(""); setDescription("");
      toast({
        title: "Vorschlag eingereicht",
        description: "Die Moderation schaltet die Rubrik frei, dann erscheint sie hier.",
      });
    },
    onError: (err: Error) =>
      toast({ title: "Vorschlag fehlgeschlagen", description: err.message, variant: "destructive" }),
  });

  const active = categories.filter((c) => c.status === "aktiv");
  const proposed = categories.filter((c) => c.status === "vorgeschlagen");

  return (
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild aria-label="Zurück">
            <Link to="/intern"><ArrowLeft size={20} /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">Forum</h1>
            <p className="text-sm text-muted-foreground">Absprachen, Fragen und alles dazwischen</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(ungelesen.length > 0 || nurUngelesen) && (
              <Button
                variant={nurUngelesen ? "default" : "outline"}
                size="sm"
                aria-pressed={nurUngelesen}
                onClick={() => setParams(nurUngelesen ? {} : { ansicht: "ungelesen" })}
              >
                <CircleDot size={15} className="mr-1" /> Ungelesen
                {ungelesen.length > 0 && <span className="ml-1 tabular-nums">({ungelesen.length})</span>}
              </Button>
            )}
            {!proposing && !nurUngelesen && (
              <Button variant="outline" size="sm" onClick={() => setProposing(true)}>
                <Plus size={15} className="mr-1" /> Rubrik vorschlagen
              </Button>
            )}
          </div>
        </div>

        {proposing && (
          <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
            <div>
              <Label htmlFor="cat-name" className="text-sm">Wie soll die Rubrik heißen?</Label>
              <Input id="cat-name" value={name} autoFocus
                onChange={(e) => setName(e.target.value)} placeholder="z.B. Reisen &amp; Fahrgemeinschaften" />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="text-sm">Wofür ist sie gedacht? (optional)</Label>
              <Input id="cat-desc" value={description}
                onChange={(e) => setDescription(e.target.value)} placeholder="Ein Satz genügt" />
            </div>
            <p className="text-xs text-muted-foreground">
              Dein Vorschlag geht an die Moderation. Sobald er freigegeben ist, erscheint die Rubrik hier.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setProposing(false); setName(""); setDescription(""); }}>
                Abbrechen
              </Button>
              <Button onClick={() => propose.mutate()} disabled={!name.trim() || propose.isPending}>
                {propose.isPending ? "Wird gesendet …" : "Vorschlagen"}
              </Button>
            </div>
          </div>
        )}

        {nurUngelesen ? (
          ungelesen.length === 0 ? (
            <div className="py-16 text-center border rounded-lg bg-card">
              <MessageSquare className="mx-auto mb-3 text-muted-foreground" size={30} />
              <p className="text-sm text-muted-foreground">Alles gelesen.</p>
            </div>
          ) : (
            <ul className="divide-y rounded-lg border bg-card overflow-hidden">
              {ungelesen.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/intern/forum/thema/${t.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors group"
                  >
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold group-hover:text-primary transition-colors break-words">
                        {t.title}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {rubrikName(t.category_id)} · letzter Beitrag{" "}
                        {formatDistanceToNow(parseISO(t.last_post_at), { locale: de, addSuffix: true })}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {t.post_count} {t.post_count === 1 ? "Beitrag" : "Beiträge"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Lade Rubriken …</div>
        ) : (
          <div className="space-y-2">
            {active.map((c) => {
              const Icon = iconFor(c.icon);
              const stat = stats[c.id] ?? { threads: 0, unread: 0 };
              return (
                <Link
                  key={c.id}
                  to={`/intern/forum/${c.slug}`}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold group-hover:text-primary transition-colors">{c.name}</span>
                      {stat.unread > 0 && (
                        <span className="text-xs font-medium bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                          {stat.unread} neu
                        </span>
                      )}
                    </span>
                    {c.description && (
                      <span className="block text-sm text-muted-foreground mt-0.5">{c.description}</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {stat.threads} {stat.threads === 1 ? "Thema" : "Themen"}
                  </span>
                </Link>
              );
            })}

            {active.length === 0 && (
              <div className="py-16 text-center border rounded-lg bg-card">
                <MessageSquare className="mx-auto mb-3 text-muted-foreground" size={30} />
                <p className="text-sm text-muted-foreground">Noch keine Rubriken freigegeben.</p>
              </div>
            )}
          </div>
        )}

        {!nurUngelesen && proposed.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Vorgeschlagen {canManage ? "– warten auf Freigabe" : ""}
            </h2>
            <div className="space-y-2">
              {proposed.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed">
                  <span className="text-sm">{c.name}</span>
                  {c.description && (
                    <span className="text-xs text-muted-foreground truncate">{c.description}</span>
                  )}
                  {canManage && (
                    <Button variant="outline" size="sm" className="ml-auto shrink-0" asChild>
                      <Link to="/intern/verwaltung">Freigeben</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
