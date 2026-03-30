"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-ember/20 border border-ember/30 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-ember"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-display text-lg font-bold tracking-wide hidden sm:block">
              TELSTAFF<span className="text-ember">VIEWER</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-raised rounded-md transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/overtime"
              className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-raised rounded-md transition-colors"
            >
              Overtime
            </Link>
            <Link
              href="/profile"
              className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-raised rounded-md transition-colors"
            >
              Profile
            </Link>
          </div>

          {/* User section */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted hidden sm:block">
              {session?.user?.name || session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden sm:block text-xs font-medium text-muted hover:text-alert-red transition-colors"
            >
              Sign Out
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-1.5 text-muted hover:text-foreground"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-border-subtle py-3 space-y-1 animate-fade-in">
            <Link
              href="/dashboard"
              className="block px-3 py-2 text-sm text-foreground hover:bg-surface-raised rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/overtime"
              className="block px-3 py-2 text-sm text-foreground hover:bg-surface-raised rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Overtime
            </Link>
            <Link
              href="/profile"
              className="block px-3 py-2 text-sm text-foreground hover:bg-surface-raised rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
            <div className="pt-2 border-t border-border-subtle">
              <p className="px-3 text-xs text-muted mb-2">
                {session?.user?.email}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full text-left px-3 py-2 text-sm text-alert-red hover:bg-surface-raised rounded-md"
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
