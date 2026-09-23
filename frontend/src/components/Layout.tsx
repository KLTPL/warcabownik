import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Crown, LogOut, LogIn, History, LayoutDashboard, Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useServiceWarmup } from "@/hooks/useServiceWarmup";
import { WarmupBanner } from "@/components/WarmupBanner";
import { LanguageToggle } from "@/components/LanguageToggle";

export function Layout() {
  const { isLoggedIn, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const warmupPhase = useServiceWarmup();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      {/* Sticky Header with Blur Effect */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          
          {/* Logo & Branding */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 font-bold text-base sm:text-xl tracking-tight transition-opacity hover:opacity-90"
          >
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Crown className="w-5 h-5" />
            </div>
            <span>{t("brand")}</span>
          </Link>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language toggle */}
            <LanguageToggle />

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? t("nav.switchToLight")
                  : t("nav.switchToDark")
              }
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {isLoggedIn ? (
              <>
                {/* Navigation links for logged-in users */}
                <nav className="flex items-center gap-1 mr-2">
                  <Button
                    variant={location.pathname === "/" ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate("/")}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("nav.dashboard")}</span>
                  </Button>

                  <Button
                    variant={location.pathname === "/history" ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate("/history")}
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("nav.history")}</span>
                  </Button>
                </nav>

                {/* Logout button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("nav.logout")}</span>
                </Button>
              </>
            ) : (
              /* Login button */
              <Link to="/auth">
                <Button size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  {t("nav.signIn")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <WarmupBanner phase={warmupPhase} />

      {/* Main content of subpages  */}
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="container mx-auto">
          <p>{t("nav.footer", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}