import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WarmupPhase } from "@/hooks/useServiceWarmup";

export function WarmupBanner({ phase }: { phase: WarmupPhase }) {
  if (phase === "waking") {
    return (
      <div
        role="status"
        className="border-b bg-muted/60 text-muted-foreground text-sm"
      >
        <div className="container mx-auto flex items-center gap-2 px-4 py-2">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          <span>
            Waking up the servers (free hosting). The first load can take up
            to a minute…
          </span>
        </div>
      </div>
    );
  }

  if (phase === "unreachable") {
    return (
      <div
        role="alert"
        className="border-b bg-destructive/10 text-destructive text-sm"
      >
        <div className="container mx-auto flex items-center gap-2 px-4 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">Server unreachable. Try refreshing.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
