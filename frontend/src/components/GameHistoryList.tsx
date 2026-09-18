import { useNavigate } from "react-router-dom";
import { Trophy, Calendar, ChevronRight, Swords, Gamepad2, Hourglass, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface GameHistoryListProps {
  games: any[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function GameHistoryList({ games }: GameHistoryListProps) {
  const navigate = useNavigate();

  if (!games || games.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-3">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-base">No matches found</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            You haven't played any games yet. Start a new match vs AI to begin tracking your history!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => {
        const isFinished = game.status === "FINISHED";
        const hasWinner = Boolean(game.winnerId);

        return (
          <Card
            key={game.id}
            onClick={() => navigate(`/game/${game.id}`)}
            className="p-4 border hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-200 group relative overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left side: Status and match details */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-lg bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                  <Swords className="w-5 h-5" />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">
                      Match #{game.id.slice(0, 8)}
                    </span>

                    {/* Status Badge */}
                    {isFinished ? (
                      hasWinner ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Finished
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">
                          Draw
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                        <Hourglass className="w-3 h-3" /> In Progress
                      </span>
                    )}
                  </div>

                  {/* Timestamp Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(game.createdAt)}
                    </span>

                    {game.winnerId && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        Winner: {game.winnerId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side: Transition Icon */}
              <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                <span className="text-xs font-medium hidden sm:inline">View</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}