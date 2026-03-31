"use client";

const PLATOONS = [
  { id: "1", color: "platoon-1", label: "PLT-1" },
  { id: "2", color: "platoon-2", label: "PLT-2" },
  { id: "3", color: "platoon-3", label: "PLT-3" },
  { id: "4", color: "platoon-4", label: "PLT-4" },
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
    <div className="flex items-center gap-px bg-border/50 p-0">
      {PLATOONS.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`
              relative px-4 py-2 font-mono text-[11px] tracking-[0.2em] uppercase transition-all
              ${
                isActive
                  ? "text-white"
                  : "text-muted hover:text-foreground bg-surface hover:bg-surface-raised"
              }
            `}
            style={
              isActive
                ? {
                    backgroundColor: `var(--${p.color})`,
                    boxShadow: `0 0 20px color-mix(in srgb, var(--${p.color}) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.1)`,
                  }
                : undefined
            }
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
