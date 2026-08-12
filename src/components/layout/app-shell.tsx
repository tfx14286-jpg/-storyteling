"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  credits: number;
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/create", label: "Create Video", icon: "＋" },
  { href: "/credits", label: "Credits", icon: "◎" },
];

export function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">S</span>
              <span className="hidden text-sm font-semibold sm:block">
                StoryMotion <span className="gradient-text">AI</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                      active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="text-xs">{n.icon}</span>
                    {n.label}
                  </Link>
                );
              })}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    pathname.startsWith("/admin") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-xs">⚙</span>
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/credits" className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {user.credits.toLocaleString()} credits
            </Link>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:block">{user.name}</span>
              <button
                onClick={logout}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
