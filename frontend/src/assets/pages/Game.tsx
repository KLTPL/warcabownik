import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export function Game() {
  const { id } = useParams();

  const board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(0));

  return (
    <div className="flex flex-col items-center mt-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Match ID: {id}</h2>
        <p className="text-neutral-500">Waiting for opponent...</p>
      </div>

      <Card className="p-2 bg-neutral-200">
        <CardContent className="p-0 grid grid-cols-8 border-4 border-neutral-800">
          {board.map((row, y) =>
            row.map((_, x) => {
              const isDark = (x + y) % 2 === 1;
              return (
                <div
                  key={`${x}-${y}`}
                  className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center 
                    ${isDark ? "bg-amber-900" : "bg-amber-100"}`}
                >
                  {/* piece component will go here */}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
