import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListMyHabits, useAddHabit, getListMyHabitsQueryKey, getListCommunityHabitsQueryKey } from "@workspace/api-client-react";
import { Lock, Users, Plus } from "lucide-react";
import { ErrorPanel, SkeletonRows } from "@/components/shell";
import { errorMessage } from "@/lib/habit-utils";

export function Badge({ shared }: { shared: boolean }) {
  return shared ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground" data-testid="badge-shared"><Users className="h-3 w-3" />Shared</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground" data-testid="badge-private"><Lock className="h-3 w-3" />Private</span>
  );
}

export default function MyHabits() {
  const qc = useQueryClient();
  const habits = useListMyHabits({ query: { queryKey: getListMyHabitsQueryKey(), refetchOnWindowFocus: true } });
  const add = useAddHabit();
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [shared, setShared] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    if (!name.trim() || !when.trim()) return setFormErr("Give it a name and say when you do it.");
    add.mutate({ data: { name: name.trim(), whenIDoIt: when.trim(), shared } }, {
      onSuccess: () => {
        setName(""); setWhen(""); setShared(false);
        qc.invalidateQueries({ queryKey: getListMyHabitsQueryKey() });
        qc.invalidateQueries({ queryKey: getListCommunityHabitsQueryKey() });
      },
      onError: (err) => setFormErr(errorMessage(err)),
    });
  };

  const list = habits.data ?? [];
  const field = "mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

  return (
    <div className="fade-up">
      <p className="text-sm font-semibold uppercase tracking-widest text-[hsl(18_70%_52%)]">Your space</p>
      <h1 className="font-display text-4xl md:text-5xl mt-1">My habits</h1>

      <form onSubmit={submit} className="mt-8 rounded-3xl border bg-card p-5 md:p-6 shadow-[0_10px_30px_-18px_hsl(184_42%_30%/.35)]">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Habit name
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={150} data-testid="input-habit-name" />
          </label>
          <label className="text-sm font-medium md:row-span-2">When I do it
            <textarea className={`${field} min-h-[7.2rem] resize-y`} value={when} onChange={(e) => setWhen(e.target.value)} maxLength={2000}
              placeholder="After my morning coffee, before opening email" data-testid="input-when" />
          </label>
          <label className="flex items-center gap-3 self-end cursor-pointer select-none text-sm font-medium">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-5 w-5 accent-[hsl(184_42%_30%)]" data-testid="checkbox-share" />
            Share with the community
          </label>
        </div>
        {formErr && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive" data-testid="text-form-error">{formErr}</p>}
        <button type="submit" disabled={add.isPending} data-testid="button-add-habit"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[.98] disabled:opacity-60">
          <Plus className="h-4 w-4" /> {add.isPending ? "Adding..." : "Add habit"}
        </button>
      </form>

      <section className="mt-10">
        {habits.isLoading ? <SkeletonRows /> : habits.isError ? (
          <ErrorPanel message={errorMessage(habits.error)} onRetry={() => habits.refetch()} />
        ) : list.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed p-10 text-center" data-testid="empty-habits">
            <div className="mx-auto h-14 w-14 rounded-full border-[3px] border-primary/40 grid place-items-center"><div className="h-3 w-3 rounded-full bg-[hsl(18_78%_64%)]" /></div>
            <h3 className="font-display text-2xl mt-4">Nothing here yet, and that's fine.</h3>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto">Start with something tiny. One glass of water. Two minutes of stretching. Add it above.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((h, i) => (
              <li key={h.id} className="fade-up rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: `${i * 50}ms` }} data-testid={`card-habit-${h.id}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/habits/${h.id}`} className="font-display text-xl font-semibold hover:text-primary underline-offset-4 hover:underline" data-testid={`link-habit-${h.id}`}>{h.name}</Link>
                  <Badge shared={h.shared} />
                  <span className="ml-auto text-sm text-muted-foreground">{h.daysDone} days done · streak {h.currentStreak}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{h.whenIDoIt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
