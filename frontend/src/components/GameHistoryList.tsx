import { useNavigate } from "react-router-dom";

interface GameHistoryListProps {
  games: any[];
}

const formatDate = (dateString: string) => {
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

  if (games.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No games played yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((game) => (
        <div
          key={game.id}
          onClick={() => navigate(`/game/${game.id}`)}
          className="p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-sm">
              {game.status === "FINISHED"
                ? game.winnerId
                  ? "Finished"
                  : "Draw"
                : "In Progress"}
            </span>
            <span className="text-xs text-muted-foreground">
              Created: {formatDate(game.createdAt)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {game.winnerId && `Winner: ${game.winnerId.slice(0, 8)}`}
            </span>
            <span>Last move: {formatDate(game.updatedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
