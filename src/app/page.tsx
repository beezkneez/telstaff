import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden tactical-grid">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-ember/[0.02]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-ember/[0.03] rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-ember/[0.02] rounded-full blur-[100px]" />

      {/* Top bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ember/10 border border-ember/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-ember" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <span className="font-display text-xl font-semibold tracking-[0.2em] text-foreground">
              TELESTAFF
            </span>
            <span className="font-display text-xl font-semibold tracking-[0.2em] text-ember">
              //REVAMPED
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/login" className="px-4 py-2 text-sm font-mono text-muted hover:text-foreground transition-colors tracking-wider uppercase">
            Sign In
          </Link>
          <Link href="/register" className="px-5 py-2 text-sm font-mono font-medium bg-ember hover:bg-ember-glow text-white tracking-wider uppercase transition-all hover:shadow-[0_0_24px_rgba(255,74,28,0.25)]">
            Enroll
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-slide-up max-w-3xl">
          {/* Tactical badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 border border-border bg-surface/50 text-xs font-mono tracking-[0.2em] text-muted mb-10 uppercase">
            <span className="w-1.5 h-1.5 bg-success animate-pulse-ember" />
            Edmonton Fire Rescue // Operations
          </div>

          <h1 className="font-display text-6xl sm:text-8xl font-bold tracking-[0.05em] leading-[0.9] mb-2">
            <span className="block text-foreground">STATION</span>
            <span className="block text-foreground">COMMAND</span>
            <span className="block text-ember">CENTRE</span>
          </h1>

          {/* Divider line */}
          <div className="flex items-center gap-4 my-8 max-w-xs mx-auto">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-ember/40" />
            <div className="w-2 h-2 bg-ember/60 rotate-45" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-ember/40" />
          </div>

          <p className="font-mono text-sm text-muted max-w-md mx-auto mb-10 leading-relaxed tracking-wide animate-fade-slide-up delay-150">
            Real-time staffing across 31 stations. 4 platoons.
            <br />
            Know your crew. Track overtime. Stay ready.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-slide-up delay-300">
            <Link
              href="/register"
              className="group flex items-center gap-3 px-8 py-3.5 bg-ember hover:bg-ember-glow text-white font-mono text-sm tracking-[0.15em] uppercase transition-all hover:shadow-[0_0_32px_rgba(255,74,28,0.3)] w-full sm:w-auto justify-center"
            >
              Create Account
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border border-border hover:border-ember/40 text-foreground font-mono text-sm tracking-[0.15em] uppercase transition-all hover:bg-surface-raised w-full sm:w-auto text-center"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-px mt-24 w-full max-w-xl animate-fade-slide-up delay-500">
          {[
            { value: "31", label: "Stations", color: "text-ember" },
            { value: "04", label: "Platoons", color: "text-amber" },
            { value: "24/7", label: "Coverage", color: "text-success" },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface/60 border border-border-subtle p-5 text-center">
              <p className={`font-display text-3xl font-bold tracking-wider ${stat.color}`}>
                {stat.value}
              </p>
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center font-mono text-[10px] text-muted/50 tracking-[0.2em] uppercase border-t border-border-subtle">
        Telestaff Revamped // Not affiliated with UKG/Kronos
      </footer>
    </div>
  );
}
