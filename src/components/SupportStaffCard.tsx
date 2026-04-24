"use client";

interface CrewMember {
  name: string;
  rank: string;
  position: string;
  positionCode?: string;
}

interface SupportGroup {
  label: string;
  members: CrewMember[];
}

interface SupportStaffCardProps {
  groups: SupportGroup[];
  animationDelay?: number;
}

export default function SupportStaffCard({
  groups,
  animationDelay = 0,
}: SupportStaffCardProps) {
  const totalMembers = groups.reduce((s, g) => s + g.members.length, 0);

  return (
    <div
      className="animate-fade-slide-up bg-surface border border-border overflow-hidden card-hover"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-raised/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted/10 border border-muted/20 flex items-center justify-center font-display text-sm font-bold text-muted tracking-wider">
              SP
            </div>
            <div>
              <h3 className="font-display text-xl font-bold tracking-[0.15em]">
                SUPPORT STAFF
              </h3>
              <p className="font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
                {groups.length} {groups.length === 1 ? "unit" : "units"} // {totalMembers} personnel
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {groups.map((group) => (
          <div key={group.label} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center px-2 py-0.5 text-[13px] font-mono tracking-[0.15em] uppercase border bg-surface-overlay/50 border-border text-muted">
                {group.label}
              </span>
              <span className="font-mono text-[13px] text-muted">
                {group.members.length}x
              </span>
            </div>
            <div className="space-y-px">
              {group.members.map((member, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 px-2 hover:bg-surface-overlay/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 h-5 flex items-center justify-center font-mono text-[11px] font-bold bg-surface-overlay border border-border text-muted">
                      {member.positionCode || member.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="font-mono text-sm truncate">
                      {member.name}
                    </span>
                  </div>
                  <span className="font-mono text-[13px] tracking-wider uppercase text-muted shrink-0 ml-2">
                    {member.rank}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
