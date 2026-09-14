import { Outlet, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export function Layout() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white p-4 flex justify-between items-center shadow-sm">
        <Link to="/" className="text-xl font-bold text-neutral-900">
          Warcabownik
        </Link>
        {isLoggedIn ? (
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        ) : (
          <Link to="/auth">
            <Button variant="outline">Login</Button>
          </Link>
        )}
      </header>

      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
