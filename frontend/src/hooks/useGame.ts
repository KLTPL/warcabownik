import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { type ServerToClientEvents, type ClientToServerEvents, SocketEvents, type GameState } from "@warcabownik/shared";
import { useAuth } from "@/context/AuthContext";

export interface BoardPosition {
  x: number;
  y: number;
}

export type BoardCell = 0 | 1 | 2 | 3 | 4;
export type Board = BoardCell[][];

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
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch {
    return null;
  }
};

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useGame(gameId: string | undefined) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [status, setStatus] = useState("Connecting to server...");
  const [gameStatus, setGameStatus] = useState<string>("IN_PROGRESS");
  const [winner, setWinner] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [board, setBoard] = useState<Board>(getInitialBoard());
  const [selectedPiece, setSelectedPiece] = useState<BoardPosition | null>(null);
  const [errorPosition, setErrorPosition] = useState<BoardPosition | null>(null);

  const aiDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myId = getMyUserId();
  const isWinner = winner === myId;
  const isLoser = winner !== null && winner !== myId;

  useEffect(() => {
    const aiUrl = import.meta.env.VITE_AI_URL;
    if (aiUrl) {
      fetch(`${aiUrl}/health`).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!gameId) return;

    const token = localStorage.getItem("token");
    const newSocket: TypedSocket = io(`${import.meta.env.VITE_API_URL}/game`, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      setStatus("Connected. Your turn!");
      newSocket.emit(SocketEvents.JOIN_GAME, { gameId });
    });

    newSocket.on(SocketEvents.GAME_STATE_UPDATE, (updatedGame: GameState) => {
      const rawBoard: string[][] = JSON.parse(updatedGame.boardStateJson);
      const numericBoard: Board = rawBoard.map((row: string[]) =>
        row.map((cell: string): BoardCell => {
          if (cell === "w") return 1;
          if (cell === "W") return 3;
          if (cell === "b") return 2;
          if (cell === "B") return 4;
          return 0;
        })
      );

      if (aiDelayTimeoutRef.current) {
        clearTimeout(aiDelayTimeoutRef.current);
      }

      aiDelayTimeoutRef.current = setTimeout(() => {
        setBoard(numericBoard);
        setIsAiThinking(false);
        if (updatedGame.status) setGameStatus(updatedGame.status);
        if (updatedGame.winnerId !== undefined) setWinner(updatedGame.winnerId);
      }, 800);
    });

    newSocket.on("connect_error", (err) => {
      setStatus(`Connection error: ${err.message}`);
    });

    newSocket.on("exception" as any, (error: any) => {
      if (error?.message === "Unauthorized" || error?.statusCode === 401) {
        logout();
        navigate("/auth");
      }
    });

    setSocket(newSocket);

    return () => {
      if (aiDelayTimeoutRef.current) {
        clearTimeout(aiDelayTimeoutRef.current);
      }
      newSocket.off("exception" as any);
      newSocket.off(SocketEvents.GAME_STATE_UPDATE);
      newSocket.disconnect();
    };
  }, [gameId, logout, navigate]);

  const handleSquareClick = (x: number, y: number): void => {
    if (isAiThinking || gameStatus === "FINISHED") return;
    if ((x + y) % 2 === 0) return; 

    const piece = board[y][x];

    if (piece === 1 || piece === 3) {
      setSelectedPiece(
        selectedPiece?.x === x && selectedPiece?.y === y ? null : { x, y }
      );
      return;
    }

    if (piece === 0 && selectedPiece && socket) {
      const fromX = selectedPiece.x;
      const fromY = selectedPiece.y;
      const toX = x;
      const toY = y;

      const rollbackBoard = board.map((row) => [...row]);
      const optimisticBoard = board.map((row) => [...row]);
      const movingPiece = optimisticBoard[fromY][fromX];

      optimisticBoard[fromY][fromX] = 0;

      let finalPiece = movingPiece;
      if (movingPiece === 1 && toY === 7) {
        finalPiece = 3;
      }
      optimisticBoard[toY][toX] = finalPiece;

      if (Math.abs(toX - fromX) === 2 && Math.abs(toY - fromY) === 2) {
        const capturedX = (fromX + toX) / 2;
        const capturedY = (fromY + toY) / 2;
        optimisticBoard[capturedY][capturedX] = 0; 
      }

      setBoard(optimisticBoard);
      setSelectedPiece(null);
      setIsAiThinking(true);

      const fromCol = String.fromCharCode(97 + fromX);
      const fromRow = fromY + 1;
      const fromPosition = `${fromCol}${fromRow}`;

      const toCol = String.fromCharCode(97 + toX);
      const toRow = toY + 1;
      const toPosition = `${toCol}${toRow}`;

      const attemptedPiece = { x: fromX, y: fromY };

      socket.emit(
        SocketEvents.SEND_PLAYER_MOVE,
        {
          gameId: gameId!,
          move: { fromPosition, toPosition },
        },
        (response) => {
          if (response.status === "ERROR") {
            if (aiDelayTimeoutRef.current) {
              clearTimeout(aiDelayTimeoutRef.current);
            }
            setBoard(rollbackBoard);
            setIsAiThinking(false);
            setErrorPosition(attemptedPiece);
            setTimeout(() => setErrorPosition(null), 500);
          }
        }
      );
    }
  };

  return {
    board,
    selectedPiece,
    errorPosition,
    status,
    gameStatus,
    winner,
    isAiThinking,
    isWinner,
    isLoser,
    handleSquareClick,
  };
}