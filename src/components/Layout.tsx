import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", label: "Startseite" },
  { path: "/epochen/mittelalter", label: "Spätmittelalter" },
  { path: "/epochen/1815", label: "Napoleonik" },
  { path: "/epochen/wk1", label: "Erster Weltkrieg" },
  { path: "/fuer-veranstalter", label: "Für Veranstalter" },
  { path: "/verein", label: "Über uns" },
  { path: "/kontakt", label: "Kontakt" },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold text-primary tracking-wide">
            Diu lebendec Histôrje
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted hover:text-foreground ${
                  location.pathname === item.path ? "text-primary bg-muted" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button className="md:hidden p-2 text-foreground" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menü">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted ${
                  location.pathname === item.path ? "text-primary bg-muted" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card">
        <div className="container py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-serif text-lg font-semibold text-primary mb-3">Diu lebendec Histôrje e.V.</h3>
              <p className="text-sm text-muted-foreground">Living History aus Wiesbaden – Geschichte erleben.</p>
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold mb-3">Navigation</h4>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold mb-3">Rechtliches</h4>
              <ul className="space-y-1">
                <li><Link to="/impressum" className="text-sm text-muted-foreground hover:text-primary transition-colors">Impressum</Link></li>
                <li><Link to="/datenschutz" className="text-sm text-muted-foreground hover:text-primary transition-colors">Datenschutz</Link></li>
                <li><Link to={user ? "/intern" : "/login"} className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">Mitgliederbereich</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Diu lebendec Histôrje e.V. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
