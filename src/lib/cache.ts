import type { StationStaffing } from "./types";

interface CacheEntry {
  stations: StationStaffing[];
  scrapedAt: number;
}

// In-memory cache keyed by "platoon:date"
const cache = new Map<string, CacheEntry>();

// Cache for 15 minutes
const CACHE_TTL = 15 * 60 * 1000;

// Track in-progress scrapes to avoid duplicate work
const inProgress = new Map<string, Promise<StationStaffing[]>>();

function cacheKey(platoon: string, date: string): string {
  return `${platoon}:${date}`;
}

export function getCached(platoon: string, date: string): StationStaffing[] | null {
  const entry = cache.get(cacheKey(platoon, date));
  if (!entry) return null;
  if (Date.now() - entry.scrapedAt > CACHE_TTL) return null;
  return entry.stations;
}

export function setCached(platoon: string, date: string, stations: StationStaffing[]): void {
  cache.set(cacheKey(platoon, date), {
    stations,
    scrapedAt: Date.now(),
  });
}

export function getInProgress(platoon: string, date: string): Promise<StationStaffing[]> | null {
  return inProgress.get(cacheKey(platoon, date)) || null;
}

export function setInProgress(platoon: string, date: string, promise: Promise<StationStaffing[]>): void {
  const key = cacheKey(platoon, date);
  inProgress.set(key, promise);
  promise.finally(() => inProgress.delete(key));
}
