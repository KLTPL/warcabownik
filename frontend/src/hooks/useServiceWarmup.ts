import { useEffect, useState } from "react";

// Both backend services run on Render's free plan and sleep when idle.
// Render services can't wake each other through their public URLs, so the
// frontend pings both on load.

const SLOW_THRESHOLD_MS = 2000;
const PING_TIMEOUT_MS = 90_000;

type PingStatus = "pending" | "ok" | "failed";

export type WarmupPhase = "idle" | "waking" | "ready" | "unreachable";

async function ping(url: string, signal: AbortSignal): Promise<void> {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(PING_TIMEOUT_MS)]),
  });
  if (!response.ok) {
    throw new Error(`Ping to ${url} returned ${response.status}`);
  }
}

export function useServiceWarmup(): WarmupPhase {
  const [server, setServer] = useState<PingStatus>("pending");
  // The AI URL is optional; without it there is nothing to wake.
  const [ai, setAi] = useState<PingStatus>(
    import.meta.env.VITE_AI_URL ? "pending" : "ok"
  );
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const slowTimer = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);

    ping(`${import.meta.env.VITE_SERVER_URL}/health`, signal).then(
      () => setServer("ok"),
      (error: unknown) => {
        if (signal.aborted) return;
        console.error("Server warmup failed:", error);
        setServer("failed");
      }
    );

    const aiUrl = import.meta.env.VITE_AI_URL;
    if (aiUrl) {
      ping(`${aiUrl}/health`, signal).then(
        () => setAi("ok"),
        (error: unknown) => {
          if (signal.aborted) return;
          // Usually an ad blocker; the app still works, so don't alarm the user.
          console.warn("AI service warmup failed:", error);
          setAi("failed");
        }
      );
    }

    return () => {
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, []);

  if (server === "failed") return "unreachable";
  if (server === "pending" || ai === "pending") {
    return isSlow ? "waking" : "idle";
  }
  return "ready";
}
