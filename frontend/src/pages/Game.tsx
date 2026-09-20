import { useParams, useNavigate } from "react-router-dom";
import { Crown, Loader2, Trophy, Frown, ArrowLeft, Swords, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGame } from "@/hooks/useGame";

export function Game() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
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
  } = useGame(id);

  return (
    <div className="max-w-4xl mx-auto mt-4 px-4 space-y-6 flex flex-col items-center">
      {/* Headline and return button */}
      <div className="w-full flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" /> Exit Game
        </Button>

        <Badge variant="outline" className="px-3 py-1 font-mono text-xs gap-1">
          <Swords className="w-3.5 h-3.5 text-primary" /> Match ID: {id?.slice(0, 8)}
        </Badge>
      </div>

      {/* State Indicator */}
      <div className="h-10 flex items-center justify-center">
        {isAiThinking ? (
          <Badge className="px-4 py-1.5 text-sm gap-2 bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI is calculating next move...</span>
          </Badge>
        ) : (
          <Badge
            variant={status.includes("error") ? "destructive" : "secondary"}
            className="px-4 py-1.5 text-xs font-medium"
          >
            {status}
          </Badge>
        )}
      </div>

      {/* Board Container */}
      <Card className="p-3 bg-amber-950/20 border-4 border-amber-900/40 rounded-xl shadow-2xl relative overflow-hidden">
        <CardContent className="p-0 grid grid-cols-8 border-2 border-amber-950 rounded-lg overflow-hidden shadow-inner">
          {[7, 6, 5, 4, 3, 2, 1, 0].map((y) =>
            [0, 1, 2, 3, 4, 5, 6, 7].map((x) => {
              const piece = board[y][x];
              const isDark = (x + y) % 2 === 1;
              const isSelected = selectedPiece?.x === x && selectedPiece?.y === y;
              const isError = errorPosition?.x === x && errorPosition?.y === y;

              const isWhite = piece === 1 || piece === 3;
              const isBlack = piece === 2 || piece === 4;
              const isDamka = piece === 3 || piece === 4;

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleSquareClick(x, y)}
                  className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center transition-all relative select-none
                    ${
                      isDark
                        ? "bg-amber-900/90 cursor-pointer hover:brightness-125"
                        : "bg-amber-100/90"
                    }`}
                >
                  {/* Pawn / King rendering */}
                  {(isWhite || isBlack) && (
                    <div
                      className={`w-4/5 h-4/5 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg border-2 sm:border-4
                        ${
                          isWhite
                            ? "bg-gradient-to-br from-slate-100 to-slate-300 border-slate-400 text-amber-600"
                            : "bg-gradient-to-br from-neutral-800 to-neutral-950 border-black text-amber-400"
                        }
                        ${
                          isError
                            ? "ring-4 ring-red-500 animate-bounce"
                            : isSelected
                              ? "ring-4 ring-yellow-400 scale-105 shadow-yellow-400/50"
                              : ""
                        }
                      `}
                    >
                      {/* Icon for the Crown for Kings */}
                      {isDamka && (
                        <Crown className="w-4 h-4 sm:w-7 sm:h-7 drop-shadow-md animate-pulse" />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>

        {/* Endgame Model */}
        {gameStatus === "FINISHED" && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-20 p-4">
            <Card className="w-full max-w-sm p-6 text-center border-2 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="p-3 rounded-full w-fit mx-auto bg-primary/10">
                {isWinner ? (
                  <Trophy className="w-10 h-10 text-amber-500 animate-bounce" />
                ) : isLoser ? (
                  <Frown className="w-10 h-10 text-destructive" />
                ) : (
                  <Bot className="w-10 h-10 text-muted-foreground" />
                )}
              </div>

              <CardHeader className="p-0">
                <CardTitle className="text-2xl font-black">
                  {isWinner ? "Victory!" : isLoser ? "Defeat!" : "Draw!"}
                </CardTitle>
              </CardHeader>

              <div className="text-sm text-muted-foreground">
                {winner ? (
                  <p>
                    Winner:{" "}
                    <span className="font-semibold text-foreground">
                      {isWinner ? "You" : "Enemy (AI)"}
                    </span>
                  </p>
                ) : (
                  <p>Game ended in a draw</p>
                )}
              </div>

              <Button onClick={() => navigate("/")} className="w-full">
                Back to Dashboard
              </Button>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}