"use client";

import { useState, useRef, useEffect } from "react";

interface StationDropdownProps {
  value: number;
  onChange: (station: number) => void;
}

export default function StationDropdown({
  value,
  onChange,
}: StationDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative z-40">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:border-ember/40 transition-colors"
      >
        <svg
          className="w-4 h-4 text-ember"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        Station {value}
        <svg
          className={`w-3.5 h-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 max-h-72 overflow-y-auto bg-surface-raised border border-border rounded-lg shadow-2xl shadow-black/50 z-[100] animate-fade-in">
          <div className="p-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((s) => (
              <button
                key={s}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={`
                  w-full text-left px-3 py-2 text-sm rounded-md transition-colors
                  ${
                    s === value
                      ? "bg-ember/20 text-ember font-semibold"
                      : "text-foreground hover:bg-surface-overlay"
                  }
                `}
              >
                Station {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
