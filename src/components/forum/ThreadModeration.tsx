import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Pin, Lock, LockOpen, Archive, ArchiveRestore, Pencil, Trash2, FolderInput, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { deleteThread, fetchCategories, updateThread, type ForumThread } from "./api";

/**
 * Die Moderationsleiste über einem Thema.
 *
 * Die Rechte dafür standen von Anfang an in der Datenbank – anheften,
 * schliessen, archivieren, verschieben, löschen. Nur gab es keinen einzigen
 * Knopf dafür; der einzige Hinweis im Forum verwies auf eine Verwaltungsseite,
 * die es gar nicht gibt. Wer moderieren durfte, konnte es faktisch nicht.
 */
export default function ThreadModeration({ thread }: { thread: ForumThread }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [umbenennen, setUmbenennen] = useState(false);
  const [titel, setTitel] = useState(thread.title);

  const { data: categories = [] } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: fetchCategories,
  });

  const frisch = () => {
    queryClient.invalidateQueries({ queryKey: ["forum-thread", thread.id] });
    queryClient.invalidateQueries({ queryKey: ["forum-threads"] });
    queryClient.invalidateQueries({ queryKey: ["forum-category-stats"] });
  };

  const aendern = useMutation({
    mutationFn: (patch: Parameters<typeof updateThread>[1]) => updateThread(thread.id, patch),
    onSuccess: () => {
      setUmbenennen(false);
      frisch();
    },
    onError: (err: Error) =>
      toast({ title: "Ging nicht", description: err.message, variant: "destructive" }),
  });

  const entfernen = useMutation({
    mutationFn: () => deleteThread(thread.id),
    onSuccess: () => {
      toast({ title: "Thema gelöscht" });
      frisch();
      navigate("/intern/forum");
    },
    onError: (err: Error) =>
      toast({ title: "Ging nicht", description: err.message, variant: "destructive" }),
  });

  // Zu einer laufenden Veranstaltung gehört die Absprache dazu: Sie wird nicht
  // von Hand archiviert und nicht gelöscht, sondern verschwindet mit dem
  // Termin. Nach dem Termin darf die Moderation archivieren – automatisch
  // passiert das nicht, weil Nachbesprechungen noch ein paar Tage brauchen.
  const gehoertZuTermin = !!thread.event_id;
  const terminVorbei =
    !thread.event_ends_on || new Date(thread.event_ends_on) < new Date(new Date().toDateString());
  const darfArchivieren = !gehoertZuTermin || terminVorbei;
  const darfLoeschen = !gehoertZuTermin;

  // Verschieben nur in Rubriken, die Themen von Hand annehmen – sonst landet
  // ein normales Thema in der Terminrubrik und lässt sich nicht erklären.
  const zielRubriken = categories.filter(
    (c) => c.status === "aktiv" && !c.only_auto_threads && c.id !== thread.category_id
  );

  const knopf = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    disabled = false,
    titleWennGesperrt?: string
  ) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 text-xs text-muted-foreground"
      disabled={disabled || aendern.isPending}
      title={disabled ? titleWennGesperrt : label}
      onClick={onClick}
    >
      {icon}
      <span className="ml-1 hidden sm:inline">{label}</span>
    </Button>
  );

  return (
    <div className="rounded-lg border bg-muted/30 px-2 py-1.5 mb-4">
      <div className="flex flex-wrap items-center gap-0.5">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground px-1.5">
          <Shield size={13} /> Moderation
        </span>

        {knopf(
          thread.is_pinned ? "Lösen" : "Anheften",
          <Pin size={14} />,
          () => aendern.mutate({ is_pinned: !thread.is_pinned })
        )}

        {knopf(
          thread.is_locked ? "Öffnen" : "Schließen",
          thread.is_locked ? <LockOpen size={14} /> : <Lock size={14} />,
          () => aendern.mutate({ is_locked: !thread.is_locked })
        )}

        {knopf(
          thread.is_archived ? "Aus dem Archiv" : "Archivieren",
          thread.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
          () => aendern.mutate({ is_archived: !thread.is_archived }),
          !thread.is_archived && !darfArchivieren,
          "Solange der Termin läuft, gehört die Absprache dazu."
        )}

        {knopf("Umbenennen", <Pencil size={14} />, () => {
          setTitel(thread.title);
          setUmbenennen(true);
        })}

        {zielRubriken.length > 0 && (
          <Select
            value=""
            onValueChange={(v) => aendern.mutate({ category_id: v })}
          >
            <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-transparent px-2 text-xs text-muted-foreground shadow-none">
              <FolderInput size={14} />
              <span className="hidden sm:inline">Verschieben</span>
            </SelectTrigger>
            <SelectContent>
              {zielRubriken.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <span className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive"
            disabled={!darfLoeschen || entfernen.isPending}
            title={darfLoeschen ? "Löschen" : "Verschwindet mit dem Termin."}
            onClick={() => {
              if (confirm(`Thema „${thread.title}" mit allen Beiträgen löschen?`)) entfernen.mutate();
            }}
          >
            <Trash2 size={14} />
            <span className="ml-1 hidden sm:inline">Löschen</span>
          </Button>
        </span>
      </div>

      {umbenennen && (
        <div className="flex gap-2 mt-2">
          <Input
            value={titel}
            autoFocus
            onChange={(e) => setTitel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && titel.trim()) aendern.mutate({ title: titel });
              if (e.key === "Escape") setUmbenennen(false);
            }}
          />
          <Button size="sm" disabled={!titel.trim() || aendern.isPending} onClick={() => aendern.mutate({ title: titel })}>
            Speichern
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setUmbenennen(false)}>Abbrechen</Button>
        </div>
      )}

      {gehoertZuTermin && (
        <p className="text-xs text-muted-foreground px-1.5 pt-1.5">
          Gehört zu einer Veranstaltung.{" "}
          {terminVorbei
            ? "Der Termin ist vorbei – archivieren ist jetzt möglich."
            : "Löschen und Archivieren laufen über den Termin selbst."}
        </p>
      )}
    </div>
  );
}
