import { useContext, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Home, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const ProfessionalLayout = ({ children }: { children: React.ReactNode }) => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    auth?.logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="py-6 border-b border-border">
                  <h1 className="text-2xl font-bold text-primary">Revitek</h1>
                  <p className="text-sm text-muted-foreground mt-1">Panel Profesional</p>
                </div>

                {/* User Info */}
                <div className="py-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {user?.nombre?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.nombre || "Usuario"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 space-y-2">
                  <Link
                    to="/profesional"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Mi Agenda</span>
                  </Link>

                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted"
                  >
                    <Home className="h-4 w-4" />
                    <span>Página Principal</span>
                  </Link>
                </nav>

                {/* Logout Button */}
                <div className="py-4 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-xl font-bold text-primary">Revitek</h1>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {user?.nombre?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">Revitek</h1>
          <p className="text-sm text-muted-foreground mt-1">Panel Profesional</p>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {user?.nombre?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.nombre || "Usuario"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/profesional"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground"
          >
            <Calendar className="h-4 w-4" />
            <span>Mi Agenda</span>
          </Link>

          <Link
            to="/"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            <span>Página Principal</span>
          </Link>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
