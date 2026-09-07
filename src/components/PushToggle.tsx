import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type State = "unbekannt" | "nicht_moeglich" | "aus" | "an" | "abgelehnt";

/** base64url aus der Edge Function in das Format bringen, das der Browser will. */
function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Push auf diesem Gerät an- und abschalten.
 *
 * Bewusst mit Erklärung davor statt direkt den Browser-Dialog aufzurufen: Wer
 * unvorbereitet gefragt wird, klickt „Blockieren" – und das lässt sich später
 * nur noch in den Browsereinstellungen zurücknehmen. Ein Versuch, kein zweiter.
 */
export default function PushToggle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<State>("unbekannt");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("nicht_moeglich");
        return;
      }
      if (Notification.permission === "denied") {
        setState("abgelehnt");
        return;
      }
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "an" : "aus");
    })();
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "abgelehnt" : "aus");
        return;
      }

      // Der öffentliche Schlüssel kommt vom Backend, nicht aus dem Build –
      // so muss für eine andere Installation nichts neu übersetzt werden.
      const { data, error } = await supabase.functions.invoke("push-notify", { method: "GET" });
      if (error || !data?.publicKey) throw new Error("Schlüssel nicht abrufbar");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      const raw = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const { error: saveError } = await (supabase.from as unknown as (t: string) => {
        upsert: (v: unknown, o: unknown) => Promise<{ error: { message: string } | null }>;
      })("push_subscriptions").upsert(
        {
          endpoint: raw.endpoint,
          user_id: user!.id,
          p256dh: raw.keys?.p256dh,
          auth: raw.keys?.auth,
          user_agent: navigator.userAgent.slice(0, 200),
          failure_count: 0,
        },
        { onConflict: "endpoint" }
      );
      if (saveError) throw new Error(saveError.message);

      setState("an");
      toast({ title: "Benachrichtigungen aktiv", description: "Auf diesem Gerät." });
    } catch (err) {
      toast({
        title: "Hat nicht geklappt",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await (supabase.from as unknown as (t: string) => {
          delete: () => { eq: (c: string, v: string) => Promise<unknown> };
        })("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("aus");
      toast({ title: "Benachrichtigungen aus", description: "Auf diesem Gerät." });
    } finally {
      setBusy(false);
    }
  };

  if (state === "unbekannt") return null;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
          {state === "an" ? <BellRing size={17} /> : <BellOff size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Meldungen auf dieses Gerät</p>

          {state === "nicht_moeglich" && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1.5">
              <Smartphone size={13} className="mt-0.5 shrink-0" />
              Dieser Browser kann das nicht. Auf dem iPhone geht es nur, wenn die Seite über
              „Teilen → Zum Home-Bildschirm" hinzugefügt wurde.
            </p>
          )}

          {state === "abgelehnt" && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Du hast Meldungen für diese Seite blockiert. Das lässt sich nur in den
              Browsereinstellungen zurücknehmen – bei den Berechtigungen für dilehi.de.
            </p>
          )}

          {state === "aus" && (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                Antworten in Themen, denen du folgst, erscheinen dann direkt auf dem Gerät –
                so wie eine Nachricht. Du kannst es jederzeit wieder abschalten.
              </p>
              <Button size="sm" className="mt-2" onClick={enable} disabled={busy}>
                {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
                Einschalten
              </Button>
            </>
          )}

          {state === "an" && (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aktiv. Gilt nur für dieses Gerät – auf anderen musst du es dort einschalten.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={disable} disabled={busy}>
                {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
                Ausschalten
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
