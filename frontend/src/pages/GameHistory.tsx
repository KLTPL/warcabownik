import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GameHistoryList } from "@/components/GameHistoryList";
import { useGameControllerGetHistory } from "../api/endpoints/game/game";
import type { GameHistoryItemDto } from "../api/models";

export function GameHistory() {
  const [page, setPage] = useState(1);
  const [accumulatedGames, setAccumulatedGames] = useState<
    GameHistoryItemDto[]
  >([]);

  const { data, isLoading } = useGameControllerGetHistory({ page, limit: 10 });

  useEffect(() => {
    if (data?.data?.games) {
      if (page === 1) {
        setAccumulatedGames(data.data.games);
      } else {
        setAccumulatedGames((prev) => [...prev, ...data.data.games]);
      }
    }
  }, [data, page]);

  const hasMore = data?.data ? data.data.page < data.data.totalPages : false;

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-4">
      <h2 className="text-2xl font-bold">Match History</h2>

      <div className="space-y-2">
        <GameHistoryList games={accumulatedGames} />
      </div>

      {hasMore && (
        <Button
          onClick={() => setPage((p) => p + 1)}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load More"}
        </Button>
      )}
    </div>
  );
}
