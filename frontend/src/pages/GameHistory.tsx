import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GameHistoryList } from "@/components/GameHistoryList";
import { useAuth } from "@/context/AuthContext";

export function GameHistory() {
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { fetchWithAuth } = useAuth();

  const fetchGames = async (pageNumber: number) => {
    const res = await fetchWithAuth(
      `http://localhost:3000/game/history?page=${pageNumber}&limit=10`
    );
    const data = await res.json();

    if (pageNumber === 1) setGames(data.games);
    else setGames((prev) => [...prev, ...data.games]);

    setHasMore(data.page < data.totalPages);
  };

  useEffect(() => {
    fetchGames(page);
  }, [page]);

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-4">
      <h2 className="text-2xl font-bold">Match History</h2>
      <div className="space-y-2">{<GameHistoryList games={games} />}</div>
      {hasMore && (
        <Button onClick={() => setPage((p) => p + 1)} className="w-full">
          Load More
        </Button>
      )}
    </div>
  );
}
