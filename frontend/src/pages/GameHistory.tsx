import { useState } from "react";
import { History, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GameHistoryList } from "@/components/GameHistoryList";
import { useGameControllerGetHistory } from "../api/endpoints/game/game";
import type { GameHistoryItemDto } from "../api/models";

export function GameHistory() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [accumulatedGames, setAccumulatedGames] = useState<
    GameHistoryItemDto[]
  >([]);
  const [foldedPage, setFoldedPage] = useState(0);

  const { t } = useTranslation();

  const { data, isLoading } = useGameControllerGetHistory({ page, limit: 10 });

  // Each page is folded into the running list while rendering rather than from
  // an effect, so the list never paints one frame behind the fetched data.
  // `foldedPage` makes it idempotent: a refetch of a page already folded in
  // cannot append it twice.
  if (data?.games && data.page !== foldedPage) {
    setFoldedPage(data.page);
    setAccumulatedGames(
      data.page === 1 ? data.games : [...accumulatedGames, ...data.games]
    );
  }

  const hasMore = data ? data.page < data.totalPages : false;

  return (
    <div className="max-w-3xl mx-auto mt-8 space-y-6 px-4">
      {/* Going back headline */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" /> {t("common.backToDashboard")}
        </Button>
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {t("history.title")}
              </CardTitle>
              <CardDescription>
                {t("history.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Game History List */}
          <GameHistoryList games={accumulatedGames} />

          {/* Button load more */}
          {hasMore && (
            <Button
              onClick={() => setPage((p) => p + 1)}
              variant="outline"
              className="w-full gap-2 py-5 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("history.loading")}
                </>
              ) : (
                t("history.loadMore")
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}