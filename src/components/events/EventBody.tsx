import { Link } from "react-router-dom";
import {
  MapPin, Calendar as CalIcon, Users, Trash2, Check, X, Pencil, Globe,
  FileText, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Event, Attendee } from "./types";
import Linkify from "./Linkify";
import TeilnehmerNachweise from "@/components/nachweise/TeilnehmerNachweise";
import InventarBeiVeranstaltung from "@/components/inventar/InventarBeiVeranstaltung";
import TeilnehmerFuersorge from "@/components/einwilligungen/TeilnehmerFuersorge";

export interface EventBodyProps {
  ev: Event;
  attendees: Attendee[];
  attending: boolean;
  declined: boolean;
  canEdit: boolean;
  formatTimeDisplay: (ev: Event) => string;
  openEdit: (ev: Event) => void;
  deleteEvent: (id: string) => void;
  toggleRSVP: (id: string) => void;
  declineEvent: (id: string) => void;
  toggleRSVPPending: boolean;
  getFormForEvent: (eventId: string) => any;
  getThreadForEvent?: (eventId: string) => { id: string; post_count: number } | undefined;
  hasSubmittedForm: (formId: string) => boolean;
  /** Im Dialog stehen Titel und Bearbeiten-Knopf schon im Rahmen. */
  variant?: "inline" | "dialog";
  onNavigate?: () => void;
}

/**
 * Alles, was man zu einer Veranstaltung sehen und tun kann.
 *
 * Eine Komponente für beide Stellen – aufgeklappt in der Liste und im Fenster
 * aus dem Kalender. Vorher waren das zwei getrennte Fassungen, und der Dialog
 * konnte deutlich weniger als die Liste: kein Anmeldeformular, keine Absprache,
 * kein Absagen. Wer den Termin im Kalender anklickte, bekam eine andere
 * Veranstaltung zu sehen als der, der ihn in der Liste anklickte.
 */
export default function EventBody({
  ev, attendees, attending, declined, canEdit, formatTimeDisplay,
  openEdit, deleteEvent, toggleRSVP, declineEvent, toggleRSVPPending,
  getFormForEvent, getThreadForEvent, hasSubmittedForm,
  variant = "inline",
  onNavigate,
}: EventBodyProps) {
  const thread = getThreadForEvent?.(ev.id);
  const form = getFormForEvent(ev.id);

  // Ein Formular zählt nur, wenn es offen ist UND innerhalb seines Zeitfensters
  // liegt – sonst steht „Anmelden" da und führt ins Leere.
  const settings = form?.settings as { opens_at?: string; closes_at?: string } | undefined;
  const now = new Date();
  const opensAt = settings?.opens_at ? new Date(settings.opens_at) : null;
  const closesAt = settings?.closes_at ? new Date(settings.closes_at) : null;
  const formOffen =
    !!form?.is_open &&
    !!form?.public_token &&
    (!opensAt || now >= opensAt) &&
    (!closesAt || now <= closesAt);

  return (
    <div className="space-y-3">
      {variant === "inline" && ev.is_public && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          <Globe size={10} /> Öffentlich
        </span>
      )}

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalIcon size={14} /> {formatTimeDisplay(ev)}
        </span>
        {ev.location && (
          <span className="inline-flex items-start gap-1 min-w-0">
            <MapPin size={14} className="shrink-0 mt-0.5" />
            <Linkify text={ev.location} className="break-all" />
          </span>
        )}
      </div>

      {ev.description && (
        <p className="text-sm">
          <Linkify text={ev.description} />
        </p>
      )}

      <div className="pt-3 border-t">
        <div className="flex items-center gap-2 flex-wrap">
          <Users size={14} className="text-muted-foreground shrink-0" />
          {attendees.length === 0 ? (
            <span className="text-sm text-muted-foreground">Noch keine Zusagen</span>
          ) : (
            attendees.map((a) => (
              <Badge key={a.id} variant="secondary" className="text-xs">
                {a.profiles?.display_name || "Mitglied"}
              </Badge>
            ))
          )}
        </div>
        {attendees.length > 0 && (
          <TeilnehmerNachweise
            eventId={ev.id}
            namen={Object.fromEntries(attendees.map((a) => [a.user_id, a.profiles?.display_name || "Mitglied"]))}
          />
        )}
        {attendees.length > 0 && <TeilnehmerFuersorge eventId={ev.id} />}
        <InventarBeiVeranstaltung eventId={ev.id} />
      </div>

      <div data-tour="termin-aktionen" className="flex flex-wrap items-center gap-2 justify-end">
        {canEdit && (
          <div className="mr-auto flex gap-1">
            <Button variant="ghost" size="icon" asChild title="Anmeldeformular">
              <Link to={`/intern/veranstaltungen/${ev.id}/formular`} onClick={onNavigate}>
                <FileText size={16} />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" title="Bearbeiten" onClick={() => openEdit(ev)}>
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="icon" title="Löschen" onClick={() => deleteEvent(ev.id)}>
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>
        )}

        {thread && (
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/intern/forum/thema/${thread.id}`} onClick={onNavigate}>
              <MessagesSquare size={14} className="mr-1" />
              Absprache
              {thread.post_count > 1 && (
                <span className="ml-1 text-muted-foreground">({thread.post_count})</span>
              )}
            </Link>
          </Button>
        )}

        {formOffen ? (
          <>
            {!declined && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/intern/veranstaltungen/${ev.id}/anmeldung`} onClick={onNavigate}>
                  <FileText size={14} className="mr-1" />
                  {hasSubmittedForm(form.id) ? "Bearbeiten" : "Anmelden"}
                </Link>
              </Button>
            )}
            {declined ? (
              <Button size="sm" variant="outline" disabled={toggleRSVPPending} onClick={() => toggleRSVP(ev.id)}>
                Absage zurücknehmen
              </Button>
            ) : (
              <Button
                size="sm" variant="ghost" className="text-muted-foreground"
                disabled={toggleRSVPPending}
                onClick={() => declineEvent(ev.id)}
              >
                <X size={14} className="mr-1" /> Absagen
              </Button>
            )}
          </>
        ) : !form ? (
          <Button
            size="sm"
            variant={attending ? "secondary" : "default"}
            disabled={toggleRSVPPending}
            onClick={() => toggleRSVP(ev.id)}
          >
            {attending ? (
              <><X size={14} className="mr-1" /> Absagen</>
            ) : (
              <><Check size={14} className="mr-1" /> Zusagen</>
            )}
          </Button>
        ) : attending ? (
          // Formular vorhanden, aber geschlossen: Zusagen geht dann nicht mehr,
          // absagen muss aber möglich bleiben.
          <Button size="sm" variant="secondary" disabled={toggleRSVPPending} onClick={() => toggleRSVP(ev.id)}>
            <X size={14} className="mr-1" /> Absagen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
