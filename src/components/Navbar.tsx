"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-ember/15 border border-ember/30 flex items-center justify-center">
              <svg className="w-3 h-3 text-ember" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-display text-base font-semibold tracking-[0.2em] hidden sm:block">
              TELESTAFF<span className="text-ember">//RVP</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-0.5">
            {[
              { href: "/dashboard", label: "OPS" },
              { href: "/dashboard/overtime", label: "OVERTIME" },
              { href: "/dashboard/paybacks", label: "PAYBACKS" },
              { href: "/profile", label: "PROFILE" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 font-mono text-[11px] tracking-[0.15em] text-muted hover:text-foreground hover:bg-surface-raised transition-colors uppercase"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User section */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-wider text-muted hidden sm:block uppercase">
              {session?.user?.name || session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden sm:block font-mono text-[10px] tracking-wider text-muted hover:text-alert-red transition-colors uppercase"
            >
              [EXIT]
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-1 text-muted hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-border py-2 space-y-0.5 animate-fade-in">
            {[
              { href: "/dashboard", label: "Operations" },
              { href: "/dashboard/overtime", label: "Overtime" },
              { href: "/dashboard/paybacks", label: "Paybacks" },
              { href: "/profile", label: "Profile" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 font-mono text-xs tracking-wider text-foreground hover:bg-surface-raised uppercase"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border">
              <p className="px-3 font-mono text-[10px] text-muted mb-2">
                {session?.user?.email}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full text-left px-3 py-2 font-mono text-xs tracking-wider text-alert-red hover:bg-surface-raised uppercase"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
