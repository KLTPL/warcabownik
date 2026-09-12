import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { Card, CardContent } from "@/components/ui/card";

const getInitialBoard = () => {
  return Array(8)
    .fill(null)
    .map((_, y) =>
      Array(8)
        .fill(0)
        .map((_, x) => {
          if ((x + y) % 2 === 1) {
            if (y < 3) return 2;
            if (y > 4) return 1;
          }
          return 0;
        })
    );
};

export function Game() {
  const { id } = useParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState("Connecting to server...");

  const [board, setBoard] = useState(getInitialBoard());
  const [selectedPiece, setSelectedPiece] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const newSocket = io("http://localhost:3000/game", {
      auth: { token },
    });

    newSocket.on("connect", () => {
      setStatus("Connected. Your turn!");
      newSocket.emit("joinGame", { gameId: id });
    });

    newSocket.on("gameStateUpdate", (data) => {
      console.log("Received new game state:", data);

      setBoard((prevBoard) => {
        const newBoard = prevBoard.map((row) => [...row]);

        if (data.botMove) {
          const { from, to } = data.botMove;

          newBoard[from.y][from.x] = 0;
          newBoard[to.y][to.x] = 2;
        }

        return newBoard;
      });
    });

    newSocket.on("connect_error", (err) => {
      setStatus(`Connection error: ${err.message}`);
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [id]);

  const handleSquareClick = (x: number, y: number) => {
    if ((x + y) % 2 === 0) return;

    const piece = board[y][x];

    if (piece === 1) {
      setSelectedPiece(
        selectedPiece?.x === x && selectedPiece?.y === y ? null : { x, y }
      );
      return;
    }

    if (piece === 0 && selectedPiece && socket) {
      // Poprawna konwersja (a=97 w ASCII, rzędy odwrócone 8-y)
      const fromCol = String.fromCharCode(97 + selectedPiece.x);
      const fromRow = 8 - selectedPiece.y;
      const fromPosition = `${fromCol}${fromRow}`; // np. "e3"

      const toCol = String.fromCharCode(97 + x);
      const toRow = 8 - y;
      const toPosition = `${toCol}${toRow}`; // np. "d4"

      socket.emit("sendPlayerMove", {
        gameId: id,
        move: { fromPosition, toPosition },
      });

      setSelectedPiece(null);
    }
  };
  return (
    <div className="flex flex-col items-center mt-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Match ID: {id}</h2>
        <p
          className={`font-medium ${status.includes("error") ? "text-red-500" : "text-neutral-500"}`}
        >
          {status}
        </p>
      </div>

      <Card className="p-2 bg-neutral-300">
        <CardContent className="p-0 grid grid-cols-8 border-4 border-neutral-800">
          {board.map((row, y) =>
            row.map((piece, x) => {
              const isDark = (x + y) % 2 === 1;
              const isSelected =
                selectedPiece?.x === x && selectedPiece?.y === y;

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleSquareClick(x, y)}
                  className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center 
                    ${isDark ? "bg-amber-900 cursor-pointer hover:brightness-110" : "bg-amber-100"}
                  `}
                >
                  {piece === 1 && (
                    <div
                      className={`w-4/5 h-4/5 rounded-full bg-slate-100 shadow-md border-4 border-slate-300 ${isSelected ? "ring-4 ring-yellow-400" : ""}`}
                    />
                  )}
                  {piece === 2 && (
                    <div className="w-4/5 h-4/5 rounded-full bg-neutral-900 shadow-md border-4 border-black" />
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
