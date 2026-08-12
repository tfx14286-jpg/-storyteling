import { randomToken } from "./crypto";

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

export function rateLimit(key: string, max = MAX_REQUESTS, windowMs = WINDOW_MS) {
  const now = Date.now();
  let w = store.get(key);
  if (!w || w.resetAt < now) {
    w = { count: 0, resetAt: now + windowMs };
    store.set(key, w);
  }
  w.count += 1;
  return {
    ok: w.count <= max,
    remaining: Math.max(0, max - w.count),
    retryAfter: Math.ceil((w.resetAt - now) / 1000),
  };
}

// Deterministic random for mock generation with seed support.
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function newId(): string {
  return randomToken(9);
}
