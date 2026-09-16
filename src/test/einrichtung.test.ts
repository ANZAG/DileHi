import { describe, it, expect } from "vitest";
import {
  schritte,
  fortschritt,
  erwarteteMigrationen,
  fehlendeMigrationen,
  type Befund,
} from "@/lib/einrichtung";

/**
 * Der Einrichtungsassistent.
 *
 * Geprüft wird das, was er entscheidet: Wann ist etwas grün, wann gelb, wann
 * rot — und sagt er beim Roten, was zu tun ist. Die Fälle sind die einer
 * frischen Installation, nicht die von DileHi.
 */

const leer: Befund = {
  datenbank: {
    migrationen: [],
    rollen_vergeben: 0,
    mitglieder: 0,
    module: 0,
    verein: null,
    seiten: {},
    menue: { kopf: 1, fuss: 2 },
  },
  secrets: {
    mail: ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"],
    sharepoint: [],
    push: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
    sicherung: ["BACKUP_TOKEN"],
    einrichtung: [],
  },
  seitenadresse: null,
};

const fertig: Befund = {
  datenbank: {
    migrationen: ["00000000000000", "20260916100000"],
    rollen_vergeben: 3,
    mitglieder: 12,
    module: 19,
    verein: {
      name: "Turnverein Beispiel e. V.",
      anschrift: true,
      email: "vorstand@beispiel.org",
      web: "https://beispiel.org",
      vorstand: true,
      register: true,
      mail_weg: "smtp",
      absender: "post@beispiel.org",
      ablage: "supabase",
      sharepoint_site: null,
    },
    seiten: { startseite: true, impressum: true, datenschutz: true },
    menue: { kopf: 1, fuss: 2 },
  },
  secrets: { mail: [], sharepoint: [], push: [], sicherung: [], einrichtung: [] },
  seitenadresse: "https://beispiel.org",
};

const finde = (befund: Befund, id: string, erwartet: string[] = []) =>
  schritte(befund, erwartet).find((s) => s.id === id)!;

describe("Einrichtungsassistent", () => {
  it("sagt bei einer leeren Installation, was fehlt", () => {
    const liste = schritte(leer);
    const rot = liste.filter((s) => s.ampel === "fehlt").map((s) => s.id);

    expect(rot).toContain("datenbank");
    expect(rot).toContain("zugang");
    expect(rot).toContain("verein");
    expect(rot).toContain("mail");
    expect(rot).toContain("sicherung");
    expect(rot).toContain("adresse");
  });

  it("ist bei einer fertigen Installation überall grün", () => {
    const liste = schritte(fertig, ["00000000000000", "20260916100000"]);
    const nichtGruen = liste.filter((s) => s.ampel !== "gut");
    expect(nichtGruen).toEqual([]);
  });

  it("nennt zu jedem Schritt, der nicht grün ist, auch was zu tun ist", () => {
    for (const s of schritte(leer)) {
      if (s.ampel !== "gut") {
        expect(s.todo, `${s.id} ohne Hinweis`).toBeTruthy();
      }
    }
  });

  it("nennt fehlende Secrets beim Namen und gibt nie einen Wert heraus", () => {
    const mail = finde(leer, "mail");
    expect(mail.fehlendeSecrets).toEqual(["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"]);
    // Der Befund trägt nur Namen; wer hier einen Wert einbaut, fällt durch.
    const alles = JSON.stringify(schritte(leer));
    expect(alles).not.toMatch(/hunter2|passwor[dt]\s*[:=]\s*\S/i);
  });

  it("verschweigt beim Mailversand nicht, dass Einladungen liegen bleiben", () => {
    expect(finde(leer, "mail").text).toContain("Link zum Weitergeben");
  });

  it("zählt Push nicht als Pflicht, die Sicherung schon", () => {
    const liste = schritte(leer);
    expect(liste.find((s) => s.id === "push")!.pflicht).toBe(false);
    expect(liste.find((s) => s.id === "sicherung")!.pflicht).toBe(true);
  });

  it("ist bei halb ausgefüllten Vereinsdaten gelb, nicht grün", () => {
    const halb: Befund = {
      ...leer,
      datenbank: {
        ...leer.datenbank!,
        module: 19,
        verein: { name: "Turnverein Beispiel e. V.", anschrift: true, email: "x@y.de", vorstand: false, register: false },
      },
    };
    expect(finde(halb, "verein").ampel).toBe("teilweise");
  });

  it("nimmt den Namen aus dem Ausgangsstand nicht für einen Namen", () => {
    // setup_status() setzt „Mein Verein e. V." auf null, damit hier nichts
    // Grünes steht, wo niemand etwas eingetragen hat. Bleibt der Name doch
    // einmal stehen, ist der Schritt trotzdem nicht grün – es fehlen ja die
    // übrigen Angaben.
    const vorgabe: Befund = {
      ...leer,
      datenbank: { ...leer.datenbank!, module: 19, verein: { name: null, anschrift: false, email: null } },
    };
    expect(finde(vorgabe, "verein").ampel).toBe("fehlt");
  });

  it("ist bei SharePoint ohne Zugangsdaten gelb", () => {
    const sp: Befund = {
      ...fertig,
      datenbank: {
        ...fertig.datenbank!,
        verein: { ...fertig.datenbank!.verein!, ablage: "sharepoint", sharepoint_site: null },
      },
      secrets: { ...fertig.secrets!, sharepoint: ["SHAREPOINT_CLIENT_SECRET"] },
    };
    const schritt = finde(sp, "ablage", ["00000000000000", "20260916100000"]);
    expect(schritt.ampel).toBe("teilweise");
    expect(schritt.fehlendeSecrets).toEqual(["SHAREPOINT_CLIENT_SECRET"]);
  });

  it("merkt, wenn die Datenbank hinter dem Programm zurückhängt", () => {
    const schritt = finde(fertig, "datenbank", [
      "00000000000000",
      "20260916100000",
      "20260916110000",
    ]);
    expect(schritt.ampel).toBe("teilweise");
    expect(schritt.todo).toContain("20260916110000");
  });

  it("liest die erwarteten Versionen aus den Dateinamen", () => {
    expect(
      erwarteteMigrationen([
        "/supabase/migrations/00000000000000_ausgangsstand.sql",
        "/supabase/migrations/20260916100000_startdaten.sql",
        "/supabase/migrations/liesmich.txt",
      ])
    ).toEqual(["00000000000000", "20260916100000"]);
  });

  it("vergleicht Versionen unabhängig von führenden Nullen", () => {
    expect(fehlendeMigrationen(["00000000000000", "20260916100000"], ["0", "20260916100000"]))
      .toEqual([]);
  });

  it("zählt den Fortschritt nur über das Pflichtige", () => {
    const stand = fortschritt(schritte(fertig, ["00000000000000", "20260916100000"]));
    expect(stand.offen).toEqual([]);
    expect(stand.fertig).toBe(stand.gesamt);

    const leerStand = fortschritt(schritte(leer));
    expect(leerStand.fertig).toBe(0);
    expect(leerStand.offen.length).toBe(leerStand.gesamt);
  });
});
