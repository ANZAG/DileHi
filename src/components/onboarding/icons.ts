import {
  Banknote, BookOpen, CalendarDays, ClipboardList, Coins, FileText, Image,
  ImagePlus, Mail, MailPlus, MapPin, Megaphone, MessagesSquare, PackageOpen,
  Palette, ScrollText, Settings, Shield, Sparkles, Star, Tent, User, UserPlus,
  Users, Vote, type LucideIcon,
} from "lucide-react";

/**
 * Die Zeichen, die ein Schritt tragen kann.
 *
 * In der Datenbank steht ein Name, kein Bild. Eine feste Liste statt eines
 * dynamischen Imports, weil sonst das ganze Zeichensatzpaket im Auslieferungs-
 * paket landete – rund tausend Zeichen für zwei Dutzend, die wir benutzen.
 *
 * Ein unbekannter Name ergibt das neutrale Zeichen. Ein Tippfehler in der
 * Verwaltung soll keinen leeren Kasten hinterlassen.
 */
const ZEICHEN: Record<string, LucideIcon> = {
  Banknote, BookOpen, CalendarDays, ClipboardList, Coins, FileText, Image,
  ImagePlus, Mail, MailPlus, MapPin, Megaphone, MessagesSquare, PackageOpen,
  Palette, ScrollText, Settings, Shield, Sparkles, Star, Tent, User, UserPlus,
  Users, Vote,
};

export const ZEICHEN_NAMEN = Object.keys(ZEICHEN);

export function zeichen(name: string | null | undefined): LucideIcon {
  return (name && ZEICHEN[name]) || Sparkles;
}
