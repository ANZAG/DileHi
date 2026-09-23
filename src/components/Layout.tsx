import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TourBeiBedarf from "@/components/onboarding/TourBeiBedarf";
import NotificationBell from "@/components/NotificationBell";
import { useBrandingAnwenden } from "@/hooks/useBranding";
import { aufgeklappt, useSiteMenu, type MenuEintrag } from "@/hooks/useSiteMenu";

/**
 * Ein Menüpunkt kann auf eine fremde Seite zeigen – etwa den Dachverband. Die
 * Verwaltung bietet dafür einen Schalter an; ohne diese Zeile war er wirkungslos.
 */
const zielFenster = (eintrag: MenuEintrag) =>
  eintrag.opensNew ? { target: "_blank" as const, rel: "noreferrer" } : {};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, impersonatingRole, stopImpersonation, roleLabels } = useAuth();
  const {
    org_name,
    org_short_name,
    org_tagline,
    logoUrl,
    logo_in_header,
    footer_navigation_label,
    footer_legal_label,
  } = useBrandingAnwenden();
  // Beide Aufrufe teilen sich eine Abfrage – siehe useSiteMenu.
  const navItems = useSiteMenu("header");
  const rechtliches = useSiteMenu("footer_legal");

  // roleLabels comes from useAuth (loaded from role_catalog in DB)
  // → no frontend change needed when a new role is added

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {impersonatingRole && (
        <div className="bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-semibold flex items-center justify-center gap-3 z-[60]">
          <span>🔍 Testansicht: Rolle „{roleLabels[impersonatingRole] ?? impersonatingRole}"</span>
          <button
            onClick={stopImpersonation}
            className="underline hover:no-underline font-bold"
          >
            Zurück zur eigenen Ansicht
          </button>
        </div>
      )}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold text-primary tracking-wide flex items-center gap-2">
            {logoUrl && logo_in_header && <img src={logoUrl} alt="" className="h-7 w-auto" />}
            {org_short_name}
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) =>
              item.children ? (
                <NavGruppe key={item.path} eintrag={item} />
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  {...zielFenster(item)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted hover:text-foreground ${
                    location.pathname === item.path ? "text-primary bg-muted" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
            {user && <NotificationBell />}
            <Link
              to={user ? "/intern" : "/login"}
              className={`ml-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                location.pathname.startsWith("/intern")
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              Mitgliederbereich
            </Link>
          </nav>

          <div className="flex md:hidden items-center gap-1">
            {user && <NotificationBell />}
            <button className="p-2 text-foreground" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menü">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
            {/* Untermenüs klappen hier nicht auf, sondern stehen eingerückt
                darunter: Auf einem Handy ist Scrollen billiger als Tippen. */}
            {navItems.flatMap((item) =>
              [item, ...(item.children ?? [])].map((punkt) => (
                <Link
                  // Gruppe und Unterpunkt dürfen dasselbe Ziel haben.
                  key={`${punkt === item ? "gruppe" : "punkt"}:${punkt.path}`}
                  to={punkt.path}
                  {...zielFenster(punkt)}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted ${
                    punkt === item ? "" : "pl-7 text-xs"
                  } ${
                    location.pathname === punkt.path ? "text-primary bg-muted" : "text-muted-foreground"
                  }`}
                >
                  {punkt.label}
                </Link>
              )),
            )}
            <div className="border-t my-1" />
            <Link
              to={user ? "/intern" : "/login"}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted ${
                location.pathname.startsWith("/intern") ? "text-primary bg-muted" : "text-muted-foreground"
              }`}
            >
              Mitgliederbereich
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>
      <TourBeiBedarf />

      <footer className="border-t bg-card">
        <div className="container py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-serif text-lg font-semibold text-primary mb-3">{org_name}</h3>
              {org_tagline && <p className="text-sm text-muted-foreground">{org_tagline}</p>}
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold mb-3">{footer_navigation_label}</h4>
              <ul className="space-y-1">
                {navItems.flatMap((item) =>
                  [item, ...(item.children ?? [])].map((punkt) => (
                    <li key={`${punkt === item ? "gruppe" : "punkt"}:${punkt.path}`} className={punkt === item ? "" : "pl-3"}>
                      <Link
                        to={punkt.path}
                        {...zielFenster(punkt)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {punkt.label}
                      </Link>
                    </li>
                  )),
                )}
                <li>
                  <Link
                    to={user ? "/intern" : "/login"}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Mitgliederbereich
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold mb-3">{footer_legal_label}</h4>
              <ul className="space-y-1">
                {rechtliches.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      {...zielFenster(item)}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {org_name}. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * Ein Menüpunkt mit Unterpunkten.
 *
 * Die Datenbank kennt eine Ebene Untermenü, die Verwaltung legt sie an – im
 * Layout fielen die Kinder bisher stillschweigend unter den Tisch. Bewusst mit
 * Klick statt Überfahren: Ein Menü, das beim Vorbeiziehen der Maus aufspringt,
 * ist auf einem Touchgerät nicht zu bedienen.
 */
function NavGruppe({ eintrag }: { eintrag: MenuEintrag }) {
  const location = useLocation();
  const [offen, setOffen] = useState(false);
  const huelle = useRef<HTMLDivElement>(null);

  // Woanders hinklicken oder Escape schliesst – sonst bleibt die Klappe offen
  // stehen, während man längst weitergelesen hat.
  useEffect(() => {
    if (!offen) return;
    const runter = (e: PointerEvent) => {
      if (!huelle.current?.contains(e.target as Node)) setOffen(false);
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOffen(false);
    };
    document.addEventListener("pointerdown", runter);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("pointerdown", runter);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  // Beim Seitenwechsel zu.
  useEffect(() => setOffen(false), [location.pathname]);

  const kinder = eintrag.children ?? [];
  const aktiv = [eintrag, ...kinder].some((p) => location.pathname === p.path);

  return (
    <div className="relative" ref={huelle}>
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted hover:text-foreground ${
          aktiv ? "text-primary bg-muted" : "text-muted-foreground"
        }`}
      >
        {eintrag.label}
        <ChevronDown size={14} className={offen ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {offen && (
        <div className="absolute left-0 top-full mt-1 min-w-[12rem] rounded-md border bg-background shadow-md py-1 z-50">
          {/* Der Punkt selbst bleibt anklickbar: Er zeigt auf eine eigene
              Seite, nicht nur auf seine Kinder – außer ein Kind führt schon
              dorthin, siehe `aufgeklappt`. */}
          {aufgeklappt(eintrag).map((punkt) => (
            <Link
              key={punkt.path}
              to={punkt.path}
              {...zielFenster(punkt)}
              onClick={() => setOffen(false)}
              className={`block px-3 py-2 text-sm transition-colors hover:bg-muted ${
                location.pathname === punkt.path ? "text-primary" : "text-muted-foreground"
              } ${punkt === eintrag ? "font-medium" : ""}`}
            >
              {punkt.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Layout;
