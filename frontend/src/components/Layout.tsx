import { Outlet, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Layout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white p-4 flex justify-between items-center shadow-sm">
        <Link to="/" className="text-xl font-bold text-neutral-900">
          Checkers AI
        </Link>
        <Link to="/auth">
          <Button variant="outline">Login</Button>
        </Link>
      </header>

      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
