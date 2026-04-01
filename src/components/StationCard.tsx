"use client";

interface CrewMember {
  name: string;
  rank: string;
  position: string;
  employeeId?: string;
  status?: string;
}

interface TruckAssignment {
  truck: string;
  type: string;
  phoneNumber?: string;
  crew: CrewMember[];
}

const TRUCK_COLORS: Record<string, { accent: string; bg: string }> = {
  Engine: { accent: "text-red-400", bg: "bg-red-500/5 border-red-500/10" },
  Ladder: { accent: "text-green-400", bg: "bg-green-500/5 border-green-500/10" },
  Rescue: { accent: "text-orange-400", bg: "bg-orange-500/5 border-orange-500/10" },
  Tanker: { accent: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/10" },
  Hazmat: { accent: "text-fuchsia-400", bg: "bg-gradient-to-r from-red-500/5 via-yellow-500/5 to-blue-500/5 border-fuchsia-500/10" },
  Medic: { accent: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/10" },
  Command: { accent: "text-purple-400", bg: "bg-purple-500/5 border-purple-500/10" },
  OffRoster: { accent: "text-muted", bg: "bg-surface-overlay/30 border-border-subtle" },
  Other: { accent: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/10" },
};

interface StationCardProps {
  station: number;
  trucks: TruckAssignment[];
  animationDelay?: number;
  highlightName?: string;
  searchQuery?: string;
}

export default function StationCard({
  station,
  trucks,
  animationDelay = 0,
  highlightName = "",
  searchQuery = "",
}: StationCardProps) {
  const isOffRoster = (t: TruckAssignment) =>
    t.type === "OffRoster" || /^ff\s*\d/i.test(t.truck);
  const activeTrucks = trucks.filter((t) => !isOffRoster(t));
  const offRosterTrucks = trucks.filter((t) => isOffRoster(t));
  const activeCrew = activeTrucks.reduce((sum, t) => sum + t.crew.length, 0);
  const offRosterCrew = offRosterTrucks.reduce((sum, t) => sum + t.crew.length, 0);
  const totalCrew = activeCrew + offRosterCrew;

  return (
    <div
      className="animate-fade-slide-up bg-surface border border-border overflow-hidden card-hover"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Station Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-raised/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ember/10 border border-ember/20 flex items-center justify-center font-display text-lg font-bold text-ember tracking-wider">
              {String(station).padStart(2, "0")}
            </div>
            <div>
              <h3 className="font-display text-xl font-bold tracking-[0.15em]">
                STN-{String(station).padStart(2, "0")}
              </h3>
              <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">
                {activeTrucks.length} {activeTrucks.length === 1 ? "unit" : "units"} // {activeCrew}{offRosterCrew > 0 ? `/${totalCrew}` : ""} personnel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-success" />
            <span className="font-mono text-[10px] tracking-wider text-success uppercase">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Active Trucks */}
      <div className="divide-y divide-border">
        {activeTrucks.map((truck) => {
          const colors = TRUCK_COLORS[truck.type] || TRUCK_COLORS["Other"];
          return (
            <div key={truck.truck} className="px-4 py-3">
              {/* Truck header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono tracking-[0.15em] uppercase border ${colors.bg} ${colors.accent}`}>
                  {truck.truck}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {truck.crew.length}x
                </span>
              </div>

              {/* Crew grid */}
              <div className="space-y-px">
                {truck.crew.map((member, idx) => {
                  const nameLC = member.name?.toLowerCase() || "";
                  const hlLC = highlightName?.toLowerCase() || "";
                  const sqLC = searchQuery?.toLowerCase() || "";
                  const isUser = hlLC && nameLC.includes(hlLC.split(" ").pop() || "");
                  const isSearchMatch = sqLC && nameLC.includes(sqLC);
                  const st = member.status?.toLowerCase() || "";
                  const isVac = st.includes("vac");
                  const isTNW = st.includes("tnw");
                  const isTW = st.includes("tw") && !st.includes("tnw") && !st.includes("otwp");
                  const isLieu = st.includes("lieuo");
                  const statusBg = isUser ? "bg-ember/10 border-l-2 border-l-ember"
                    : isSearchMatch ? "bg-amber/10 border-l-2 border-l-amber"
                    : isVac ? "bg-yellow-500/8"
                    : isTNW ? "bg-fuchsia-500/8"
                    : isTW ? "bg-fuchsia-500/8"
                    : isLieu ? "bg-green-500/8"
                    : "";
                  return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-1.5 px-2 hover:bg-surface-overlay/30 transition-colors group ${statusBg}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-5 h-5 flex items-center justify-center font-mono text-[9px] font-bold border ${
                        member.rank?.includes("Captain")
                          ? "bg-amber/10 border-amber/30 text-amber"
                          : member.rank?.includes("Lieutenant")
                            ? "bg-platoon-3/10 border-platoon-3/30 text-platoon-3"
                            : "bg-surface-overlay border-border text-muted"
                      }`}>
                        {member.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-mono text-sm truncate">
                        {member.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {member.status && member.status !== "REG" && (
                        <span className={`font-mono text-[10px] tracking-wider px-1.5 py-0.5 border ${
                          isVac
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : isTNW
                              ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
                              : isTW
                                ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
                                : isLieu
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : "bg-surface-overlay text-muted border-border"
                        }`}>
                          {isVac ? "VAC" : isTNW ? "TNW" : isTW ? "TW" : isLieu ? "LIEU" : member.status}
                        </span>
                      )}
                      <span className={`font-mono text-[11px] tracking-wider uppercase ${
                        member.rank?.includes("Captain")
                          ? "text-amber"
                          : member.rank?.includes("Lieutenant")
                            ? "text-platoon-3"
                            : "text-muted"
                      }`}>
                        {member.rank?.replace(" Hz3", "").replace(" Pump,Hz3", "")}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Off Roster */}
      {offRosterTrucks.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 bg-surface-overlay/20 border-b border-border-subtle">
            <span className="font-mono text-[9px] tracking-[0.2em] text-muted uppercase">
              Off Roster — {offRosterCrew} personnel
            </span>
          </div>
          <div className="px-4 py-3 opacity-60">
            <div className="space-y-px">
              {offRosterTrucks.flatMap((truck) =>
                truck.crew.map((member, idx) => (
                  <div
                    key={`${truck.truck}-${idx}`}
                    className="flex items-center justify-between py-1.5 px-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 flex items-center justify-center font-mono text-[9px] font-bold bg-surface-overlay border border-border text-muted">
                        {member.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-mono text-sm truncate text-muted">
                        {member.name}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] tracking-wider uppercase text-muted">
                      {member.rank?.replace(" Hz3", "").replace(" Pump,Hz3", "")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
