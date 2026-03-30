"use client";

const PLATOONS = [
  { id: "1", color: "platoon-1" },
  { id: "2", color: "platoon-2" },
  { id: "3", color: "platoon-3" },
  { id: "4", color: "platoon-4" },
];

interface PlatoonSwitcherProps {
  active: string;
  onChange: (platoon: string) => void;
}

export default function PlatoonSwitcher({
  active,
  onChange,
}: PlatoonSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-subtle">
      {PLATOONS.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`
              relative px-4 py-2 text-sm font-display font-bold tracking-wider rounded-md transition-all
              ${
                isActive
                  ? "text-white shadow-lg"
                  : "text-muted hover:text-foreground hover:bg-surface-raised"
              }
            `}
            style={
              isActive
                ? {
                    backgroundColor: `var(--${p.color})`,
                    boxShadow: `0 0 16px color-mix(in srgb, var(--${p.color}) 40%, transparent)`,
                  }
                : undefined
            }
          >
            {p.id}
          </button>
        );
      })}
    </div>
  );
}
