import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function GameHistory() {
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchGames = async (pageNumber: number) => {
    const res = await fetch(
      `http://localhost:3000/game/history?page=${pageNumber}&limit=10`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
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
      <div className="space-y-2">
        {games.map((game) => (
          <div key={game.id} className="p-4 border rounded-md">
            Game ID: {game.id} - Status: {game.status}
          </div>
        ))}
      </div>
      {hasMore && (
        <Button onClick={() => setPage((p) => p + 1)} className="w-full">
          Load More
        </Button>
      )}
    </div>
  );
}
