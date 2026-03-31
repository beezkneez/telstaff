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
  Ladder: { accent: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/10" },
  Rescue: { accent: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10" },
  Medic: { accent: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/10" },
  Hazmat: { accent: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/10" },
  Command: { accent: "text-purple-400", bg: "bg-purple-500/5 border-purple-500/10" },
  Other: { accent: "text-muted", bg: "bg-surface-overlay/50 border-border" },
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
  const totalCrew = trucks.reduce((sum, t) => sum + t.crew.length, 0);

  return (
    <div
      className="animate-fade-slide-up bg-surface border border-border overflow-hidden card-hover"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Station Header — tactical style */}
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
                {trucks.length} {trucks.length === 1 ? "unit" : "units"} // {totalCrew} personnel
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

      {/* Trucks */}
      <div className="divide-y divide-border">
        {trucks.map((truck) => {
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
                {truck.crew.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-surface-overlay/30 transition-colors group"
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
                      <span className="font-mono text-xs truncate">
                        {member.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {member.status && (
                        <span className={`font-mono text-[9px] tracking-wider px-1.5 py-0.5 ${
                          member.status === "REG"
                            ? "text-muted"
                            : member.status?.includes("Vac")
                              ? "bg-alert-red/10 text-alert-red border border-alert-red/20"
                              : "bg-amber/10 text-amber border border-amber/20"
                        }`}>
                          {member.status}
                        </span>
                      )}
                      <span className={`font-mono text-[9px] tracking-wider uppercase ${
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
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
