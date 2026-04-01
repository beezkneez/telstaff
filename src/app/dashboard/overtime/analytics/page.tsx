"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OvertimeData {
  date: string;
  userPlatoon: string;
  userShift: { type: string; label: string };
  onShift: { dayShift: string | null; nightShift: string | null };
  allPlatoons: { platoon: string; shift: { type: string; label: string }; isWorking: boolean }[];
  sixOffDetails: { date: string; eligible: boolean; dayShiftPlatoon: string | null; nightShiftPlatoon: string | null }[];
  prediction: { factors: { name: string; value: string; impact: string }[] } | null;
  ytdNeeded: { platoon: string; total: number }[];
  ytdWorked: { platoon: string; total: number }[];
  shortfalls: {
    date: string; platoon: string; shift: "day" | "night";
    requiredCrew: number; actualCrew: number;
    ffHoles: number; captainHoles: number; totalHoles: number;
    truckBreakdown: { truck: string; type: string; requiredFF: number; actualFF: number; shortFF: number; hasCaptain: boolean; needsCaptain: boolean }[];
  }[];
}

interface OTWPResult {
  date: string; dayShiftPlatoon: string; dayShiftCount: number;
  nightShiftPlatoon: string; nightShiftCount: number;
}

const PLATOON_COLORS: Record<string, string> = { "1": "platoon-1", "2": "platoon-2", "3": "platoon-3", "4": "platoon-4" };

