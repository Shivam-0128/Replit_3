import { useState, type FormEvent } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetHabit, getGetHabitQueryKey, useSetCompletion, useListComments, getListCommentsQueryKey, usePostComment,
  getListMyHabitsQueryKey, getListCommunityHabitsQueryKey, type User,
} from "@workspace/api-client-react";
import { ArrowLeft } from "lucide-react";
import { ErrorPanel, SkeletonRows } from "@/components/shell";
import { Badge } from "@/pages/my-habits";
import { errorMessage, initials, lastSevenDays } from "@/lib/habit-utils";

export default function HabitDetail({ user }: { user: User }) {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const qc = useQueryClient();
  const habit = useGetHabit(id, { query: { enabled: valid, queryKey: getGetHabitQueryKey(id), refetchInterval: 30000, refetchOnWindowFocus: true } });
  const setCompletion = useSetCompletion();
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [toggleErr, setToggleErr] = useState<string | null>(null);

  if (!valid) return <ErrorPanel message="That habit link doesn't look right." />;
  if (habit.isLoading) return <SkeletonRows n={3} />;
  if (habit.isError || !habit.data) return (
    <div className="space-y-4">
      <ErrorPanel message={errorMessage(habit.error, "This habit could not be found.")} onRetry={() => habit.refetch()} />
      <Link href="/my-habits" className="text-sm font-semibold text-primary" data-testid="link-back">Back to My habits</Link>
    </div>
  );

  const h = habit.data;
  const isOwner = h.ownerId === user.id;
  const done = new Set(h.completedDates);
  const days = lastSevenDays();

  const toggle = (date: string, value: boolean) => {
    setToggleErr(null);
    setPendingDate(date);
    setCompletion.mutate({ id, data: { date, done: value } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetHabitQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListMyHabitsQueryKey() });
        qc.invalidateQueries({ queryKey: getListCommunityHabitsQueryKey() });
      },
      onError: (e) => setToggleErr(errorMessage(e)),
      onSettled: () => setPendingDate(null),
    });
  };

  return (
    <div className="fade-up">
      <Link href={isOwner ? "/my-habits" : "/community"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back">
        <ArrowLeft className="h-4 w-4" /> {isOwner ? "My habits" : "Community"}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl md:text-5xl" data-testid="text-habit-name">{h.name}</h1>
        <Badge shared={h.shared} />
      </div>
      {!isOwner && <p className="mt-2 text-sm text-muted-foreground">Shared by <span className="font-semibold text-foreground" data-testid="text-owner">{h.ownerName}</span></p>}
      <div className="mt-5 rounded-2xl bg-secondary/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground/70">When I do it</p>
        <p className="mt-1.5 whitespace-pre-wrap" data-testid="text-when">{h.whenIDoIt}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Days done:</p>
          <p className="font-display text-4xl mt-1" data-testid="text-days-done">{h.daysDone}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Current streak:</p>
          <p className="font-display text-4xl mt-1 text-[hsl(18_70%_52%)]" data-testid="text-streak">{h.currentStreak}</p>
        </div>
      </div>

      <section className="mt-8 rounded-3xl border bg-card p-5 md:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">Last 7 days</h2>
          {!isOwner && <span className="text-xs text-muted-foreground">View only</span>}
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1 sm:gap-3">
          {days.map((d) => (
            <label key={d.date} className={`flex flex-col items-center gap-2 text-center ${pendingDate === d.date ? "opacity-60" : ""}`}>
              <span className={`text-xs font-semibold ${d.isToday ? "text-primary" : "text-muted-foreground"}`}>{d.isToday ? "Today" : d.weekday}</span>
              <input type="checkbox" className="day-check" checked={done.has(d.date)} disabled={!isOwner || pendingDate !== null}
                onChange={(e) => toggle(d.date, e.target.checked)} aria-label={d.date} data-testid={`checkbox-day-${d.date}`} />
              <span className="text-[10px] sm:text-xs tabular-nums text-muted-foreground">{d.date}</span>
            </label>
          ))}
        </div>
        {toggleErr && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive" data-testid="text-toggle-error">{toggleErr}</p>}
      </section>

      {h.shared ? <Comments habitId={id} /> : isOwner && (
        <p className="mt-8 text-sm text-muted-foreground">This habit is private, so it stays between you and you.</p>
      )}
    </div>
  );
}

function Comments({ habitId }: { habitId: number }) {
  const qc = useQueryClient();
  const comments = useListComments(habitId, { query: { queryKey: getListCommentsQueryKey(habitId), refetchInterval: 15000, refetchOnWindowFocus: true } });
  const post = usePostComment();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!text.trim()) return setErr("Write something first.");
    post.mutate({ id: habitId, data: { text: text.trim() } }, {
      onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: getListCommentsQueryKey(habitId) }); },
      onError: (e2) => setErr(errorMessage(e2)),
    });
  };

  const list = comments.data ?? [];
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">Conversation</h2>
      <div className="mt-4">
        {comments.isLoading ? <SkeletonRows n={2} /> : comments.isError ? (
          <ErrorPanel message={errorMessage(comments.error)} onRetry={() => comments.refetch()} />
        ) : list.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed p-6 text-center text-muted-foreground" data-testid="empty-comments">No comments yet. A small word of encouragement goes a long way.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((c) => (
              <li key={c.id} className="fade-up flex gap-3" data-testid={`comment-${c.id}`}>
                <span className="h-9 w-9 shrink-0 rounded-full bg-accent text-accent-foreground grid place-items-center text-xs font-bold">{initials(c.authorName)}</span>
                <div className="flex-1 rounded-2xl rounded-tl-sm border bg-card px-4 py-3">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-semibold" data-testid={`text-comment-author-${c.id}`}>{c.authorName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words" data-testid={`text-comment-${c.id}`}>{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form onSubmit={submit} className="mt-6">
        <label className="text-sm font-medium">Comment
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} data-testid="input-comment"
            className="mt-1.5 w-full min-h-24 rounded-xl border border-input bg-card px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
        </label>
        {err && <p role="alert" className="mt-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive" data-testid="text-comment-error">{err}</p>}
        <button type="submit" disabled={post.isPending} data-testid="button-post-comment"
          className="mt-3 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[.98] disabled:opacity-60">
          {post.isPending ? "Posting..." : "Post comment"}
        </button>
      </form>
    </section>
  );
}
