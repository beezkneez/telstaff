"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import PlatoonSwitcher from "@/components/PlatoonSwitcher";
import StationDropdown from "@/components/StationDropdown";
import StationCard from "@/components/StationCard";

interface CrewMember {
  name: string;
  rank: string;
  position: string;
  employeeId?: string;
  status?: string;
  qualifications?: string;
}

interface TruckAssignment {
  truck: string;
  type: string;
  phoneNumber?: string;
  crew: CrewMember[];
}

interface StationStaffing {
  station: number;
  district?: number;
  platoon: string;
  date: string;
  trucks: TruckAssignment[];
  mock?: boolean;
}

type ViewMode = "my-station" | "all-stations";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [platoon, setPlatoon] = useState("1");
  const [station, setStation] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("all-stations");
  const [allStations, setAllStations] = useState<StationStaffing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(true);
  const [error, setError] = useState("");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/stations?platoon=${platoon}`);
      if (!res.ok) throw new Error("Failed to load staffing data");

      const data = await res.json();
      const stations: StationStaffing[] = Array.isArray(data) ? data : [data];
      setAllStations(stations);
      setIsMock(stations[0]?.mock === true);
    } catch (err) {
      setError("Failed to load data. Using mock data.");
      setIsMock(true);
    } finally {
      setLoading(false);
    }
  }, [platoon]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedStation =
    viewMode === "my-station"
      ? allStations.find((s) => s.station === station) || null
      : null;

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
            <span
              className={`w-2 h-2 rounded-full ${isMock ? "bg-amber" : "bg-success"} animate-pulse-ember`}
            />
            {isMock
              ? "Mock data — save Telestaff credentials in Profile"
              : "Live from Telestaff"}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-alert-red/10 border border-alert-red/20 text-alert-red text-sm">
          {error}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-slide-up delay-150">
        <div className="flex flex-wrap items-center gap-3">
          <PlatoonSwitcher active={platoon} onChange={setPlatoon} />
          {viewMode === "my-station" && (
            <StationDropdown value={station} onChange={setStation} />
          )}
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
      ) : viewMode === "my-station" ? (
        selectedStation ? (
          <div className="max-w-2xl">
            <StationCard
              station={selectedStation.station}
              trucks={selectedStation.trucks}
            />
          </div>
        ) : (
          <div className="text-center py-20 text-muted">
            <p>No data for Station {station}. Try a different station or platoon.</p>
          </div>
        )
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
