/**
 * Apaches eigener Passwort-Hash (`$apr1$`), wie ihn `openssl passwd -apr1`
 * und `htpasswd -m` erzeugen.
 *
 * Warum nachgebaut und nicht `openssl` aufgerufen: Auf einem Windows-Rechner
 * ist `openssl` selten vorhanden, und der Sinn von `scripts/seite-bauen.mjs`
 * ist gerade, dass jemand die Seite ohne Werkzeugkasten bauen kann. Node
 * bringt MD5 mit; mehr braucht dieser Hash nicht.
 *
 * Der Ablauf stammt aus Apaches `apr_md5_encode`: ein erster Durchgang, dann
 * tausend Runden, die Passwort, Salz und Zwischenergebnis in wechselnder
 * Reihenfolge durch MD5 drehen. Die Zahlen 3 und 7 darin sind keine Willkür,
 * sondern genau das, was die Vorlage tut — wer sie ändert, bekommt einen
 * Hash, den Apache nicht annimmt.
 */

import { createHash } from "node:crypto";

const ZEICHEN = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function apr1(passwort, salz) {
  const md5 = (b) => createHash("md5").update(b).digest();
  const pw = Buffer.from(passwort, "utf-8");
  const sz = Buffer.from(salz, "utf-8");

  let ctx = Buffer.concat([pw, Buffer.from("$apr1$", "utf-8"), sz]);
  let final = md5(Buffer.concat([pw, sz, pw]));
  for (let i = pw.length; i > 0; i -= 16) {
    ctx = Buffer.concat([ctx, final.subarray(0, Math.min(i, 16))]);
  }
  for (let i = pw.length; i > 0; i >>= 1) {
    ctx = Buffer.concat([ctx, Buffer.from([i & 1 ? 0 : pw[0]])]);
  }
  final = md5(ctx);

  for (let i = 0; i < 1000; i++) {
    let c = i & 1 ? Buffer.from(pw) : Buffer.from(final.subarray(0, 16));
    if (i % 3) c = Buffer.concat([c, sz]);
    if (i % 7) c = Buffer.concat([c, pw]);
    c = Buffer.concat([c, i & 1 ? final.subarray(0, 16) : pw]);
    final = md5(c);
  }

  const dreier = (a, b, c, n) => {
    let w = (a << 16) | (b << 8) | c;
    let s = "";
    for (let i = 0; i < n; i++) { s += ZEICHEN[w & 0x3f]; w >>= 6; }
    return s;
  };
  const f = final;
  const aus =
    dreier(f[0], f[6], f[12], 4) + dreier(f[1], f[7], f[13], 4) +
    dreier(f[2], f[8], f[14], 4) + dreier(f[3], f[9], f[15], 4) +
    dreier(f[4], f[10], f[5], 4) + dreier(0, 0, f[11], 2);
  return `$apr1$${salz}$${aus}`;
}
