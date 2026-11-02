import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useSignIn, useSignUp, getGetMeQueryKey } from "@workspace/api-client-react";
import { Logo } from "@/components/shell";
import { errorMessage } from "@/lib/habit-utils";

const inputCls = "mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

export function AuthPage({ mode }: { mode: "sign-up" | "sign-in" }) {
  const isUp = mode === "sign-up";
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const signUp = useSignUp();
  const signIn = useSignIn();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);
  const pending = signUp.isPending || signIn.isPending;
  const apiErr = isUp ? signUp.error : signIn.error;

  const onSuccess = (user: unknown) => {
    qc.clear();
    qc.setQueryData(getGetMeQueryKey(), user);
    setLocation("/my-habits");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    if (isUp && !displayName.trim()) return setLocalErr("Please add a display name.");
    if (!email.trim()) return setLocalErr("Please enter your email.");
    if (password.length < 8) return setLocalErr("Password needs at least 8 characters.");
    if (isUp) signUp.mutate({ data: { displayName: displayName.trim(), email: email.trim(), password } }, { onSuccess });
    else signIn.mutate({ data: { email: email.trim(), password } }, { onSuccess });
  };

  const err = localErr ?? (apiErr ? errorMessage(apiErr) : null);

  return (
    <div className="min-h-[100dvh] grid md:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden md:flex flex-col justify-between overflow-hidden bg-sidebar text-sidebar-foreground p-12">
        <Logo />
        <div aria-hidden className="absolute -right-24 top-1/2 -translate-y-1/2">
          {[420, 320, 220].map((s, i) => (
            <div key={s} className="absolute rounded-full border-2 border-sidebar-foreground/15 fade-up"
              style={{ width: s, height: s, top: -s / 2, left: -s / 2, animationDelay: `${i * 150}ms` }} />
          ))}
          <div className="absolute h-16 w-16 -top-8 -left-8 rounded-full bg-sidebar-primary fade-up" style={{ animationDelay: "500ms" }} />
        </div>
        <div className="relative max-w-md fade-up">
          <h1 className="font-display text-5xl leading-[1.05]">Do the small thing. <span className="italic text-sidebar-primary">Skip the pressure.</span></h1>
          <p className="mt-5 text-sidebar-foreground/70 text-lg">Keep habits to yourself, or open one up to friends and let it become a conversation. You decide, one habit at a time.</p>
        </div>
        <p className="relative text-sm text-sidebar-foreground/50">Missed a day? It still counts that you came back.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm fade-up">
          <div className="md:hidden mb-10 text-primary"><Logo /></div>
          <h2 className="font-display text-4xl">{isUp ? "Join the circle" : "Welcome back"}</h2>
          <p className="mt-2 text-muted-foreground">{isUp ? "A quiet place for your daily habits." : "Pick up right where you left off."}</p>
          <form onSubmit={submit} noValidate className="mt-8 space-y-4">
            {isUp && (
              <label className="block text-sm font-medium">Display name
                <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} autoComplete="nickname" data-testid="input-display-name" />
              </label>
            )}
            <label className="block text-sm font-medium">Email
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="input-email" />
            </label>
            <label className="block text-sm font-medium">Password
              <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128}
                autoComplete={isUp ? "new-password" : "current-password"} data-testid="input-password" />
              {isUp && <span className="mt-1 block text-xs text-muted-foreground font-normal">At least 8 characters.</span>}
            </label>
            {err && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive" data-testid="text-auth-error">{err}</p>}
            <button type="submit" disabled={pending} data-testid={isUp ? "button-sign-up" : "button-sign-in"}
              className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[.99] disabled:opacity-60">
              {pending ? "One moment..." : isUp ? "Sign up" : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            {isUp ? "Already have an account? " : "New here? "}
            <Link href={isUp ? "/sign-in" : "/sign-up"} className="font-semibold text-primary underline-offset-4 hover:underline" data-testid="link-switch-auth">
              {isUp ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