function ShortfallCard({ sf, dateLabel }: { sf: OvertimeData["shortfalls"][0]; dateLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border-subtle">
      <div className="px-3 py-2 bg-surface-raised/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-foreground">{dateLabel}</span>
          <span className={`font-mono text-[10px] tracking-wider uppercase ${sf.shift === "day" ? "text-amber" : "text-platoon-3"}`}>{sf.shift}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5" style={{ backgroundColor: `color-mix(in srgb, var(--${PLATOON_COLORS[sf.platoon]}) 15%, transparent)`, color: `var(--${PLATOON_COLORS[sf.platoon]})` }}>PLT-{sf.platoon}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">{sf.actualCrew}/{sf.requiredCrew}</span>
          <span className="font-mono text-sm text-ember font-bold">{sf.ffHoles} FF</span>
          {sf.captainHoles > 0 && <span className="font-mono text-sm text-amber font-bold">{sf.captainHoles} Capt</span>}
        </div>
      </div>
      {sf.truckBreakdown.length > 0 && (
        <div className="px-3 py-2">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 font-mono text-[10px] text-muted hover:text-foreground tracking-wider uppercase transition-colors w-full">
            <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            {sf.truckBreakdown.length} trucks with holes
          </button>
          {expanded && (
            <div className="mt-2 divide-y divide-border-subtle animate-fade-in">
              {sf.truckBreakdown.map((t, j) => (
                <div key={j} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-foreground">{t.truck}</span>
                    {t.needsCaptain && <span className="font-mono text-[9px] px-1 py-0.5 bg-amber/10 text-amber border border-amber/20">NO CAPT</span>}
                  </div>
                  {t.shortFF > 0 ? <span className="font-mono text-[11px] text-ember">{t.actualFF}/{t.requiredFF} FF ({t.shortFF} short)</span> : <span className="font-mono text-[11px] text-muted">FF full</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<OvertimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [otwpData, setOtwpData] = useState<OTWPResult[]>([]);
  const [otwpLoading, setOtwpLoading] = useState(false);
  const selectedDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/overtime?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setOtwpLoading(true);
        fetch(`/api/overtime/otwp?date=${selectedDate}`)
          .then((r) => r.json())
          .then((otwp) => { if (otwp.results) setOtwpData(otwp.results); })
          .catch(() => {})
          .finally(() => setOtwpLoading(false));
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <svg className="animate-spin h-6 w-6 text-ember" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
    </div>
  );

  if (!data) return <div className="text-center py-20"><p className="font-mono text-sm text-muted">Failed to load data.</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6 animate-fade-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[0.1em]">OT<span className="text-ember">//</span>ANALYTICS</h1>
            <p className="font-mono text-[11px] tracking-[0.15em] text-muted mt-1 uppercase">Deep dive into overtime data</p>
          </div>
          <Link href="/dashboard/overtime" className="px-3 py-2 bg-surface border border-border font-mono text-[10px] tracking-wider text-muted hover:text-ember hover:border-ember/40 uppercase transition-colors">← Back</Link>
        </div>
      </div>

      <div className="space-y-4">
        {/* Prediction Factors */}
        {data.prediction?.factors && (
          <div className="bg-surface border border-border p-5 animate-fade-slide-up">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">Prediction Factors</h2>
            <div className="divide-y divide-border-subtle border border-border-subtle">
              {data.prediction.factors.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="font-mono text-xs text-muted">{f.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-foreground font-medium">{f.value}</span>
                    <span className="font-mono text-[10px] text-muted hidden sm:block">{f.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Holes */}
        {data.shortfalls && data.shortfalls.length > 0 && (
          <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-75">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">Schedule Holes — Breakdown</h2>
            <div className="space-y-3">
              {data.shortfalls.map((sf, i) => (
                <ShortfallCard key={i} sf={sf} dateLabel={new Date(sf.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} />
              ))}
            </div>
            <p className="font-mono text-[10px] text-muted tracking-wider mt-3">FF holes = firefighter spots to fill via OT. Captain holes listed separately.</p>
          </div>
        )}

        {/* Last 6-Off OTWP */}
        {data.sixOffDetails && data.sixOffDetails.length > 0 && (
          <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-150">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase">Last 6-Off — OTWP</h2>
              {otwpLoading && <span className="font-mono text-[9px] text-ember tracking-wider uppercase animate-pulse-ember">Scraping...</span>}
            </div>
            <div className="space-y-1">
              {data.sixOffDetails.map((day, i) => {
                const dayLabel = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                const otwp = otwpData.find((o) => o.date === day.date);
                return (
                  <div key={day.date} className={`flex items-center justify-between px-3 py-2.5 ${day.eligible ? "bg-surface-raised/50" : "opacity-50"}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted w-4">{i + 1}</span>
                      <span className="font-mono text-sm text-foreground">{dayLabel}</span>
                      {!day.eligible && <span className="font-mono text-[10px] text-muted tracking-wider">NOT ELIGIBLE</span>}
                    </div>
                    {day.eligible && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-amber tracking-wider">DAY</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5" style={{ backgroundColor: day.dayShiftPlatoon ? `color-mix(in srgb, var(--platoon-${day.dayShiftPlatoon}) 15%, transparent)` : undefined, color: day.dayShiftPlatoon ? `var(--platoon-${day.dayShiftPlatoon})` : undefined }}>PLT-{day.dayShiftPlatoon}</span>
                          {otwp ? <span className="font-mono text-[11px] text-ember font-bold ml-1">{otwp.dayShiftCount}</span> : otwpLoading ? <span className="font-mono text-[9px] text-muted ml-1">...</span> : null}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-platoon-3 tracking-wider">NIGHT</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5" style={{ backgroundColor: day.nightShiftPlatoon ? `color-mix(in srgb, var(--platoon-${day.nightShiftPlatoon}) 15%, transparent)` : undefined, color: day.nightShiftPlatoon ? `var(--platoon-${day.nightShiftPlatoon})` : undefined }}>PLT-{day.nightShiftPlatoon}</span>
                          {otwp ? <span className="font-mono text-[11px] text-ember font-bold ml-1">{otwp.nightShiftCount}</span> : otwpLoading ? <span className="font-mono text-[9px] text-muted ml-1">...</span> : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {otwpData.length > 0 && (
              <div className="mt-3 p-3 bg-surface-raised border border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Total OT Call-Ins</span>
                  <div className="flex gap-4">
                    <span className="font-mono text-xs"><span className="text-amber">Day:</span> <span className="text-ember font-bold">{otwpData.reduce((s, o) => s + o.dayShiftCount, 0)}</span></span>
                    <span className="font-mono text-xs"><span className="text-platoon-3">Night:</span> <span className="text-ember font-bold">{otwpData.reduce((s, o) => s + o.nightShiftCount, 0)}</span></span>
                    <span className="font-mono text-xs text-foreground font-bold">Total: {otwpData.reduce((s, o) => s + o.dayShiftCount + o.nightShiftCount, 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6-Off Running Tally */}
        {otwpData.length > 0 && (
          <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-200">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">6-Off Tally — By Platoon</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["1", "2", "3", "4"].map((plt) => {
                const dayTotal = otwpData.filter((o) => o.dayShiftPlatoon === plt).reduce((s, o) => s + o.dayShiftCount, 0);
                const nightTotal = otwpData.filter((o) => o.nightShiftPlatoon === plt).reduce((s, o) => s + o.nightShiftCount, 0);
                const total = dayTotal + nightTotal;
                return (
                  <div key={plt} className="p-3 border border-border-subtle">
                    <div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5" style={{ backgroundColor: `var(--${PLATOON_COLORS[plt]})` }} /><span className="font-mono text-[10px] tracking-wider uppercase">PLT-{plt}</span></div>
                    <p className="font-display text-2xl font-bold" style={{ color: `var(--${PLATOON_COLORS[plt]})` }}>{total}</p>
                    <p className="font-mono text-[9px] text-muted mt-1">{dayTotal > 0 && `${dayTotal} day`}{dayTotal > 0 && nightTotal > 0 && " / "}{nightTotal > 0 && `${nightTotal} night`}{total === 0 && "0 call-ins"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* YTD Tally */}
        {data.ytdNeeded && data.ytdNeeded.some((t) => t.total > 0) && (
          <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-300">
            <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">YTD OT Tally — {new Date().getFullYear()}</h2>
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-2">OT Call-Ins Needed (by on-shift platoon)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {data.ytdNeeded.map((t) => (
                <div key={t.platoon} className="p-3 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5" style={{ backgroundColor: `var(--${PLATOON_COLORS[t.platoon]})` }} /><span className="font-mono text-[10px] tracking-wider uppercase">PLT-{t.platoon}</span></div>
                  <p className="font-display text-2xl font-bold" style={{ color: `var(--${PLATOON_COLORS[t.platoon]})` }}>{t.total}</p>
                  <p className="font-mono text-[9px] text-muted mt-1">needed on their shifts</p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase mb-2">OT Shifts Worked (by off-duty platoon)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.ytdWorked.map((t) => (
                <div key={t.platoon} className="p-3 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5" style={{ backgroundColor: `var(--${PLATOON_COLORS[t.platoon]})` }} /><span className="font-mono text-[10px] tracking-wider uppercase">PLT-{t.platoon}</span></div>
                  <p className="font-display text-2xl font-bold text-ember">{t.total}</p>
                  <p className="font-mono text-[9px] text-muted mt-1">OT shifts received</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rotation */}
        <div className="bg-surface border border-border p-5 animate-fade-slide-up delay-400">
          <h2 className="font-display text-lg font-bold tracking-[0.15em] uppercase mb-4">Rotation — Today</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.allPlatoons.map((p) => (
              <div key={p.platoon} className={`p-3 border ${p.isWorking ? "border-border bg-surface-raised" : "border-border-subtle"}`}>
                <div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5" style={{ backgroundColor: `var(--${PLATOON_COLORS[p.platoon]})` }} /><span className="font-mono text-[10px] tracking-wider uppercase">PLT-{p.platoon}</span></div>
                <p className={`font-mono text-xs ${p.shift.type === "day" ? "text-amber" : p.shift.type === "night" ? "text-platoon-3" : "text-muted"}`}>{p.shift.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
