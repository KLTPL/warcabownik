import { useNavigate } from "react-router-dom";
import { Bot, Users, Swords, Sparkles, History, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardDescription,CardHeader,CardTitle} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { GameHistoryList } from "@/components/GameHistoryList";
import { useGameControllerGetHistory, useGameControllerCreateAiGame } from "../api/endpoints/game/game";

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
      <div className="max-w-4xl mx-auto mt-12 px-4 space-y-12">
        {/* Hero Banner */}
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powered by PyTorch Neural Network</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
            Play Checkers vs <span className="text-primary">Advanced AI</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl">
            Test your draughts tactics against a machine learning model, track your game history, and climb the ranks.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button onClick={() => navigate("/auth")} size="lg" className="gap-2 shadow-lg">
              Sign In to Play <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="space-y-1">
              <div className="p-2.5 w-fit rounded-lg bg-primary/10 text-primary mb-2">
                <Bot className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg">Smart AI Engine</CardTitle>
              <CardDescription>
                Play against our PyTorch-powered bot trained to evaluate board states.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="space-y-1">
              <div className="p-2.5 w-fit rounded-lg bg-primary/10 text-primary mb-2">
                <Users className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg">Multiplayer Mode</CardTitle>
              <CardDescription>
                Challenge friends or other players in real-time online matches.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="space-y-1">
              <div className="p-2.5 w-fit rounded-lg bg-primary/10 text-primary mb-2">
                <History className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg">Full Match History</CardTitle>
              <CardDescription>
                Review your previous moves and track your win/loss statistics.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const recentGames = historyData?.games || [];

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-8 px-4">
      {/* Choosing game mode */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Swords className="w-6 h-6 text-primary" />
          Game Modes
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Game vs AI */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Singleplayer vs AI
                </CardTitle>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Ready
                </span>
              </div>
              <CardDescription>
                Test your skills against our neural network bot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full gap-2"
                onClick={handlePlayAI}
                disabled={createAiGameMutation.isPending}
              >
                {createAiGameMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Match...
                  </>
                ) : (
                  <>
                    Play vs AI <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Online Multiplayer */}
          <Card className="relative overflow-hidden border bg-muted/30 opacity-80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  Online Multiplayer
                </CardTitle>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Coming Soon
                </span>
              </div>
              <CardDescription>
                Find online opponents in real-time matchmaking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary" disabled>
                Multiplayer Matchmaking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Games Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recent Matches
            </CardTitle>
            <CardDescription>
              Your last 3 played games
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <GameHistoryList games={recentGames} />
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => navigate("/history")}
          >
            View Full History <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}