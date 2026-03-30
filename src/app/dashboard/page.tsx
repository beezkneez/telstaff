"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import PlatoonSwitcher from "@/components/PlatoonSwitcher";
import StationDropdown from "@/components/StationDropdown";
import StationCard from "@/components/StationCard";
import {
  getStationStaffing,
  getAllStationsForPlatoon,
  type StationStaffing,
} from "@/lib/mock-data";

type ViewMode = "my-station" | "all-stations";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [platoon, setPlatoon] = useState("1");
  const [station, setStation] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("my-station");
  const [stationData, setStationData] = useState<StationStaffing | null>(null);
  const [allStations, setAllStations] = useState<StationStaffing[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    setLoading(true);
    // Using mock data directly for now (will switch to API calls with real scraper)
    if (viewMode === "my-station") {
      const data = getStationStaffing(station, platoon);
      setStationData(data);
    } else {
      const data = getAllStationsForPlatoon(platoon);
      setAllStations(data);
    }
    setLoading(false);
  }, [station, platoon, viewMode]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6 animate-fade-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              STAFFING{" "}
              <span className="text-ember">DASHBOARD</span>
            </h1>
            <p className="text-sm text-muted mt-1">{today}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-ember" />
            Using mock data — connect Telestaff to go live
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-slide-up delay-150">
        <div className="flex flex-wrap items-center gap-3">
          <PlatoonSwitcher active={platoon} onChange={setPlatoon} />
          <StationDropdown value={station} onChange={setStation} />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-subtle">
          <button
            onClick={() => setViewMode("my-station")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === "my-station"
                ? "bg-surface-overlay text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Single Station
          </button>
          <button
            onClick={() => setViewMode("all-stations")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === "all-stations"
                ? "bg-surface-overlay text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            All Stations
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted">
            <svg
              className="animate-spin h-5 w-5 text-ember"
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading staffing data...
          </div>
        </div>
      ) : viewMode === "my-station" && stationData ? (
        <div className="max-w-2xl">
          <StationCard
            station={stationData.station}
            trucks={stationData.trucks}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allStations.map((s, idx) => (
            <StationCard
              key={s.station}
              station={s.station}
              trucks={s.trucks}
              animationDelay={Math.min(idx * 50, 500)}
            />
          ))}
        </div>
      )}

      {/* Quick stats footer */}
      {viewMode === "all-stations" && allStations.length > 0 && (
        <div className="mt-8 p-4 rounded-xl bg-surface border border-border-subtle animate-fade-slide-up delay-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-display font-extrabold text-ember">
                {allStations.length}
              </p>
              <p className="text-xs text-muted mt-0.5">Active Stations</p>
            </div>
            <div>
              <p className="text-2xl font-display font-extrabold">
                {allStations.reduce((sum, s) => sum + s.trucks.length, 0)}
              </p>
              <p className="text-xs text-muted mt-0.5">Units in Service</p>
            </div>
            <div>
              <p className="text-2xl font-display font-extrabold">
                {allStations.reduce(
                  (sum, s) =>
                    sum +
                    s.trucks.reduce((tSum, t) => tSum + t.crew.length, 0),
                  0
                )}
              </p>
              <p className="text-xs text-muted mt-0.5">Total Personnel</p>
            </div>
            <div>
              <p className="text-2xl font-display font-extrabold text-success">
                Platoon {platoon}
              </p>
              <p className="text-xs text-muted mt-0.5">Currently Viewing</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
