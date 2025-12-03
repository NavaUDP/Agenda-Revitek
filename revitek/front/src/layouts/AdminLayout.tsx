import { useState, useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Calendar, Users, Home, Wrench, UsersRound, Menu, ClipboardList, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAdminCalendarData } from "@/hooks/useAdminCalendarData";

export const AdminLayout = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const { resources, setResources, events, setEvents, loading } = useAdminCalendarData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    auth?.logout();
    navigate("/login");
  };

  const contextValue = { resources, setResources, events, setEvents, loading };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <NavLink
        to="/admin/agenda"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors " +
          (isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
        }
      >
        <Calendar className="h-4 w-4" />
        <span>Agenda</span>
      </NavLink>

      <NavLink
        to="/admin/reservas"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors " +
          (isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
        }
      >
        <ClipboardList className="h-4 w-4" />
        <span>Reservas</span>
      </NavLink>

      {user?.is_staff && (
        <>
          <NavLink
            to="/admin/profesionales"
            onClick={() => mobile && setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors " +
              (isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
            }
          >
            <Users className="h-4 w-4" />
            <span>Profesionales</span>
          </NavLink>

          <NavLink
            to="/admin/servicios"
            onClick={() => mobile && setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors " +
              (isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
            }
          >
            <Wrench className="h-4 w-4" />
            <span>Servicios</span>
          </NavLink>

          <NavLink
            to="/admin/asignaciones"
            onClick={() => mobile && setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors " +
              (isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
            }
          >
            <UsersRound className="h-4 w-4" />
            <span>Asignaciones</span>
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-16 bg-card border-b border-border flex-shrink-0 flex items-center justify-between px-4 md:px-6 z-40">
        <div className="flex items-center space-x-4 md:space-x-6">
          {/* Mobile Menu Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <div className="flex flex-col space-y-4 mt-6">
                <NavLinks mobile />
                <div className="border-t border-border pt-4 space-y-2">
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span>Volver al Sitio</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <h2 className="text-xl font-bold text-primary">Admin Panel</h2>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-4">
            <NavLinks />
          </nav>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <Link
            to="/"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Volver al Sitio</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="flex-1 h-full overflow-y-auto">
        <Outlet context={contextValue} />
      </main>
    </div>
  );
};
