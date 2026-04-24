"use client";

interface CrewMember {
  name: string;
  rank: string;
  position: string;
  positionCode?: string;
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
  Service: { accent: "text-slate-400", bg: "bg-slate-500/5 border-slate-500/10" },
  Salvage: { accent: "text-slate-400", bg: "bg-slate-500/5 border-slate-500/10" },
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
  const isOffRosterTruck = (t: TruckAssignment) =>
    t.type === "OffRoster" || /^ff\s*\d/i.test(t.truck);

  const isOffRosterStatus = (status: string) => {
    const st = status?.toLowerCase().trim() || "";
    if (st === "tw" || st === "twu") return false; // TW/TWU stay on roster
    return st.includes("tnw") || st.includes("vac") || st.includes("lieuo") || st.includes("sick") || st.includes(".sa") || st.includes("sur");
  };

  // Separate off-roster crew from active trucks
  const activeTrucks = trucks
    .filter((t) => !isOffRosterTruck(t))
    .map((t) => ({
      ...t,
      crew: t.crew.filter((c) => !isOffRosterStatus(c.status || "")),
    }))
    .filter((t) => t.crew.length > 0);

  // Collect all off-roster people: from FF trucks + status-based
  const offRosterMembers: CrewMember[] = [];
  for (const t of trucks) {
    if (isOffRosterTruck(t)) {
      offRosterMembers.push(...t.crew);
    } else {
      offRosterMembers.push(...t.crew.filter((c) => isOffRosterStatus(c.status || "")));
    }
  }

  // Count people on FF trucks who are NOT off-roster status as on-roster
  // They're available to be placed on a truck
  const onRosterOnFFTrucks = trucks
    .filter((t) => isOffRosterTruck(t))
    .reduce((sum, t) => sum + t.crew.filter((c) => !isOffRosterStatus(c.status || "")).length, 0);

  const activeCrew = activeTrucks.reduce((sum, t) => sum + t.crew.length, 0) + onRosterOnFFTrucks;
  const totalCrew = activeCrew + offRosterMembers.length;

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
              <p className="font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
                {activeTrucks.length} {activeTrucks.length === 1 ? "unit" : "units"} // {activeCrew}{offRosterMembers.length > 0 ? `/${totalCrew}` : ""} personnel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-success" />
            <span className="font-mono text-[12px] tracking-wider text-success uppercase">
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
                <span className={`inline-flex items-center px-2 py-0.5 text-[12px] font-mono tracking-[0.15em] uppercase border ${colors.bg} ${colors.accent}`}>
                  {truck.truck}
                </span>
                <span className="font-mono text-[12px] text-muted">
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
                  const isTW = (st === "tw" || st === "twu" || st === "24tw");
                  const isLieu = st.includes("lieuo");
                  const isSA = st.includes(".sa");
                  const isATI = st.includes("ati");
                  const isIns = st.includes("ins ");
                  const isSUR = st.includes("sur");
                  const isRelSupp = st.includes("rel supp") || st.includes("rel support");
                  const statusBg = isUser ? "bg-ember/10 border-l-2 border-l-ember"
                    : isSearchMatch ? "bg-pink-400/10 ring-1 ring-pink-400/40 rounded-sm"
                    : isVac ? "bg-yellow-500/8"
                    : isTNW ? "bg-fuchsia-500/8"
                    : isTW ? "bg-fuchsia-500/8"
                    : isLieu ? "bg-green-500/8"
                    : isSA ? "bg-emerald-900/20"
                    : isSUR ? "bg-purple-950/30"
                    : isATI ? "bg-purple-900/20"
                    : isIns ? "bg-orange-900/20"
                    : isRelSupp ? "bg-sky-900/20"
                    : "";
                  return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-1.5 px-2 hover:bg-surface-overlay/30 transition-colors group ${statusBg}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-5 h-5 flex items-center justify-center font-mono text-[11px] font-bold border ${
                        member.rank?.includes("Captain")
                          ? "bg-amber/10 border-amber/30 text-amber"
                          : member.rank?.includes("Lieutenant")
                            ? "bg-platoon-3/10 border-platoon-3/30 text-platoon-3"
                            : "bg-surface-overlay border-border text-muted"
                      }`}>
                        {member.positionCode || member.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className={`font-mono text-sm truncate ${isSearchMatch ? "text-pink-300 font-semibold" : ""}`}>
                        {member.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {member.status && member.status !== "REG" && (
                        <span className={`font-mono text-[12px] tracking-wider px-1.5 py-0.5 border ${
                          isVac
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : isTNW
                              ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
                              : isTW
                                ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
                                : isLieu
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : isSA
                                    ? "bg-emerald-900/30 text-emerald-400 border-emerald-500/20"
                                    : isATI
                                      ? isSUR
                                        ? "bg-purple-950/40 text-purple-300 border-purple-400/20"
                                        : "bg-purple-900/30 text-purple-400 border-purple-500/20"
                                      : isIns
                                        ? "bg-orange-900/30 text-orange-400 border-orange-500/20"
                                        : isRelSupp
                                          ? "bg-sky-900/30 text-sky-400 border-sky-500/20"
                                          : "bg-surface-overlay text-muted border-border"
                        }`}>
                          {isVac ? "VAC" : isTNW ? "TNW" : isTW ? (st === "twu" ? "TWU" : st === "24tw" ? "24TW" : "TW") : isLieu ? "LIEU" : isSA ? "SA" : isSUR ? "SUR" : isATI ? "ATI" : isIns ? "INS" : isRelSupp ? "REL" : member.status}
                        </span>
                      )}
                      <span className={`font-mono text-[13px] tracking-wider uppercase ${
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
      {offRosterMembers.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 bg-surface-overlay/20 border-b border-border-subtle">
            <span className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              Off Roster — {offRosterMembers.length} personnel
            </span>
          </div>
          <div className="px-4 py-3">
            <div className="space-y-px">
              {offRosterMembers.map((member, idx) => {
                const st = member.status?.toLowerCase() || "";
                const isVac = st.includes("vac");
                const isTNW = st.includes("tnw");
                const isLieu = st.includes("lieuo");
                const isSA = st.includes(".sa");
                const isSUR = st.includes("sur");
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-1.5 px-2 ${
                      isVac ? "bg-yellow-500/8" : isTNW ? "bg-fuchsia-500/8" : isSUR ? "bg-purple-950/30" : isLieu ? "bg-green-500/8" : isSA ? "bg-emerald-900/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 flex items-center justify-center font-mono text-[11px] font-bold bg-surface-overlay border border-border text-muted">
                        {member.positionCode || member.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-mono text-sm truncate text-muted">
                        {member.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {(isVac || isTNW || isLieu || isSA || isSUR) && (
                        <span className={`font-mono text-[12px] tracking-wider px-1.5 py-0.5 border ${
                          isVac ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : isTNW ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"
                            : isSUR ? "bg-purple-950/40 text-purple-300 border-purple-400/20"
                            : isSA ? "bg-emerald-900/30 text-emerald-400 border-emerald-500/20"
                            : "bg-green-500/10 text-green-400 border-green-500/20"
                        }`}>
                          {isVac ? "VAC" : isTNW ? "TNW" : isSUR ? "SUR" : isSA ? "SA" : "LIEU"}
                        </span>
                      )}
                      <span className="font-mono text-[13px] tracking-wider uppercase text-muted">
                        {member.rank?.replace(" Hz3", "").replace(" Pump,Hz3", "")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
