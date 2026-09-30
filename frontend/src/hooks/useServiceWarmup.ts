import { useEffect, useState } from "react";

// The backend server runs on Render's free plan and sleeps when idle.
// The frontend pings it on load to wake it up.

const SLOW_THRESHOLD_MS = 2000;
const PING_TIMEOUT_MS = 90_000;
const LIKELY_BLOCKED_MS = 1000;

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

function isLikelyBlockedByExtension(error: unknown, elapsedMs: number): boolean {
  return error instanceof TypeError && elapsedMs < LIKELY_BLOCKED_MS;
}

export function useServiceWarmup(): WarmupPhase {
  const [server, setServer] = useState<PingStatus>("pending");
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const slowTimer = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);

    const serverPingStart = Date.now();
    ping(`${import.meta.env.VITE_SERVER_URL}/health`, signal).then(
      () => setServer("ok"),
      (error: unknown) => {
        if (signal.aborted) return;
        if (isLikelyBlockedByExtension(error, Date.now() - serverPingStart)) {
          console.warn("Server warmup ping blocked (likely an ad blocker):", error);
          setServer("ok");
          return;
        }
        console.error("Server warmup failed:", error);
        setServer("failed");
      }
    );

    return () => {
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, []);

  if (server === "failed") return "unreachable";
  if (server === "pending") {
    return isSlow ? "waking" : "idle";
  }
  return "ready";
}