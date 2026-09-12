import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export function Home() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handlePlayAI = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/game/create-ai", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const game = await response.json();
      if (response.ok && game.id) {
        navigate(`/game/${game.id}`);
      }
    } catch (error) {
      console.error("Błąd tworzenia gry", error);
    } finally {
      setLoading(false);
    }
  };
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center mt-20 space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Play Checkers vs AI
        </h1>
        <p className="text-neutral-500 max-w-md">
          Join now to track your stats, play against a Python-powered AI, or
          challenge other players.
        </p>
        <Button onClick={() => navigate("/auth")} size="lg">
          Sign In to Play
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={handlePlayAI} disabled={loading}>
            {loading ? "Creating Match..." : "Play vs AI"}
          </Button>
          <Button className="w-full" variant="secondary">
            Multiplayer Matchmaking
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
