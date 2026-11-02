import { Link } from "wouter";
import { useListCommunityHabits, getListCommunityHabitsQueryKey } from "@workspace/api-client-react";
import { ErrorPanel, SkeletonRows } from "@/components/shell";
import { errorMessage, initials } from "@/lib/habit-utils";

export default function Community() {
  const q = useListCommunityHabits({ query: { queryKey: getListCommunityHabitsQueryKey(), refetchInterval: 30000, refetchOnWindowFocus: true } });
  const list = q.data ?? [];
  return (
    <div className="fade-up">
      <p className="text-sm font-semibold uppercase tracking-widest text-[hsl(18_70%_52%)]">Shared openly</p>
      <h1 className="font-display text-4xl md:text-5xl mt-1">Community</h1>
      <p className="mt-2 text-muted-foreground">Habits friends chose to talk about. Drop in, say something kind.</p>
      <section className="mt-8">
        {q.isLoading ? <SkeletonRows n={4} /> : q.isError ? (
          <ErrorPanel message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : list.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed p-10 text-center" data-testid="empty-community">
            <div className="mx-auto flex justify-center -space-x-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 w-10 rounded-full border-2 border-background" style={{ background: `hsl(${[184, 18, 150][i]} 40% ${[40, 70, 70][i]}%)` }} />)}
            </div>
            <h3 className="font-display text-2xl mt-4">The circle is quiet for now.</h3>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto">When someone shares a habit, it shows up here. Yours could be the first.</p>
            <Link href="/my-habits" className="mt-5 inline-block rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground" data-testid="link-share-first">Go to My habits</Link>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((h, i) => (
              <li key={h.id} className="fade-up rounded-2xl border bg-card p-5 flex flex-col transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: `${i * 50}ms` }} data-testid={`card-community-${h.id}`}>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="h-8 w-8 rounded-full bg-accent text-accent-foreground grid place-items-center text-xs font-bold">{initials(h.ownerName)}</span>
                  <span className="font-medium" data-testid={`text-owner-${h.id}`}>{h.ownerName}</span>
                </div>
                <Link href={`/habits/${h.id}`} className="mt-3 font-display text-xl font-semibold hover:text-primary hover:underline underline-offset-4" data-testid={`link-habit-${h.id}`}>{h.name}</Link>
                <p className="mt-1 text-sm text-muted-foreground flex-1">{h.whenIDoIt}</p>
                <p className="mt-4 text-sm"><span className="text-muted-foreground">Days done:</span> <span className="font-semibold" data-testid={`text-days-${h.id}`}>{h.daysDone}</span></p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
