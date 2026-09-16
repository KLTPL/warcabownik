import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { GameHistoryList } from "@/components/GameHistoryList";

import {
  useGameControllerGetHistory,
  useGameControllerCreateAiGame,
} from "../api/endpoints/game/game";

export function Home() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const { data: historyData } = useGameControllerGetHistory(
    { page: 1, limit: 3 },
    { query: { enabled: isLoggedIn } }
  );

  const createAiGameMutation = useGameControllerCreateAiGame();

  const handlePlayAI = async () => {
    try {
      const response = await createAiGameMutation.mutateAsync();

      if (response?.id) {
        navigate(`/game/${response.id}`);
      }
    } catch (error) {
      console.error("Błąd tworzenia gry", error);
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

  const recentGames = historyData?.games || [];

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={handlePlayAI}
            disabled={createAiGameMutation.isPending}
          >
            {createAiGameMutation.isPending
              ? "Creating Match..."
              : "Play vs AI"}
          </Button>
          <Button className="w-full" variant="secondary">
            Multiplayer Matchmaking
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent Games</CardTitle>
        </CardHeader>
        <CardContent>
          <GameHistoryList games={recentGames} />
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => navigate("/history")}
          >
            View Full History
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
