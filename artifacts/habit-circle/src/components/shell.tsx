import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useSignOut, type User } from "@workspace/api-client-react";
import { Sprout, Users, LogOut } from "lucide-react";
import { errorMessage } from "@/lib/habit-utils";
import { useToast } from "@/hooks/use-toast";

const NAV = [
  { href: "/my-habits", label: "My habits", icon: Sprout, match: (l: string) => l === "/" || l === "/my-habits" },
  { href: "/community", label: "Community", icon: Users, match: (l: string) => l === "/community" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative h-7 w-7 rounded-full border-[3px] border-current">
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[hsl(18_78%_64%)]" />
      </span>
      <span className="font-display text-xl font-semibold">Habit Circle</span>
    </span>
  );
}

export function Shell({ user, children }: { user: User; children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const signOut = useSignOut();

  const doSignOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        qc.clear();
        setLocation("/sign-in");
      },
      onError: (e) => toast({ title: "Could not sign out", description: errorMessage(e), variant: "destructive" }),
    });

  return (
    <div className="min-h-[100dvh] md:flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground p-6 sticky top-0 h-[100dvh]">
        <Logo />
        <p className="mt-2 text-sm text-sidebar-foreground/60">Small daily things, kept kindly.</p>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((n) => {
            const active = n.match(location);
            return (
              <Link key={n.href} href={n.href} data-testid={`sidenav-${n.href.slice(1)}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl bg-sidebar-accent p-3 text-sm">
          <div className="text-sidebar-foreground/60 text-xs">Signed in as</div>
          <div className="font-semibold truncate" data-testid="text-display-name">{user.displayName}</div>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto max-w-4xl flex items-center gap-2 px-4 md:px-8 h-16">
            <Link href="/my-habits" className="md:hidden text-primary"><Logo /></Link>
            <nav className="ml-auto flex items-center gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} data-testid={`link-${n.href.slice(1)}`}
                  className={`rounded-full px-3 py-1.5 font-medium transition-colors ${n.match(location) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {n.label}
                </Link>
              ))}
              <button onClick={doSignOut} disabled={signOut.isPending} data-testid="button-sign-out"
                className="ml-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-60">
                <LogOut className="h-3.5 w-3.5" /> {signOut.isPending ? "Signing out" : "Sign out"}
              </button>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 md:px-8 py-8 md:py-12">{children}</main>
      </div>
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" data-testid="status-error" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
      <p className="font-semibold text-destructive">That didn't load.</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry && <button onClick={onRetry} data-testid="button-retry" className="mt-3 rounded-full bg-destructive px-4 py-1.5 text-destructive-foreground font-medium">Try again</button>}
    </div>
  );
}

export function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}
