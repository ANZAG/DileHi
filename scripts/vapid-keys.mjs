/**
 * Erzeugt ein VAPID-Schlüsselpaar für Push-Meldungen.
 *
 *   node scripts/vapid-keys.mjs
 *
 * Der öffentliche Schlüssel identifiziert diese Installation gegenüber den
 * Push-Diensten von Google, Apple und Mozilla; der private beweist, dass eine
 * Meldung wirklich von hier kommt.
 *
 * Beide gehören als Secrets zum Backend – der private NIRGENDWO sonst hin,
 * insbesondere nicht ins Repository. Den öffentlichen holt sich der Browser zur
 * Laufzeit von der Edge Function; er muss deshalb nicht in den Build.
 */
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });

// Der öffentliche Schlüssel ist der unkomprimierte Punkt – die letzten 65 Byte
// der DER-Kodierung. Der private ist der 32-Byte-Skalar darin.
const pub = publicKey.export({ type: "spki", format: "der" }).subarray(-65);
const priv = privateKey.export({ type: "pkcs8", format: "der" }).subarray(36, 68);

const b64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

console.log("Diese drei Werte als Secrets des Backends hinterlegen:\n");
console.log("VAPID_PUBLIC_KEY");
console.log(b64url(pub));
console.log("\nVAPID_PRIVATE_KEY");
console.log(b64url(priv));
console.log("\nVAPID_SUBJECT");
console.log("mailto:vorstand@dilehi.de");
console.log("\nDen privaten Schlüssel nirgends sonst speichern.");
