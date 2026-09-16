import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  type ServerToClientEvents,
  type ClientToServerEvents,
  SocketEvents,
  type GameState,
} from "@warcabownik/shared";

interface BoardPosition {
  x: number;
  y: number;
}

type BoardCell = 0 | 1 | 2;
type Board = BoardCell[][];

const getInitialBoard = (): Board => {
  return Array(8)
    .fill(null)
    .map((_, y) =>
      Array(8)
        .fill(0)
        .map((_, x) => {
          if ((x + y) % 2 === 1) {
            if (y < 3) return 1;
            if (y > 4) return 2;
          }
          return 0;
        })
    );
};

const getMyUserId = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    // get the middle part of JWT (payload)
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch (error) {
    return null;
  }
};

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export function Game() {
  const { id } = useParams();
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [status, setStatus] = useState("Connecting to server...");
  const [gameStatus, setGameStatus] = useState<string>("IN_PROGRESS");
  const [winner, setWinner] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const [board, setBoard] = useState<Board>(getInitialBoard());
  const [selectedPiece, setSelectedPiece] = useState<BoardPosition | null>(
    null
  );
  const [errorPosition, setErrorPosition] = useState<BoardPosition | null>(
    null
  );
  const navigate = useNavigate();

  const myId = getMyUserId();
  const isWinner = winner === myId;
  const isLoser = winner !== null && winner !== myId;
  useEffect(() => {
    const aiUrl = import.meta.env.VITE_AI_URL;

    if (aiUrl) {
      fetch(`${aiUrl}/health`)
        .then(() => console.log("AI pinged successfully"))
        .catch(() => console.log("AI ping finished"));
    }
  }, []);
  useEffect(() => {
    if (!id) return;

    const token = localStorage.getItem("token");
    const newSocket: TypedSocket = io(`${import.meta.env.VITE_API_URL}/game`, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      setStatus("Connected. Your turn!");
      newSocket.emit(SocketEvents.JOIN_GAME, { gameId: id });
    });

    newSocket.on(SocketEvents.GAME_STATE_UPDATE, (updatedGame: GameState) => {
      setIsAiThinking(false);
      const rawBoard: string[][] = JSON.parse(updatedGame.boardStateJson);
      const numericBoard: Board = rawBoard.map((row: string[]) =>
        row.map((cell: string): BoardCell =>
          cell.toLowerCase() === "w" ? 1 : cell.toLowerCase() === "b" ? 2 : 0
        )
      );
      setBoard(numericBoard);
      if (updatedGame.status) setGameStatus(updatedGame.status);
      if (updatedGame.winnerId !== undefined) setWinner(updatedGame.winnerId);
    });

    newSocket.on("connect_error", (err) => {
      setStatus(`Connection error: ${err.message}`);
    });

    setSocket(newSocket);
    return () => {
      newSocket.off(SocketEvents.GAME_STATE_UPDATE);
      newSocket.disconnect();
    };
  }, [id]);

  const handleSquareClick = (x: number, y: number): void => {
    if (isAiThinking || gameStatus === "FINISHED") return;
    if ((x + y) % 2 === 0) return;

    const piece = board[y][x];

    if (piece === 1) {
      setSelectedPiece(
        selectedPiece?.x === x && selectedPiece?.y === y ? null : { x, y }
      );
      return;
    }

    if (piece === 0 && selectedPiece && socket) {
      const fromCol = String.fromCharCode(97 + selectedPiece.x);
      const fromRow = selectedPiece.y + 1;
      const fromPosition = `${fromCol}${fromRow}`;

      const toCol = String.fromCharCode(97 + x);
      const toRow = y + 1;
      const toPosition = `${toCol}${toRow}`;

      const attemptedPiece = { ...selectedPiece };
      setIsAiThinking(true);
      socket.emit(
        SocketEvents.SEND_PLAYER_MOVE,
        {
          gameId: id!,
          move: { fromPosition, toPosition },
        },
        (response) => {
          if (response.status === "ERROR") {
            setIsAiThinking(false);
            setErrorPosition(attemptedPiece);

            setTimeout(() => {
              setErrorPosition(null);
            }, 500);
          }
        }
      );

      setSelectedPiece(null);
    }
  };
  return (
    <div className="flex flex-col items-center mt-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Match ID: {id}</h2>
        {isAiThinking ? (
          <div className="flex items-center justify-center space-x-2 mt-2 text-blue-600">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="font-semibold text-sm">
              AI is waking up & calculating...
            </span>
          </div>
        ) : (
          <p
            className={`font-medium mt-2 ${status.includes("error") ? "text-red-500" : "text-neutral-500"}`}
          >
            {status}
          </p>
        )}
      </div>

      <Card className="p-2 bg-neutral-300 relative">
        <CardContent className="p-0 grid grid-cols-8 border-4 border-neutral-800">
          {[7, 6, 5, 4, 3, 2, 1, 0].map((y) =>
            [0, 1, 2, 3, 4, 5, 6, 7].map((x) => {
              const piece = board[y][x];
              const isDark = (x + y) % 2 === 1;
              const isSelected =
                selectedPiece?.x === x && selectedPiece?.y === y;
              const isError = errorPosition?.x === x && errorPosition?.y === y; // Check for error

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleSquareClick(x, y)}
                  className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center 
                  ${isDark ? "bg-amber-900 cursor-pointer hover:brightness-110" : "bg-amber-100"}`}
                >
                  {piece === 1 && (
                    <div
                      className={`w-4/5 h-4/5 rounded-full bg-slate-100 shadow-md border-4 border-slate-300 transition-all duration-200 
                        ${
                          isError
                            ? "ring-4 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                            : isSelected
                              ? "ring-4 ring-yellow-400"
                              : ""
                        }
                      `}
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

        {gameStatus === "FINISHED" && (
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-lg">
            <Card className="w-[80%] max-w-sm p-6 text-center shadow-lg bg-background border-2 flex flex-col items-center space-y-4">
              <h2
                className={`text-3xl font-black tracking-tight ${
                  isWinner
                    ? "text-green-600"
                    : isLoser
                      ? "text-red-600"
                      : "text-neutral-600"
                }`}
              >
                {isWinner ? "Game won!" : isLoser ? "Game lost!" : "Draw!"}
              </h2>

              <div className="text-lg font-medium">
                {winner ? (
                  <p>
                    Winner:
                    <br />
                    <span className="text-muted-foreground font-semibold">
                      {isWinner ? "You" : "Enemy (AI)"}
                    </span>
                  </p>
                ) : (
                  <p>Game ended without a winner</p>
                )}
              </div>

              <Button onClick={() => navigate("/")} className="w-full mt-4">
                Back to home page
              </Button>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
