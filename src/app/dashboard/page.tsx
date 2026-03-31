"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import PlatoonSwitcher from "@/components/PlatoonSwitcher";
import StationDropdown from "@/components/StationDropdown";
import StationCard from "@/components/StationCard";
import SupportStaffCard from "@/components/SupportStaffCard";

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
}

interface ShiftInfo {
  type: string;
  label: string;
}

interface RotationInfo {
  shift: ShiftInfo;
  isWorking: boolean;
  nextShift?: { date: string; type: string; block: number } | null;
}

type ViewMode = "my-station" | "all-stations";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [platoon, setPlatoon] = useState("");
  const [homePlatoon, setHomePlatoon] = useState("");
  const [station, setStation] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [viewMode, setViewMode] = useState<ViewMode>("my-station");
  const [allStations, setAllStations] = useState<StationStaffing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [rotationInfo, setRotationInfo] = useState<RotationInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load user's home platoon and station
  useEffect(() => {
    async function loadDefaults() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            const plt = data.profile.platoon || "1";
            setPlatoon(plt);
            setHomePlatoon(plt);
            setStation(data.profile.homeStation || 1);
          } else {
            setPlatoon("1");
            setHomePlatoon("1");
          }
        } else {
          setPlatoon("1");
          setHomePlatoon("1");
        }
      } catch {
        setPlatoon("1");
        setHomePlatoon("1");
      } finally {
        setProfileLoaded(true);
      }
    }
    loadDefaults();
  }, []);

  // Fetch rotation info when platoon or date changes
  useEffect(() => {
    if (!platoon) return;
    fetch(`/api/rotation?date=${selectedDate}&platoon=${platoon}`)
      .then((r) => r.json())
      .then((data) => setRotationInfo(data))
      .catch(() => setRotationInfo(null));
  }, [platoon, selectedDate]);

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const fetchData = useCallback(async () => {
    if (!platoon) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/stations?platoon=${platoon}&date=${selectedDate}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load staffing data");
      }

      const data = await res.json();
      const stations: StationStaffing[] = Array.isArray(data)
        ? data
        : [data];
      setAllStations(stations);

      // Background prefetch other platoons
      const otherPlatoons = ["1", "2", "3", "4"].filter((p) => p !== platoon);
      fetch("/api/stations/prefetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platoons: otherPlatoons, date: selectedDate }),
      }).catch(() => {}); // fire and forget
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [platoon, selectedDate]);

  useEffect(() => {
    if (profileLoaded && platoon) {
      fetchData();
    }
  }, [fetchData, profileLoaded, platoon, selectedDate]);

  // Separate support staff from regular stations
  const SUPPORT_RANKS: Record<string, string> = {
    "sr captain investigator": "Investigations",
    "captain investigator": "Investigations",
    "investigator": "Investigations",
    ".sr captain investigator": "Investigations",
    ".captain investigator": "Investigations",
    ".investigator": "Investigations",
    "ecs captain": "Dispatch",
    "emergency communications specialist": "Dispatch",
    "ecs q": "Dispatch",
    ".ecs captain": "Dispatch",
    ".emergency communications specialist": "Dispatch",
    ".ecs q": "Dispatch",
    "duty office staff": "Dispatch",
    ".duty office staff": "Dispatch",
  };

  const isSupportStaff = (rank: string) => {
    return SUPPORT_RANKS[rank.toLowerCase().trim()] !== undefined;
  };

  const getSupportGroup = (rank: string) => {
    return SUPPORT_RANKS[rank.toLowerCase().trim()] || "Other";
  };

  // Process stations: pull support staff out, sort 1-31
  const regularStations = allStations
    .map((s) => ({
      ...s,
      trucks: s.trucks.map((t) => ({
        ...t,
        crew: t.crew.filter((c) => !isSupportStaff(c.rank || "")),
      })).filter((t) => t.crew.length > 0),
    }))
    .filter((s) => s.station >= 1 && s.station <= 31)
    .sort((a, b) => a.station - b.station);

  // Collect all support staff into groups
  const supportStaffMap = new Map<string, { name: string; rank: string; position: string }[]>();
  for (const s of allStations) {
    for (const t of s.trucks) {
      for (const c of t.crew) {
        if (isSupportStaff(c.rank || "")) {
          const group = getSupportGroup(c.rank || "");
          if (!supportStaffMap.has(group)) supportStaffMap.set(group, []);
          supportStaffMap.get(group)!.push({ name: c.name, rank: c.rank || "", position: c.position || "" });
        }
      }
    }
  }
  const supportGroups = Array.from(supportStaffMap.entries()).map(([label, members]) => ({ label, members }));

  const selectedStation =
    viewMode === "my-station"
      ? regularStations.find((s) => s.station === station) || null
      : null;

  const isOff = rotationInfo && !rotationInfo.isWorking;
  const nextShift = rotationInfo?.nextShift;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6 animate-fade-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.1em]">
              OPS<span className="text-ember">//</span>BOARD
            </h1>
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted mt-1 uppercase">
              {displayDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-muted uppercase">
              <span
                className={`w-2 h-2 ${loading || refreshing ? "bg-amber" : "bg-success"} animate-pulse-ember`}
              />
              {loading ? "Scraping telestaff..." : refreshing ? "Refreshing..." : "Live feed // telestaff"}
            </div>
            <button
              onClick={async () => {
                if (refreshing || loading || !platoon) return;
                setRefreshing(true);
                try {
                  const res = await fetch("/api/stations/refresh", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ platoon, date: selectedDate }),
                  });
                  if (res.ok) {
                    await fetchData();
                  }
                } catch {} finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing || loading}
              className="px-2 py-1 font-mono text-[9px] tracking-wider uppercase border border-border hover:border-ember/40 text-muted hover:text-ember transition-all disabled:opacity-30"
              title="Manual refresh — re-scrape current view"
            >
              {refreshing ? "..." : "REFRESH"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-alert-red/10 border border-alert-red/20 text-alert-red text-sm font-mono">
          {error}
        </div>
      )}

      {/* Rotation info banner */}
      {isOff && !loading && (
        <div className="mb-4 p-4 bg-surface border border-border animate-fade-slide-up">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-amber" />
            <div className="font-mono text-xs tracking-wider">
              <span className="text-amber uppercase">PLT-{platoon} is off</span>
              <span className="text-muted"> — {rotationInfo?.shift.label}</span>
              {nextShift && (
                <span className="text-foreground">
                  {" "}// Next shift:{" "}
                  {new Date(nextShift.date + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "short", month: "short", day: "numeric" }
                  )}{" "}
                  ({nextShift.type === "day" ? "Day" : "Night"} — Block{" "}
                  {nextShift.block})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div className="relative z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-slide-up delay-150">
        <div className="flex flex-wrap items-center gap-3">
          <PlatoonSwitcher active={platoon} onChange={setPlatoon} />
          {viewMode === "my-station" && (
            <StationDropdown value={station} onChange={setStation} />
          )}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-surface border border-border font-mono text-[11px] tracking-wider text-foreground transition-colors focus:border-ember/50 cursor-pointer"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-px">
          <button
            onClick={() => setViewMode("my-station")}
            className={`px-4 py-2 font-mono text-[10px] tracking-[0.15em] uppercase transition-all ${
              viewMode === "my-station"
                ? "bg-surface-overlay text-foreground border border-border"
                : "text-muted hover:text-foreground bg-surface border border-border-subtle"
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setViewMode("all-stations")}
            className={`px-4 py-2 font-mono text-[10px] tracking-[0.15em] uppercase transition-all ${
              viewMode === "all-stations"
                ? "bg-surface-overlay text-foreground border border-border"
                : "text-muted hover:text-foreground bg-surface border border-border-subtle"
            }`}
          >
            All Stations
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <svg
            className="animate-spin h-6 w-6 text-ember"
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
          <p className="font-mono text-xs tracking-wider text-muted uppercase">
            Scraping PLT-{platoon} from Telestaff...
          </p>
          <p className="font-mono text-[10px] text-muted/50">
            First load ~30-60s // cached for 15 min after
          </p>
        </div>
      ) : allStations.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-mono text-sm text-muted">
            No staffing data found for PLT-{platoon} on this date.
          </p>
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
            <p className="font-mono text-sm">
              No data for Station {station}. Try a different station.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {regularStations.map((s, idx) => (
            <StationCard
              key={s.station}
              station={s.station}
              trucks={s.trucks}
              animationDelay={Math.min(idx * 50, 500)}
            />
          ))}
          {supportGroups.length > 0 && (
            <SupportStaffCard
              groups={supportGroups}
              animationDelay={Math.min(regularStations.length * 50, 500)}
            />
          )}
        </div>
      )}

      {/* Stats bar */}
      {!loading && viewMode === "all-stations" && allStations.length > 0 && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px animate-fade-slide-up delay-300">
          {(() => {
            const isOff = (t: { type: string; truck: string }) =>
              t.type === "OffRoster" || /^ff\s+\d/i.test(t.truck);
            const activeUnits = regularStations.reduce(
              (sum, s) => sum + s.trucks.filter((t) => !isOff(t)).length, 0
            );
            const activeCrew = regularStations.reduce(
              (sum, s) => sum + s.trucks.filter((t) => !isOff(t)).reduce((t, u) => t + u.crew.length, 0), 0
            );
            const offRosterCrew = regularStations.reduce(
              (sum, s) => sum + s.trucks.filter((t) => isOff(t)).reduce((t, u) => t + u.crew.length, 0), 0
            );
            const supportCrew = supportGroups.reduce((s, g) => s + g.members.length, 0);
            const totalCrew = activeCrew + offRosterCrew + supportCrew;
            const offRoster = totalCrew - activeCrew;
            return [
            {
              value: allStations.length,
              label: "Stations Active",
              color: "text-ember",
            },
            {
              value: activeUnits,
              label: "Units in Service",
              color: "text-foreground",
            },
            {
              value: `${activeCrew + supportCrew}/${totalCrew}`,
              label: `Staffed / Total${offRosterCrew > 0 ? ` (${offRosterCrew} off roster)` : ""}`,
              color: "text-foreground",
            },
            {
              value: `PLT-${platoon}`,
              label: rotationInfo
                ? rotationInfo.isWorking
                  ? rotationInfo.shift.type === "day"
                    ? "Day Shift"
                    : "Night Shift"
                  : "Off Duty"
                : "Viewing",
              color: "text-success",
            },
          ]; })().map((stat) => (
            <div
              key={stat.label}
              className="bg-surface border border-border p-4"
            >
              <p
                className={`font-display text-2xl font-bold tracking-wider ${stat.color}`}
              >
                {stat.value}
              </p>
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
