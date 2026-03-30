"use client";

import type { TruckAssignment } from "@/lib/mock-data";

const TRUCK_TYPE_CONFIG: Record<
  string,
  { icon: string; gradient: string; badge: string }
> = {
  Engine: {
    icon: "M8 7h8m-8 4h8m-8 4h4",
    gradient: "from-red-500/20 to-red-600/5",
    badge: "bg-red-500/20 text-red-400 border-red-500/20",
  },
  Ladder: {
    icon: "M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z",
    gradient: "from-amber-500/20 to-amber-600/5",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/20",
  },
  Rescue: {
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    gradient: "from-emerald-500/20 to-emerald-600/5",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  },
  Medic: {
    icon: "M12 4v16m8-8H4",
    gradient: "from-blue-500/20 to-blue-600/5",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  },
  Hazmat: {
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    gradient: "from-yellow-500/20 to-yellow-600/5",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  },
  Command: {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    gradient: "from-purple-500/20 to-purple-600/5",
    badge: "bg-purple-500/20 text-purple-400 border-purple-500/20",
  },
};

interface StationCardProps {
  station: number;
  trucks: TruckAssignment[];
  animationDelay?: number;
}

export default function StationCard({
  station,
  trucks,
  animationDelay = 0,
}: StationCardProps) {
  return (
    <div
      className="animate-fade-slide-up bg-surface rounded-xl border border-border-subtle overflow-hidden card-hover"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Station Header */}
      <div className="px-5 py-4 border-b border-border-subtle bg-gradient-to-r from-surface-raised to-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ember/15 border border-ember/20 flex items-center justify-center font-display text-sm font-extrabold text-ember">
              {station}
            </div>
            <div>
              <h3 className="font-display text-lg font-bold tracking-wide">
                STATION {station}
              </h3>
              <p className="text-xs text-muted">
                {trucks.length} {trucks.length === 1 ? "unit" : "units"} ·{" "}
                {trucks.reduce((sum, t) => sum + t.crew.length, 0)} personnel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-success font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Trucks */}
      <div className="divide-y divide-border-subtle">
        {trucks.map((truck) => {
          const config = TRUCK_TYPE_CONFIG[truck.type] ||
            TRUCK_TYPE_CONFIG["Engine"];
          return (
            <div
              key={truck.truck}
              className={`px-5 py-4 bg-gradient-to-r ${config.gradient} to-transparent`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.badge}`}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={config.icon}
                    />
                  </svg>
                  {truck.truck}
                </span>
                <span className="text-xs text-muted">
                  {truck.crew.length} crew
                </span>
              </div>

              {/* Crew list */}
              <div className="space-y-1.5">
                {truck.crew.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-surface-overlay border border-border flex items-center justify-center text-[10px] font-bold text-muted">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="text-sm">{member.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">
                        {member.position}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          member.rank === "Captain"
                            ? "bg-amber/15 text-amber"
                            : member.rank === "Lieutenant"
                              ? "bg-platoon-3/15 text-platoon-3"
                              : "bg-surface-overlay text-muted"
                        }`}
                      >
                        {member.rank}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
